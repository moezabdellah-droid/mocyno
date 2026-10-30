"""Targeted anti-spam release. Existing live files/config are retained by cloning."""
import io, json, os, pathlib, subprocess, time, urllib.request, urllib.parse, urllib.error, zipfile, hashlib, re

ROOT = pathlib.Path(os.environ['GITHUB_WORKSPACE'])
BASE = ROOT / 'baseline'
PROJECT = 'mocyno'
SITE = 'projects/mocyno/sites/mocyno'
FUNCTION = 'projects/mocyno/locations/europe-west1/functions/contactForm'
HOST = 'https://firebasehosting.googleapis.com/v1beta1/'
CF = 'https://cloudfunctions.googleapis.com/v2/'
KEY = '0x4AAAAAAFtHs--4VXBMCMM4'
PAGES = ['fr/contact.html', 'en/contact/index.html', 'fr/contact/index.html',
         'fr/securite-luxe-saint-tropez/index.html',
         'fr/services/securite-evenementielle/index.html',
         'fr/services/evenementiel-premium/index.html']

def request(url, method='GET', body=None, authenticated=True, content_type='application/json'):
    headers = {'Content-Type': content_type}
    if authenticated:
        token = subprocess.check_output(['gcloud', 'auth', 'print-access-token'], text=True).strip()
        headers['Authorization'] = 'Bearer ' + token
    data = json.dumps(body).encode() if isinstance(body, dict) else body
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=90) as response:
        return response.read()

def api(origin, path, method='GET', body=None):
    return json.loads(request(origin + path, method, body))

def poll(origin, op):
    for i in range(180):
        result = api(origin, op['name'])
        if result.get('done'):
            if result.get('error'):
                raise RuntimeError('Operation failed, code ' + str(result['error'].get('code')))
            return result.get('response', {})
        if i % 12 == 0:
            print('Google operation in progress.', flush=True)
        time.sleep(5)
    raise RuntimeError('Operation still running; inspect before retrying')

def files(version):
    result, token = {}, ''
    while True:
        page = api(HOST, version + '/files?pageSize=1000&pageToken=' + urllib.parse.quote(token))
        for item in page.get('files', []):
            result[item['path']] = item['hash']
        token = page.get('nextPageToken')
        if not token:
            return result

def compressed(data):
    return subprocess.check_output(['node', '-e',
        "const f=require('fs'),z=require('zlib');process.stdout.write(z.gzipSync(f.readFileSync(0),{level:9}))"], input=data)

def patch_handler(source):
    start = source.index('exports.contactForm = onRequest(')
    prefix, contact = source[:start], source[start:]
    anchor = '  try {\n    // 1. Send Admin Notification'
    if 'createContactGuard' in contact:
        reference = (ROOT / 'functions/index.js').read_text()
        def handler(text):
            a = text.index('exports.contactForm =')
            b = text.find('// ─── CLIENT PORTAL', a)
            if b < 0:
                raise RuntimeError('Unexpected handler boundary')
            return text[a:b]
        if handler(source) != handler(reference):
            raise RuntimeError('Existing guard handler differs from tested reference')
        print('Existing deployed contact handler matches tested guard reference.', flush=True)
        return source
    if contact.count(anchor) != 1 or 'createContactGuard' in contact:
        raise RuntimeError('Unexpected contact handler; mail-anchor count=' + str(contact.count(anchor)))
    guard = '''  let guardReservation;
  if (process.env.CONTACT_GUARD_MODE === "enforce") {
    try {
      const { createContactGuard } = require("./contact-guard");
      const guard = createContactGuard({ db: admin.firestore(), env: process.env });
      guardReservation = await guard.reserve(req.body || {});
    } catch (error) {
      const status = [403, 409, 429, 503].includes(error.status) ? error.status : 503;
      if (status === 429) res.set("Retry-After", String(error.retryAfter || 900));
      res.status(status).send("Envoi non autorisé ou temporairement indisponible. Contactez-nous par téléphone.");
      return;
    }
  }

'''
    contact = contact.replace(anchor, guard + anchor)
    anchor2 = '    // 2. Send User Confirmation (to the sender)'
    if contact.count(anchor2) != 1:
        raise RuntimeError('Unexpected confirmation anchor')
    contact = contact.replace(anchor2,
        '    if (guardReservation) {\n      try { await guardReservation.accepted(); } catch (_) { console.error("Guard acceptance record unavailable"); }\n    }\n\n' + anchor2)
    return prefix + contact

