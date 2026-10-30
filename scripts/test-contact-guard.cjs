'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createContactGuard } = require('../functions/contact-guard');
function database() {
  const values = new Map();
  let queue = Promise.resolve();
  const ref = id => ({ id, update: async value => values.set(id, { ...values.get(id), ...value }) });
  return { values, collection: () => ({ doc: ref }), runTransaction(fn) {
    const result = queue.then(async () => {
      const writes = [];
      await fn({ get: async r => ({ exists: values.has(r.id), data: () => {
        const data = { ...values.get(r.id) };
        if (data.expiresAt instanceof Date) data.expiresAt = { toMillis: () => values.get(r.id).expiresAt.getTime() };
        return data;
      } }), set: (r, data) => writes.push([r.id, data]) });
      for (const [id, data] of writes) values.set(id, data);
    });
    queue = result.catch(() => {});
    return result;
  } };
}
const env = { TURNSTILE_SECRET_KEY: 'test-secret', CONTACT_GUARD_HASH_KEY: 'x'.repeat(32), CONTACT_GUARD_HOSTNAMES: 'staging.example.invalid' };
const valid = { 'cf-turnstile-response': 'synthetic-token', email: 'qa@example.invalid', message: 'Synthetic enquiry' };
const proof = { success: true, hostname: 'staging.example.invalid', action: 'quote' };
const provider = value => async () => ({ ok: true, json: async () => value });
function setup({ config = env, verify = proof, fetchImpl, time = () => 1793358000000 } = {}) {
  const db = database();
  return { db, guard: createContactGuard({ db, env: config, fetchImpl: fetchImpl || provider(verify), now: time }) };
}
test('missing secrets or hostname configuration stops enforcement', () => {
  for (const config of [{}, { ...env, CONTACT_GUARD_HASH_KEY: 'short' }, { ...env, CONTACT_GUARD_HOSTNAMES: '' }]) {
    assert.throws(() => setup({ config }), { code: 'guard_not_configured', status: 503 });
  }
});
test('missing and rejected challenges cause no database writes', async () => {
  for (const verify of [{ success: false }, { ...proof, hostname: 'attacker.invalid' }, { ...proof, action: 'other' }]) {
    const { db, guard } = setup({ verify });
    await assert.rejects(guard.reserve(valid), { status: 403 });
    assert.equal(db.values.size, 0);
  }
  const { db, guard } = setup();
  await assert.rejects(guard.reserve({ ...valid, 'cf-turnstile-response': '' }), { code: 'challenge_required' });
  assert.equal(db.values.size, 0);
});
test('unavailable provider fails closed', async () => {
  for (const fetchImpl of [async () => { throw Error('timeout'); }, async () => ({ ok: false })]) {
    const { db, guard } = setup({ fetchImpl });
    await assert.rejects(guard.reserve(valid), { status: 503 });
    assert.equal(db.values.size, 0);
  }
});
test('parallel duplicate requests permit only one reservation', async () => {
  const { db, guard } = setup();
  const results = await Promise.allSettled(Array.from({ length: 8 }, () => guard.reserve(valid)));
  assert.equal(results.filter(x => x.status === 'fulfilled').length, 1);
  assert.equal(results.filter(x => x.reason?.code === 'duplicate_or_pending').length, 7);
  assert.equal(db.values.size, 3);
});
test('sender limit survives rotating message content', async () => {
  const { guard } = setup();
  for (let i = 0; i < 3; i++) await guard.reserve({ ...valid, message: 'Different ' + i });
  await assert.rejects(guard.reserve({ ...valid, message: 'Fourth' }), { status: 429 });
});
test('global daily cap survives rotating sender addresses', async () => {
  const { guard } = setup();
  for (let i = 0; i < 20; i++) await guard.reserve({ ...valid, email: 'synthetic' + i + '@example.invalid' });
  await assert.rejects(guard.reserve({ ...valid, email: 'next@example.invalid' }), { status: 429 });
});
test('duplicate normalisation handles email case and whitespace', async () => {
  const { guard } = setup();
  await guard.reserve(valid);
  await assert.rejects(guard.reserve({ ...valid, email: ' QA@EXAMPLE.INVALID ', message: ' Synthetic   enquiry ' }), { status: 409 });
});
test('stored reservations contain no address, message, token or provider secret', async () => {
  const { db, guard } = setup();
  const reservation = await guard.reserve(valid);
  const stored = JSON.stringify(Array.from(db.values));
  for (const value of [valid.email, valid.message, valid['cf-turnstile-response'], env.TURNSTILE_SECRET_KEY]) assert.equal(stored.includes(value), false);
  await reservation.accepted();
  assert.equal(Array.from(db.values.values()).filter(x => x.state === 'accepted').length, 1);
  assert.match(reservation.eventId, /^[0-9a-f-]{36}$/);
});
test('expired duplicate records no longer block a later enquiry', async () => {
  let time = 1793358000000;
  const { guard } = setup({ time: () => time });
  await guard.reserve(valid);
  time += 86400001;
  await guard.reserve(valid);
});

test('enforced handler rejects guard failures before requesting any email', async () => {
  const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
  const backend = fs.readFileSync(path.join(__dirname, '../functions/index.js'), 'utf8');
  const handler = backend.slice(backend.indexOf('exports.contactForm ='), backend.indexOf('// ─── CLIENT PORTAL'));
  for (const code of [403, 409, 429, 503]) {
    let sends = 0;
    const context = { exports: {}, console, process: { env: { CONTACT_GUARD_MODE: 'enforce' } }, admin: { firestore() {} },
      onRequest: (_, fn) => fn, require: () => ({ createContactGuard: () => ({ reserve: async () => { throw { status: code }; } }) }),
      getResend: () => { sends++; throw Error('Mail must not be requested'); } };
    vm.runInNewContext(handler, context);
    const result = {};
    const res = { set() {}, status(code) { result.status = code; return this; }, send() {} };
    await context.exports.contactForm({ method: 'POST', headers: {}, body: { name: 'Synthetic', email: 'qa@example.invalid', message: 'Synthetic' } }, res);
    assert.equal(result.status, code); assert.equal(sends, 0);
  }
});
