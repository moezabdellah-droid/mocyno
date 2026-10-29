const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const backend = fs.readFileSync(path.join(root, 'functions/index.js'), 'utf8');
const handlerSource = backend.slice(backend.indexOf('exports.contactForm ='), backend.indexOf('// ─── CLIENT PORTAL'));
const pixelSource = fs.readFileSync(path.join(root, 'public/scripts/openai-measurement.js'), 'utf8');
const consentSource = fs.readFileSync(path.join(root, 'public/consent-ga.js'), 'utf8');

async function submitBackend({ body = {}, accept = 'application/json', failAdmin = false, failConfirmation = false, emptyAdmin = false } = {}) {
  let sends = 0;
  const context = {
    exports: {}, require, console: { log() {}, error() {} },
    onRequest: (_, fn) => fn,
    escapeHtml: value => String(value),
    getResend: () => ({ emails: { send: async () => {
      sends++;
      if (sends === 1 && emptyAdmin) return {};
      if (sends === 1 && failAdmin) return { error: 'Delivery failed' };
      if (sends === 2 && failConfirmation) throw new Error('Confirmation failed');
      return { data: { id: 'mail-test' } };
    } } })
  };
  vm.runInNewContext(handlerSource, context);
  const result = { status: 200, headers: {} };
  const res = {
    set(k, v) { result.headers[k] = v; return this; },
    status(code) { result.status = code; return this; },
    json(value) { result.json = value; },
    send(value) { result.body = value; },
    redirect(value) { result.redirect = value; }
  };
  await context.exports.contactForm({ method: 'POST', headers: { accept }, body }, res);
  return { ...result, sends };
}
const validBody = { name: 'Synthetic QA', email: 'qa@example.invalid', message: 'Synthetic test; never sent.' };

test('only a successfully accepted email produces a lead receipt', async () => {
  const r = await submitBackend({ body: validBody });
  assert.equal(r.json.accepted, true);
  assert.match(r.json.event_id, /^[a-f0-9-]{36}$/);
  assert.equal(r.headers['Cache-Control'], 'no-store');
  assert.equal(r.redirect, undefined);
});
test('honeypot submissions never produce a lead receipt', async () => {
  const r = await submitBackend({ body: { ...validBody, website: 'bot' } });
  assert.equal(r.json.accepted, false);
  assert.equal(r.json.event_id, undefined);
  assert.equal(r.sends, 0);
});
test('missing required fields, invalid email and oversized messages never convert', async () => {
  for (const body of [{}, { ...validBody, email: 'invalid' }, { ...validBody, message: 'x'.repeat(5001) }]) {
    const r = await submitBackend({ body });
    assert.equal(r.status, 400);
    assert.equal(r.json, undefined);
    assert.equal(r.sends, 0);
  }
});
test('admin email failure is not a successful lead', async () => {
  const r = await submitBackend({ body: validBody, failAdmin: true });
  assert.equal(r.status, 500);
  assert.equal(r.json, undefined);
});
test('an ambiguous email provider response never produces a successful lead receipt', async () => {
  const r = await submitBackend({ body: validBody, emptyAdmin: true });
  assert.equal(r.status, 500);
  assert.equal(r.json, undefined);
});
test('failure of customer confirmation does not discard a received enquiry', async () => {
  const r = await submitBackend({ body: validBody, failConfirmation: true });
  assert.equal(r.json.accepted, true);
});
test('native forms retain their French and English redirects', async () => {
  for (const lang of ['fr', 'en']) {
    const r = await submitBackend({ body: { ...validBody, lang }, accept: 'text/html' });
    assert.equal(r.redirect, `/${lang}/merci/`);
    assert.equal(r.json, undefined);
  }
});

