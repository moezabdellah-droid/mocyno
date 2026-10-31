const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sendAcceptedLead } = require('../functions/openai-conversions');
const accepted = { id: 'local-receipt', timestampMs: 1793426400000, lang: 'fr', body: { _mocyno_openai_consent: 'granted', email: 'never@example.invalid', message: 'Never forward', phone: 'never' } };
const env = { OPENAI_CONVERSION_MODE: 'validate', OPENAI_CONVERSIONS_API_KEY: 'local-placeholder' };
test('CAPI validates one accepted lead with no prospect data or invented click reference', async () => {
  let calls = 0;
  const result = await sendAcceptedLead(accepted, { env, fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, 'https://bzr.openai.com/v1/events?pid=DqukyUmpW35N3FBBzUdEU8');
    const batch = JSON.parse(options.body);
    assert.equal(batch.validate_only, true);
    assert.deepEqual(batch.events, [{ id: accepted.id, type: 'lead_created', timestamp_ms: accepted.timestampMs,
      action_source: 'web', source_url: 'https://mocyno.com/fr/contact/', opt_out: true, data: { type: 'customer_action' } }]);
    assert.equal(options.body.includes('never'), false);
    return { ok: true, status: 200 };
  } });
  assert.equal(calls, 1); assert.equal(result.state, 'validated');
});
test('real observed oppref is forwarded unchanged; source URLs cannot leak query or foreign origins', async () => {
  await sendAcceptedLead({ ...accepted, lang: 'en', body: { ...accepted.body, _mocyno_openai_oppref: 'observed-value', _mocyno_openai_path: 'https://foreign.invalid/?email=never' } }, { env, fetchImpl: async (_, options) => {
    const event = JSON.parse(options.body).events[0]; assert.equal(event.oppref, 'observed-value'); assert.equal(event.source_url, 'https://mocyno.com/en/contact/'); return { ok: true, status: 200 };
  } });
});
test('refusal, no choice, disabled mode and missing key cause no outbound request', async () => {
  for (const settings of [{ body: {} }, { body: { _mocyno_openai_consent: 'denied' } }, { env: {} }, { env: { OPENAI_CONVERSION_MODE: 'validate' } }]) {
    let calls = 0;
    await sendAcceptedLead({ ...accepted, ...(settings.body ? { body: settings.body } : {}) }, { env: settings.env || env, fetchImpl: () => { calls++; throw Error('Must not call'); } });
    assert.equal(calls, 0);
  }
});
test('OpenAI outage or rejection does not throw, retry or return response data', async () => {
  for (const fetchImpl of [async () => { throw Error('network with sensitive content'); }, async () => ({ ok: false, status: 401 })]) {
    const result = await sendAcceptedLead(accepted, { env, fetchImpl }); assert.ok(['unavailable', 'rejected'].includes(result.state)); assert.equal(JSON.stringify(result).includes('sensitive'), false);
  }
});
test('live and validation modes stay distinct; one id and original action time are retained', async () => {
  const result = await sendAcceptedLead(accepted, { env: { ...env, OPENAI_CONVERSION_MODE: 'live' }, fetchImpl: async (_, options) => {
    const batch = JSON.parse(options.body); assert.equal(batch.validate_only, false); assert.equal(batch.events[0].id, accepted.id); assert.equal(batch.events[0].timestamp_ms, accepted.timestampMs); return { ok: true, status: 202 };
  } }); assert.equal(result.state, 'submitted');
});
