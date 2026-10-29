// Optional DOM/HTTP integration suite: install jsdom in an isolated directory
// and set MOCYNO_JSDOM_MODULE to that directory's jsdom entry point.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const vm = require('node:vm');
const { JSDOM } = require(process.env.MOCYNO_JSDOM_MODULE || 'jsdom');
const root = path.resolve(__dirname, '..');
const backend = fs.readFileSync(path.join(root, 'functions/index.js'), 'utf8');
const handlerSource = backend.slice(backend.indexOf('exports.contactForm ='), backend.indexOf('// ─── CLIENT PORTAL'));
const pixelSource = fs.readFileSync(path.join(root, 'public/scripts/openai-measurement.js'), 'utf8');

async function scenario(t, { lang = 'fr', consent = 'granted', failMail = false, legacyServer = false } = {}) {
  let mails = 0;
  let requests = 0;
  const context = { exports: {}, require, console: { log() {}, error() {} },
    onRequest: (_, fn) => fn, escapeHtml: value => String(value),
    getResend: () => ({ emails: { send: async () => {
      mails++;
      return failMail ? { error: 'Simulated provider failure' } : { data: { id: 'synthetic-mail' } };
    } } })
  };
  vm.runInNewContext(handlerSource, context);
  const server = http.createServer(async (req, res) => {
    requests++;
    let body = '';
    for await (const part of req) body += part;
    req.body = Object.fromEntries(new URLSearchParams(body));
    if (legacyServer) req.headers.accept = 'text/html';
    res.set = (k, v) => { res.setHeader(k, v); return res; };
    res.status = code => { res.statusCode = code; return res; };
    res.json = value => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); };
    res.send = value => res.end(value);
    res.redirect = url => { res.statusCode = 302; res.setHeader('Location', url); res.end(); };
    await context.exports.contactForm(req, res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const endpoint = `http://127.0.0.1:${server.address().port}`;
  const html = fs.readFileSync(path.join(root, `public/${lang}/contact/index.html`), 'utf8');
  const dom = new JSDOM(html, { url: `https://mocyno.com/${lang}/contact/`, runScripts: 'outside-only' });
  t.after(async () => { dom.window.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const w = dom.window;
  // Node fetch requires its own AbortSignal brand; a real browser uses one realm.
  w.AbortController = AbortController;
  w.localStorage.setItem('mocyno_openai_consent_v1', consent);
  w.fetch = (url, options) => fetch(endpoint + url, { ...options,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...options.headers },
    body: options.body.toString()
  });
  w.eval(pixelSource);
  // The script may register during loading; wait for the DOM ready event.
  if (w.document.readyState === 'loading') await new Promise(resolve => w.document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  const form = w.document.querySelector('#contactForm');
  for (const [name, value] of Object.entries({ firstName: 'Synthetic', lastName: 'QA', email: 'qa@example.invalid', message: 'Local test only; no real mail is sent.' })) {
    form.elements.namedItem(name).value = value;
  }
  return { w, form, mails: () => mails, requests: () => requests,
    events: () => w.oaiq ? w.oaiq.q.map(a => Array.from(a)).filter(a => a[0] === 'measure') : [],
    submit: () => form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })),
    status: () => form.querySelector('[role="status"]').textContent
  };
}
async function until(fn) {
  const deadline = Date.now() + 3000;
  while (!fn()) {
    if (Date.now() > deadline) throw new Error('DOM result timed out');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
test('real French HTML + HTTP: confirmed enquiry yields one lead despite a double click', async t => {
  const b = await scenario(t);
  b.submit(); b.submit();
  await until(() => /bien été envoyée/.test(b.status()));
  assert.equal(b.requests(), 1);
  assert.equal(b.mails(), 2);
  assert.equal(b.events().length, 1);
  assert.equal(b.events()[0][1], 'lead_created');
});
test('real English HTML + refusal: enquiry succeeds without OpenAI measurement', async t => {
  const b = await scenario(t, { lang: 'en', consent: 'denied' });
  b.submit();
  await until(() => /sent successfully/.test(b.status()));
  assert.equal(b.mails(), 2);
  assert.equal(b.events().length, 0);
  assert.equal(b.w.document.querySelector('script[src*="bzrcdn.openai.com"]'), null);
});
test('HTML constraint validation stops an invalid email before HTTP', async t => {
  const b = await scenario(t);
  b.form.elements.namedItem('email').value = 'invalid';
  b.submit();
  assert.equal(b.requests(), 0);
  assert.equal(b.events().length, 0);
});
test('honeypot rejection across HTTP never sends mail or records a lead', async t => {
  const b = await scenario(t);
  b.form.elements.namedItem('website').value = 'bot';
  b.submit();
  await until(() => /pas pu être confirmée/.test(b.status()));
  assert.equal(b.mails(), 0);
  assert.equal(b.events().length, 0);
});
test('provider failure across HTTP preserves the message and never converts', async t => {
  const b = await scenario(t, { failMail: true });
  b.submit();
  await until(() => /pas pu être confirmée/.test(b.status()));
  assert.equal(b.events().length, 0);
  assert.match(b.form.elements.namedItem('message').value, /Local test only/);
  assert.equal(b.form.querySelector('[type="submit"]').disabled, false);
});
test('old backend mismatch cannot falsely claim receipt or trigger an automatic retry', async t => {
  const b = await scenario(t, { legacyServer: true });
  b.submit();
  await until(() => /pas pu être confirmée/.test(b.status()));
  assert.equal(b.requests(), 1);
  assert.equal(b.events().length, 0);
  assert.equal(b.mails(), 2); // demonstrates why backend must be deployed first
});
