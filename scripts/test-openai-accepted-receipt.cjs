const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../functions/index.js'), 'utf8');
const handler = source.slice(source.indexOf('exports.contactForm ='), source.indexOf('// ─── CLIENT PORTAL'));

for (const confirmationFails of [false, true]) {
  test(`accepted admin email retains reserved receipt after bookkeeping failure; acknowledgement failure=${confirmationFails}`, async () => {
    let sends = 0, marks = 0;
    const context = {
      exports: {}, console: { log() {}, error() {} },
      process: { env: { CONTACT_GUARD_MODE: 'enforce', GCLOUD_PROJECT: 'mocyno-staging' } },
      admin: { firestore() {} }, onRequest: (_, fn) => fn,
      escapeHtml: String,
      require: () => ({ createContactGuard: () => ({ reserve: async () => ({
        eventId: 'reserved-request-id',
        accepted: async () => { marks++; throw Error('simulated bookkeeping outage'); }
      }) }) }),
      getResend: () => ({ emails: { send: async () => {
        sends++;
        if (sends === 2 && confirmationFails) throw Error('simulated acknowledgement outage');
        return { data: { id: 'simulated-provider-acceptance' } };
      } } })
    };
    vm.runInNewContext(handler, context);
    const result = {};
    const response = {
      set() {}, status(code) { result.status = code; return this; },
      json(value) { result.receipt = value; }, send(value) { result.error = value; }
    };
    await context.exports.contactForm({ method: 'POST', headers: { accept: 'application/json' },
      body: { name: 'Synthetic', email: 'qa@example.invalid', message: 'Local simulation only' }
    }, response);
    assert.equal(result.status, 200);
    assert.equal(result.receipt.accepted, true);
    assert.equal(result.receipt.event_id, 'reserved-request-id');
    assert.equal(result.error, undefined);
    assert.equal(sends, 2);
    assert.equal(marks, 1);
  });
}
