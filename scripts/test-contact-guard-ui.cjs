'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require(process.env.MOCYNO_JSDOM_MODULE || 'jsdom');
const source = fs.readFileSync(path.join(__dirname, '../public/scripts/contact-antispam.js'), 'utf8');
async function page(config) {
  const dom = new JSDOM('<html lang="fr"><form action="/api/contact" method="POST"><button>Envoyer</button></form></html>', { runScripts: 'outside-only', url: 'https://staging.example.invalid/' });
  dom.window.fetch = async () => ({ ok: true, json: async () => config });
  dom.window.eval(source);
  await new Promise(resolve => setImmediate(resolve));
  return dom;
}
test('disabled preparation does not load challenge code or change the form', async () => {
  const dom = await page({ enabled: false, siteKey: '' });
  assert.equal(dom.window.document.scripts.length, 0);
  assert.equal(dom.window.document.querySelector('[role=alert]'), null);
  dom.window.close();
});
test('missing challenge stops earlier bubble handlers from sending', async () => {
  const dom = await page({ enabled: true, siteKey: 'synthetic-site-key' });
  const form = dom.window.document.querySelector('form');
  let sends = 0;
  form.addEventListener('submit', () => sends++);
  const event = new dom.window.Event('submit', { cancelable: true, bubbles: true });
  form.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  assert.equal(sends, 0);
  assert.equal(dom.window.document.scripts.length, 1);
  dom.window.close();
});
test('token field permits existing submission handler; server still verifies proof', async () => {
  const dom = await page({ enabled: true, siteKey: 'synthetic-site-key' });
  const form = dom.window.document.querySelector('form');
  const input = dom.window.document.createElement('input');
  input.name = 'cf-turnstile-response'; input.value = 'synthetic-proof'; form.appendChild(input);
  let sends = 0;
  form.addEventListener('submit', event => { event.preventDefault(); sends++; });
  form.dispatchEvent(new dom.window.Event('submit', { cancelable: true, bubbles: true }));
  assert.equal(sends, 1);
  dom.window.close();
});
test('misconfigured public key blocks missing-proof submissions', async () => {
  const dom = await page({ enabled: true, siteKey: '' });
  const event = new dom.window.Event('submit', { cancelable: true, bubbles: true });
  dom.window.document.querySelector('form').dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  assert.equal(dom.window.document.scripts.length, 0);
  dom.window.close();
});
