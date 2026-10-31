const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { prepare } = require('./prepare-openai-live-source.cjs');
const input = process.env.MOCYNO_PRODUCTION_SOURCE || path.join(__dirname, 'fixtures/contact-production-20261030.txt');
const original = fs.readFileSync(input, 'utf8');
const candidate = prepare(original);
const handler = candidate.slice(candidate.indexOf('exports.contactForm ='), candidate.indexOf('// ─── CLIENT PORTAL', candidate.indexOf('exports.contactForm =')));
async function submit({ lang = 'fr', accept = 'application/json', provider = { data: { id: 'accepted-id' } }, guardStatus, markFails = false, ackFails = false, body = {} } = {}) {
  let sends = 0, conversions = [];
  const context = {
    exports: {}, onRequest: (_, fn) => fn, RESEND_API_KEY: {},
    process: { env: { CONTACT_GUARD_MODE: 'enforce' } }, admin: { firestore() {} },
    escapeHtml: String, console: { log() {}, error() {} },
    require: name => name === './openai-conversions' ? ({ sendAcceptedLead: async data => { conversions.push(data); return { state: 'simulated' }; } }) : name === './contact-guard' ? ({ createContactGuard: () => ({ reserve: async () => {
      if (guardStatus) throw { status: guardStatus };
      return { eventId: 'reserved-id', accepted: async () => { if (markFails) throw Error('db'); } };
    } }) }) : require(name),
    getResend: () => ({ emails: { send: async () => { sends++; if (sends === 1) return provider; if (ackFails) throw Error('ack'); return { data: { id: 'ack' } }; } } })
  };
  vm.runInNewContext(handler, context);
  const result = {};
  const res = { set() {}, status(code) { result.status = code; return this; }, json(value) { result.json = value; }, send(value) { result.error = value; }, redirect(value) { result.redirect = value; } };
  await context.exports.contactForm({ method: 'POST', headers: { accept }, body: { name: 'Synthetic', email: 'qa@example.invalid', message: 'Local only', lang, ...body } }, res);
  return { ...result, sends, conversions };
}
test('production projection preserves every byte outside the contact handler and keeps secret declaration', () => {
  const a = original.indexOf('exports.contactForm ='), b = original.indexOf('// ─── CLIENT PORTAL', a);
  assert.equal(candidate.slice(0, a), original.slice(0, a));
  assert.equal(candidate.slice(candidate.indexOf('// ─── CLIENT PORTAL', a)), original.slice(b));
  assert.match(handler, /secrets: \[RESEND_API_KEY\]/);
  const guardStart = text => text.slice(text.indexOf('  let guardReservation;'), text.indexOf('  try {\n    // 1. Send Admin') > 0 ? text.indexOf('  try {\n    // 1. Send Admin') : text.indexOf('  try {\r\n    // 1. Send Admin'));
  assert.equal(guardStart(handler), guardStart(original));
});
test('production source drift refuses a second patch', () => assert.throws(() => prepare(candidate)));
test('FR and EN accepted receipts retain reserved ID and original redirect destination', async () => {
  for (const lang of ['fr', 'en']) { const r = await submit({ lang }); assert.equal(r.status, 200); assert.equal(r.json.event_id, 'reserved-id'); assert.equal(r.json.redirect_url, `/${lang}/merci/`); assert.equal(r.sends, 2); assert.equal(r.conversions.length, 1); assert.equal(r.conversions[0].id, r.json.event_id); }
});
test('FR and EN native requests retain redirects', async () => {
  for (const lang of ['fr', 'en']) assert.equal((await submit({ lang, accept: 'text/html' })).redirect, `/${lang}/merci/`);
});
test('ambiguous and rejected provider responses never confirm a lead', async () => {
  for (const provider of [null, {}, { error: { name: 'failure' } }, { data: {} }, { data: { id: 42 } }]) { const r = await submit({ provider }); assert.equal(r.status, 500); assert.equal(r.json, undefined); assert.equal(r.sends, 1); assert.equal(r.conversions.length, 0); }
});
test('validation, honeypot, rejected proof, duplicate, limit and unavailable protection never accept', async () => {
  for (const settings of [{ body: { website: 'bot' } }, { body: { email: 'invalid' } }, ...[403,409,429,503].map(guardStatus => ({ guardStatus }))]) { const r = await submit(settings); assert.notEqual(r.json?.accepted, true); assert.equal(r.sends, 0); assert.equal(r.conversions.length, 0); }
});
test('bookkeeping and acknowledgement outages preserve the accepted reserved receipt without retry', async () => {
  const r = await submit({ markFails: true, ackFails: true }); assert.equal(r.json.accepted, true); assert.equal(r.json.event_id, 'reserved-id'); assert.equal(r.sends, 2);
});
