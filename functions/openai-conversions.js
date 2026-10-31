'use strict';
// CAPI only. No customer identifiers, hashes, IP address or user-agent.
// The caller must have an explicit Resend acceptance before invoking this.
const PIXEL = 'DqukyUmpW35N3FBBzUdEU8';
const PATHS = new Set(['/fr/contact/', '/fr/contact.html', '/en/contact/',
  '/fr/securite-luxe-saint-tropez/', '/fr/services/securite-evenementielle/',
  '/fr/services/evenementiel-premium/']);
async function sendAcceptedLead({ id, timestampMs, body, lang }, { env = process.env, fetchImpl = fetch } = {}) {
  if (body?._mocyno_openai_consent !== 'granted') return { state: 'consent_denied' };
  const mode = env.OPENAI_CONVERSION_MODE;
  if (!['validate', 'live'].includes(mode)) return { state: 'disabled' };
  if (typeof id !== 'string' || !id || !Number.isSafeInteger(timestampMs)) return { state: 'invalid_receipt' };
  if (typeof env.OPENAI_CONVERSIONS_API_KEY !== 'string' || !env.OPENAI_CONVERSIONS_API_KEY) return { state: 'missing_key' };
  const sourcePath = PATHS.has(body._mocyno_openai_path) ? body._mocyno_openai_path : (lang === 'en' ? '/en/contact/' : '/fr/contact/');
  const event = { id, type: 'lead_created', timestamp_ms: timestampMs,
    action_source: 'web', source_url: 'https://mocyno.com' + sourcePath,
    opt_out: true, data: { type: 'customer_action' } };
  // Forward an observed reference unchanged; never synthesize one.
  if (typeof body._mocyno_openai_oppref === 'string' && body._mocyno_openai_oppref.length > 0 && body._mocyno_openai_oppref.length <= 4096) event.oppref = body._mocyno_openai_oppref;
  try {
    const response = await fetchImpl('https://bzr.openai.com/v1/events?pid=' + PIXEL, {
      method: 'POST', signal: AbortSignal.timeout(2000),
      headers: { Authorization: 'Bearer ' + env.OPENAI_CONVERSIONS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ validate_only: mode === 'validate', events: [event] })
    });
    // HTTP acceptance is not proof of receipt in the selected Ads Manager source.
    return { state: response.ok ? (mode === 'validate' ? 'validated' : 'submitted') : 'rejected', status: response.status };
  } catch (_) { return { state: 'unavailable' }; }
}
module.exports = { sendAcceptedLead };
