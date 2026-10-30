'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { prepare } = require('./prepare-openai-staging.cjs');
const original = fs.readFileSync(path.join(__dirname, '../functions/index.js'), 'utf8');
const generated = prepare(original);
async function submit(project, body) {
  const sends = [];
  const context = {
    exports: {}, require, process: { env: { GCLOUD_PROJECT: project } },
    console: { log() {}, error() {} }, onRequest: (_, fn) => fn,
    escapeHtml: value => String(value),
    getResend: () => ({ emails: { send: async data => { sends.push(data); return { data: { id: 'test-only' } }; } } })
  };
  vm.runInNewContext(generated.slice(generated.indexOf('exports.contactForm ='), generated.indexOf('// ─── CLIENT PORTAL')), context);
  const result = { status: 200 };
  const res = { set() {}, status(code) { result.status = code; return this; }, send() {}, json(value) { result.json = value; } };
  await context.exports.contactForm({ method: 'POST', headers: { accept: 'application/json' }, body }, res);
  return { ...result, sends };
}
const body = { name: 'TEST RECETTE', email: 'synthetic@example.invalid', message: 'Test technique sans demande commerciale.' };
test('both staging emails go only to the approved recipient and are labelled', async () => {
  const r = await submit('mocyno-staging', body);
  assert.equal(r.sends.length, 2);
  for (const mail of r.sends) {
    assert.deepEqual(Array.from(mail.to), ['moezabdellah@mocyno.com']);
    assert.match(mail.subject, /^\[TEST STAGING — SANS SUITE COMMERCIALE\]/);
  }
  assert.equal(r.json.accepted, true);
});
test('staging artifact refuses production and unknown projects without sending', async () => {
  for (const project of ['mocyno', '', undefined]) {
    const r = await submit(project, body);
    assert.equal(r.status, 503);
    assert.equal(r.sends.length, 0);
  }
});
test('invalid and honeypot staging requests send nothing', async () => {
  for (const value of [{}, { ...body, website: 'bot' }]) {
    assert.equal((await submit('mocyno-staging', value)).sends.length, 0);
  }
});
test('source drift stops preparation and original source remains intact', () => {
  assert.throws(() => prepare(original.replace('to: [emailStr],', 'to: ["changed"],')));
  assert.equal(fs.readFileSync(path.join(__dirname, '../functions/index.js'), 'utf8'), original);
});
