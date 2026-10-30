'use strict';
const { createHmac, randomUUID } = require('node:crypto');
class GuardError extends Error {
  constructor(code, status) { super(code); this.code = code; this.status = status; }
}
function createContactGuard({ db, env, fetchImpl = fetch, now = Date.now }) {
  const secret = env.TURNSTILE_SECRET_KEY;
  const hashKey = env.CONTACT_GUARD_HASH_KEY;
  const hostnames = String(env.CONTACT_GUARD_HOSTNAMES || '').split(',').map(x => x.trim()).filter(Boolean);
  if (!secret || !hashKey || hashKey.length < 32 || !hostnames.length) throw new GuardError('guard_not_configured', 503);
  const hash = value => createHmac('sha256', hashKey).update(value).digest('hex');
  const collection = db.collection('_contactGuard');
  async function reserve(body) {
    const token = body['cf-turnstile-response'];
    if (typeof token !== 'string' || !token || token.length > 2048) throw new GuardError('challenge_required', 403);
    let proof;
    try {
      const response = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST', signal: AbortSignal.timeout(5000),
        body: new URLSearchParams({ secret, response: token })
      });
      if (!response.ok) throw new Error('provider_unavailable');
      proof = await response.json();
    } catch (_) { throw new GuardError('challenge_unavailable', 503); }
    if (proof.success !== true || !hostnames.includes(proof.hostname) || proof.action !== 'quote') {
      throw new GuardError('challenge_rejected', 403);
    }
    const time = now();
    const email = String(body.email || '').trim().toLowerCase();
    const message = String(body.message || '').normalize('NFKC').trim().replace(/\s+/g, ' ');
    const period = Math.floor(time / 900000);
    const day = Math.floor(time / 86400000);
    const refs = [collection.doc('day-' + day), collection.doc('sender-' + hash(email + ':' + period)),
      collection.doc('duplicate-' + hash(email + '\n' + message))];
    const eventId = randomUUID();
    await db.runTransaction(async tx => {
      const snapshots = await Promise.all(refs.map(ref => tx.get(ref)));
      const records = snapshots.map(s => s.exists ? s.data() : {});
      if (records[2].expiresAt?.toMillis() > time) throw new GuardError('duplicate_or_pending', 409);
      if ((records[0].count || 0) >= 20 || (records[1].count || 0) >= 3) {
        const error = new GuardError('submission_limit', 429);
        error.retryAfter = (records[0].count || 0) >= 20
          ? Math.ceil(((day + 1) * 86400000 - time) / 1000)
          : Math.ceil(((period + 1) * 900000 - time) / 1000);
        throw error;
      }
      tx.set(refs[0], { count: (records[0].count || 0) + 1, expiresAt: new Date((day + 2) * 86400000) });
      tx.set(refs[1], { count: (records[1].count || 0) + 1, expiresAt: new Date(time + 2 * 86400000) });
      tx.set(refs[2], { state: 'reserved', eventId, expiresAt: new Date(time + 86400000) });
    });
    return { eventId, async accepted() {
      await refs[2].update({ state: 'accepted' });
    } };
  }
  return { reserve };
}
module.exports = { createContactGuard, GuardError };