def patch_page(data):
    text = data.decode()
    if 'contact-antispam.js' in text or text.count('</head>') != 1:
        raise RuntimeError('Unexpected page state')
    if 'action="/api/contact"' not in text:
        raise RuntimeError('Form absent')
    form = re.search(r'<form\b[^>]*action="/api/contact".*?</form>', text, re.S)
    if not form:
        raise RuntimeError('Form markup unexpected')
    if 'name="message"' not in form.group():
        text = text.replace(form.group(), form.group().replace('</form>',
            '<input type="hidden" name="message" value="Demande de devis évènementiel depuis le formulaire du site."></form>'))
    return text.replace('</head>', '<script defer src="/scripts/contact-antispam.js?v=20261030-prod-1"></script>\n</head>').encode()

def release(version):
    return api(HOST, SITE + '/channels/live/releases?versionName=' + urllib.parse.quote(version, safe=''),
               'POST', {'message': 'Contact form anti-spam protection'})

def main():
    before = api(CF, FUNCTION)
    if before.get('state') != 'ACTIVE' or before['buildConfig'].get('runtime') != 'nodejs22':
        raise RuntimeError('Unexpected production runtime')
    if before['serviceConfig']['serviceAccountEmail'] != '962385123794-compute@developer.gserviceaccount.com':
        raise RuntimeError('Unexpected runtime identity')
    old_env = before['serviceConfig'].get('environmentVariables', {})
    if old_env.get('CONTACT_GUARD_MODE') == 'enforce':
        raise RuntimeError('Already enforcing; inspect instead of deploying twice')
    channel = api(HOST, SITE + '/channels/live')
    old_version = channel['release']['version']['name']
    old_files = files(old_version)
    if len(old_files) < 50:
        raise RuntimeError('Incomplete live file inventory')
    changes = {}
    for path in PAGES:
        original = (BASE / 'public' / path).read_bytes()
        if old_files.get('/' + path) != hashlib.sha256(compressed(original)).hexdigest():
            raise RuntimeError('Live page differs from pinned baseline: ' + path)
        changes['/' + path] = patch_page(original)
    changes['/scripts/contact-antispam.js'] = (ROOT / 'public/scripts/contact-antispam.js').read_bytes()
    changes['/contact-guard-config.json'] = json.dumps({'enabled': True, 'siteKey': KEY}).encode()
    storage = before['buildConfig']['source']['storageSource']
    archive_url = 'https://storage.googleapis.com/storage/v1/b/' + urllib.parse.quote(storage['bucket'], safe='') + '/o/' + urllib.parse.quote(storage['object'], safe='') + '?alt=media'
    if storage.get('generation'):
        archive_url += '&generation=' + str(storage['generation'])
    archive = zipfile.ZipFile(io.BytesIO(request(archive_url)))
    if 'index.js' not in archive.namelist():
        raise RuntimeError('Unexpected source archive layout')
    deployed = archive.read('index.js').decode()
    # Patch the deployed archive itself: portal exports and other live-only changes
    # stay byte-for-byte intact. The contact-specific anchors are checked below.
    if 'const admin = require("firebase-admin")' not in deployed or 'admin.initializeApp()' not in deployed:
        raise RuntimeError('Unexpected deployed Admin SDK setup')
    patched = patch_handler(deployed)
    check = subprocess.run(['node', '--check'], input=patched.encode(), capture_output=True)
    if check.returncode:
        raise RuntimeError('Patched source syntax invalid')
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as target:
        for item in archive.infolist():
            if item.filename != 'contact-guard.js':
                target.writestr(item, patched.encode() if item.filename == 'index.js' else archive.read(item))
        target.writestr('contact-guard.js', (ROOT / 'functions/contact-guard.js').read_bytes())
    print('Verified live baseline; preparing eight Hosting files and contactForm only.', flush=True)
    clone = poll(HOST, api(HOST, SITE + '/versions:clone', 'POST', {'sourceVersion': old_version, 'finalize': False}))
    version = clone['name']
    packed = {path: compressed(data) for path, data in changes.items()}
    hashes = {path: hashlib.sha256(data).hexdigest() for path, data in packed.items()}
    upload = api(HOST, version + ':populateFiles', 'POST', {'files': hashes})
    by_hash = {hashes[path]: data for path, data in packed.items()}
    for digest in upload.get('uploadRequiredHashes', []):
        url = upload['uploadUrl'].rstrip('/') + '/' + digest
        host = urllib.parse.urlsplit(url).hostname
        if not url.startswith('https://') or not (host.endswith('.googleapis.com') or host.endswith('.firebaseapp.com')):
            raise RuntimeError('Unexpected Hosting upload destination')
        request(url, 'POST', by_hash[digest], content_type='application/octet-stream')
    api(HOST, version + '?updateMask=status', 'PATCH', {'status': 'FINALIZED'})
    new_files = files(version)
    expected_files = {**old_files, **hashes}
    if new_files != expected_files:
        raise RuntimeError('Unexpected Hosting files changed; no release made')
    original_config = api(HOST, old_version).get('config', {})
    if api(HOST, version).get('config', {}) != original_config:
        raise RuntimeError('Hosting config changed; no release made')
    env = {**old_env, 'CONTACT_GUARD_MODE': 'enforce', 'CONTACT_GUARD_HOSTNAMES': 'mocyno.com'}
    env.pop('CONTACT_GUARD_DRY_RUN', None)
    mounts = [x for x in before['serviceConfig'].get('secretEnvironmentVariables', []) if x['key'] not in ('TURNSTILE_SECRET_KEY', 'CONTACT_GUARD_HASH_KEY')]
    for key in ('TURNSTILE_SECRET_KEY', 'CONTACT_GUARD_HASH_KEY'):
        mounts.append({'key': key, 'projectId': '962385123794', 'secret': key, 'version': '1'})
    upload = api(CF, 'projects/mocyno/locations/europe-west1/functions:generateUploadUrl', 'POST', {'environment': 'GEN_2'})
    url = upload['uploadUrl']
    if not url.startswith('https://') or not urllib.parse.urlsplit(url).hostname.endswith('.googleapis.com'):
        raise RuntimeError('Unexpected source upload destination')
    request(url, 'PUT', output.getvalue(), authenticated=False, content_type='application/zip')
    current = api(HOST, SITE + '/channels/live')['release']['version']['name']
    if current != old_version or api(CF, FUNCTION).get('updateTime') != before.get('updateTime'):
        raise RuntimeError('Concurrent production update; release refused')
    # The widget is published before backend enforcement so existing visitors are not locked out.
    release(version)
    print('Frontend released; deploying protected contactForm.', flush=True)
    op = api(CF, FUNCTION + '?updateMask=buildConfig.source,serviceConfig.environmentVariables,serviceConfig.secretEnvironmentVariables', 'PATCH',
        {'name': FUNCTION, 'buildConfig': {'source': {'storageSource': upload['storageSource']}},
         'serviceConfig': {'environmentVariables': env, 'secretEnvironmentVariables': mounts}})
    poll(CF, op)
    after = api(CF, FUNCTION)
    if after.get('state') != 'ACTIVE' or after['serviceConfig'].get('environmentVariables') != env:
        raise RuntimeError('Function read-back failed')
    if after['serviceConfig'].get('secretEnvironmentVariables') != mounts:
        # APIs can reorder secret mounts.
        if sorted(after['serviceConfig'].get('secretEnvironmentVariables', []), key=lambda x:x['key']) != sorted(mounts, key=lambda x:x['key']):
            raise RuntimeError('Secret mount read-back failed')
    endpoint = after['serviceConfig']['uri']
    try:
        request(endpoint, 'POST', {'name':'Synthetic negative test','email':'qa@example.invalid','message':'Missing proof must be blocked'}, authenticated=False)
        raise RuntimeError('Missing proof was not blocked')
    except urllib.error.HTTPError as error:
        if error.code != 403:
            raise RuntimeError('Negative probe returned ' + str(error.code))
    print('VERIFIED: production function ACTIVE, guard enforce, no dry run; missing proof HTTP 403. No email sent by probe.', flush=True)
    print('Hosting changed files: ' + str(len(changes)) + '; all other live file hashes and Hosting config retained.', flush=True)

if __name__ == '__main__':
    main()