function element(tag) {
  return {
    tagName: tag, style: {}, children: [], listeners: {},
    setAttribute(k, v) { this[k] = v; },
    appendChild(child) { child.parentNode = this; this.children.push(child); },
    removeChild(child) { this.children = this.children.filter(x => x !== child); },
    addEventListener(name, fn) { this.listeners[name] = fn; }
  };
}
function browser({ consent, analytics, fetchImpl, valid = true, blockedStorage = false, timers, abortSupported = true } = {}) {
  const stored = new Map();
  if (consent) stored.set('mocyno_openai_consent_v1', consent);
  if (analytics) stored.set('mocyno_consent_state', analytics);
  const localStorage = {
    getItem(k) { if (blockedStorage) throw new Error('Storage blocked'); return stored.get(k) || null; },
    setItem(k, v) { if (blockedStorage) throw new Error('Storage blocked'); stored.set(k, v); },
    removeItem(k) { stored.delete(k); }
  };
  const button = { disabled: false };
  const form = element('form');
  form.reportValidity = () => valid;
  form.querySelectorAll = () => [button];
  form.reset = () => { form.resetCount = (form.resetCount || 0) + 1; };
  const document = {
    readyState: 'complete', documentElement: { lang: 'fr', getAttribute: () => 'fr' },
    head: element('head'), body: element('body'), createElement: element,
    querySelectorAll: () => [form], querySelector: () => ({ content: 'G-TEST' }),
    addEventListener() {}
  };
  let calls = 0;
  const fetch = (...args) => { calls++; return fetchImpl ? fetchImpl(...args) : Promise.resolve({ ok: true, json: async () => ({ accepted: true, event_id: 'confirmed-1' }) }); };
  const listeners = {};
  const window = {
    fetch, FormData: class {}, URLSearchParams,
    AbortController: abortSupported ? AbortController : undefined,
    addEventListener: (name, fn) => { listeners[name] = fn; },
    dispatchEvent: e => { if (listeners[e.type]) listeners[e.type](e); }
  };
  const context = {
    window, document, localStorage, location: { pathname: '/fr/contact/', reload() {} },
    fetch, URLSearchParams, FormData: class { constructor() { return [['name', 'Synthetic QA']]; } },
    AbortController, setTimeout: timers ? timers.set : setTimeout,
    clearTimeout: timers ? timers.clear : clearTimeout,
    Event: class { constructor(type) { this.type = type; } }
  };
  vm.createContext(context);
  vm.runInContext(pixelSource, context);
  return {
    context, document, window, stored, form, button,
    submit: () => form.listeners.submit({ preventDefault() {} }),
    events: () => window.oaiq ? window.oaiq.q.map(args => Array.from(args)).filter(args => args[0] === 'measure') : [],
    calls: () => calls,
    sdk: () => document.head.children.filter(x => x.src && x.src.startsWith('https://bzrcdn.openai.com'))
  };
}
test('refusal, absence of choice and blocked storage do not load OpenAI or send leads', async () => {
  for (const settings of [{}, { consent: 'denied' }, { blockedStorage: true }]) {
    const b = browser(settings);
    await b.submit();
    assert.equal(b.sdk().length, 0);
    assert.equal(b.events().length, 0);
    assert.equal(b.form.resetCount, 1);
  }
});
test('confirmed successful submission sends one lead with a receipt and no form data', async () => {
  const b = browser({ consent: 'granted' });
  await b.submit();
  assert.equal(b.sdk().length, 1);
  assert.equal(b.events().length, 1);
  const event = b.events()[0];
  assert.equal(event[1], 'lead_created');
  assert.equal(JSON.stringify(event[2]), '{"type":"customer_action"}');
  assert.equal(event[3].event_id, 'confirmed-1');
  assert.equal(event[3].opt_out, true);
});
test('duplicate clicks during a pending submission produce one request', async () => {
  let complete;
  const b = browser({ consent: 'granted', fetchImpl: () => new Promise(resolve => { complete = resolve; }) });
  const first = b.submit();
  assert.equal(b.button.disabled, true);
  await b.submit();
  assert.equal(b.calls(), 1);
  complete({ ok: true, json: async () => ({ accepted: true, event_id: 'one-receipt' }) });
  await first;
  assert.equal(b.events().length, 1);
  assert.equal(b.button.disabled, false);
  const repeated = b.submit(); // The same receipt cannot be measured twice.
  // Resolve the new explicit request, which uses the same simulated server id.
  complete({ ok: true, json: async () => ({ accepted: true, event_id: 'one-receipt' }) });
  await repeated;
  assert.equal(b.events().length, 1);
});
test('network errors, server errors, honeypots and missing receipts never convert', async () => {
  for (const fetchImpl of [
    async () => { throw new Error('network'); },
    async () => ({ ok: false }),
    async () => ({ ok: true, json: async () => ({ accepted: false }) }),
    async () => ({ ok: true, json: async () => ({ accepted: true }) })
  ]) {
    const b = browser({ consent: 'granted', fetchImpl });
    await b.submit();
    assert.equal(b.events().length, 0);
    assert.equal(b.form.resetCount, undefined);
    assert.equal(b.button.disabled, false);
  }
});
test('invalid browser form never sends a request', async () => {
  const b = browser({ consent: 'granted', valid: false });
  await b.submit();
  assert.equal(b.calls(), 0);
});
test('consent withdrawal blocks future events even after SDK initialization', async () => {
  const b = browser({ consent: 'granted' });
  b.stored.set('mocyno_openai_consent_v1', 'denied');
  b.window.dispatchEvent({ type: 'mocyno:openai-consent' });
  await b.submit();
  assert.equal(b.events().length, 0);
  assert.ok(b.window.oaiq.q.some(args => args[0] === 'consent' && args[1] === false));
});
test('legacy GA4 consent is not advertising consent; GA4-only remains separate', () => {
  const b = browser({ analytics: 'granted' });
  vm.runInContext(consentSource, b.context);
  assert.equal(b.sdk().length, 0);
  const banner = b.document.body.children[0];
  const controls = banner.children[1].children;
  controls.find(x => x.textContent === 'GA4 uniquement').listeners.click();
  assert.equal(b.stored.get('mocyno_openai_consent_v1'), 'denied');
  assert.equal(b.sdk().length, 0);
});
test('explicit accept-all loads the SDK once and refusal is persisted', () => {
  for (const [label, expected] of [['Tout accepter', 1], ['Tout refuser', 0]]) {
    const b = browser();
    vm.runInContext(consentSource, b.context);
    b.document.body.children[0].children[1].children.find(x => x.textContent === label).listeners.click();
    assert.equal(b.sdk().length, expected);
    assert.equal(b.stored.get('mocyno_openai_consent_v1'), expected ? 'granted' : 'denied');
  }
});
test('a stalled request times out, releases the button and never retries or converts', async () => {
  let expire;
  let cleared = false;
  let signal;
  const b = browser({
    consent: 'granted',
    fetchImpl: async (_, options) => { signal = options.signal; return new Promise(() => {}); },
    timers: { set: (fn, ms) => { assert.equal(ms, 20000); expire = fn; return 1; }, clear: () => { cleared = true; } }
  });
  const pending = b.submit();
  expire();
  await pending;
  assert.equal(signal.aborted, true);
  assert.equal(b.button.disabled, false);
  assert.equal(b.calls(), 1);
  assert.equal(b.events().length, 0);
  assert.equal(cleared, true);
  assert.match(b.form.children[0].textContent, /réception n’a pas pu être confirmée/);
});
test('older browsers without AbortController retain native submission', () => {
  const b = browser({ abortSupported: false });
  assert.equal(b.form.listeners.submit, undefined);
});
test('a Pixel error does not turn a server-confirmed enquiry into an error', async () => {
  const b = browser({ consent: 'granted' });
  b.window.oaiq = () => { throw new Error('SDK unavailable'); };
  await b.submit();
  assert.equal(b.form.resetCount, 1);
  assert.match(b.form.children[0].textContent, /bien été envoyée/);
});
test('a stalled response body also times out without measuring a lead', async () => {
  let expire;
  const b = browser({
    consent: 'granted',
    fetchImpl: async () => ({ ok: true, json: () => new Promise(() => {}) }),
    timers: { set: fn => { expire = fn; return 1; }, clear() {} }
  });
  const pending = b.submit();
  expire();
  await pending;
  assert.equal(b.button.disabled, false);
  assert.equal(b.events().length, 0);
});
