/* MO’CYNO: consent-gated Pixel and server-confirmed quote submissions. */
(function () {
  'use strict';
  var KEY = 'mocyno_openai_consent_v1';
  var REQUEST_TIMEOUT_MS = 20000;
  var initialized = false;
  var measured = new Set();
  function allowed() {
    try { return localStorage.getItem(KEY) === 'granted'; } catch (_) { return false; }
  }
  function syncConsent() {
    if (!allowed()) {
      if (initialized) window.oaiq('consent', false);
      return;
    }
    if (initialized) { window.oaiq('consent', true); return; }
    if (!window.oaiq) {
      var queue = function () { queue.q.push(arguments); };
      queue.q = [];
      window.oaiq = queue;
      var script = document.createElement('script');
      script.async = true;
      script.src = 'https://bzrcdn.openai.com/sdk/oaiq.min.js';
      document.head.appendChild(script);
    }
    window.oaiq('consent', true);
    window.oaiq('init', { pixelId: 'DqukyUmpW35N3FBBzUdEU8' });
    initialized = true;
  }
  function measureConfirmedLead(id) {
    if (!allowed() || typeof id !== 'string' || !id || measured.has(id)) return;
    syncConsent();
    // No form values, message, service address or contact details are passed.
    window.oaiq('measure', 'lead_created', { type: 'customer_action' }, {
      event_id: id,
      opt_out: true
    });
    measured.add(id);
  }
  window.addEventListener('mocyno:openai-consent', syncConsent);
  syncConsent();

  function setupForms() {
    if (!window.fetch || !window.FormData || !window.URLSearchParams || !window.AbortController) return;
    document.querySelectorAll('form[action="/api/contact"][method="POST"]').forEach(function (form) {
      var pending = false;
      var status = document.createElement('p');
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      form.appendChild(status);
      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (pending || !form.reportValidity()) return;
        pending = true;
        var buttons = Array.from(form.querySelectorAll('[type="submit"]'));
        var states = buttons.map(function (button) { return button.disabled; });
        buttons.forEach(function (button) { button.disabled = true; });
        var en = (document.documentElement.lang || '').startsWith('en');
        status.textContent = en ? 'Sending…' : 'Envoi en cours…';
        var controller = new AbortController();
        var timeout;
        try {
          var request = fetch('/api/contact', {
            method: 'POST',
            credentials: 'same-origin',
            redirect: 'error',
            signal: controller.signal,
            headers: { Accept: 'application/json' },
            body: new URLSearchParams(new FormData(form))
          });
          // A finite client wait is not proof that the server did not receive
          // the enquiry. Never automatically retry an ambiguous submission.
          var result = await Promise.race([request.then(async function (response) {
            if (!response.ok) throw new Error('Submission rejected');
            return response.json();
          }), new Promise(function (_, reject) {
            timeout = setTimeout(function () {
              controller.abort();
              reject(new Error('Confirmation timeout'));
            }, REQUEST_TIMEOUT_MS);
          })]);
          if (!result || result.accepted !== true || typeof result.event_id !== 'string' || !result.event_id) {
            throw new Error('No server confirmation');
          }
          // Measurement failure must not turn a successfully received enquiry
          // into a form error or trigger a second submission.
          try { measureConfirmedLead(result.event_id); } catch (_) { }
          form.reset();
          status.textContent = en ? 'Your enquiry has been sent successfully.' : 'Votre demande a bien été envoyée.';
        } catch (_) {
          status.textContent = en
            ? 'We could not confirm receipt. Please contact us before submitting again.'
            : 'La réception n’a pas pu être confirmée. Contactez-nous avant de renouveler votre envoi.';
        } finally {
          clearTimeout(timeout);
          pending = false;
          buttons.forEach(function (button, index) { button.disabled = states[index]; });
        }
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupForms);
  else setupForms();
})();
