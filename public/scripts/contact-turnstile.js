(() => {
  'use strict';
  const form = document.getElementById('contactForm');
  if (!form) return;
  const button = form.querySelector('button[type="submit"]');
  const status = document.getElementById('contact-verification-status');
  const english = document.documentElement.lang === 'en';
  let verified = false;
  let submitting = false;
  const widget = form.querySelector('.cf-turnstile');
  let refreshUsed = false;
  let refreshTimer = null;
  const refreshMessage = english
    ? 'Please tick the verification box if shown, or call us. Your details are still here.'
    : 'Cochez la case de vérification si elle apparaît, ou appelez-nous. Vos informations sont conservées.';
  // One recovery attempt per incident; do not combine it with SDK retry loops.
  if (widget) {
    widget.setAttribute('data-retry', 'never');
    widget.setAttribute('data-refresh-expired', 'never');
    widget.setAttribute('data-refresh-timeout', 'never');
    widget.setAttribute('data-timeout-callback', 'contactChallengeExpired');
  }
  const originalButtonText = button.textContent;
  function update(ready, message) {
    verified = ready;
    button.disabled = submitting || !ready;
    status.textContent = message;
  }
  function clearRefreshTimer() {
    if (refreshTimer !== null) {
      window.clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  }
  function renewChallenge() {
    if (submitting) return;
    if (refreshUsed) {
      update(false, refreshMessage);
      return;
    }
    refreshUsed = true;
    if (!widget || !window.turnstile || typeof window.turnstile.reset !== 'function') {
      update(false, refreshMessage);
      return;
    }
    update(false, english ? 'Security check in progress…' : 'Vérification de sécurité en cours…');
    refreshTimer = window.setTimeout(() => {
      refreshTimer = null;
      if (submitting) return;
      try {
        window.turnstile.reset(widget);
      } catch (_) {
        update(false, refreshMessage);
      }
    }, 500);
  }
  window.contactChallengePassed = () => {
    if (submitting) return;
    clearRefreshTimer();
    refreshUsed = false;
    update(true, '');
  };
  window.contactChallengeExpired = renewChallenge;
  window.contactChallengeFailed = renewChallenge;
  update(false, english ? 'Security check in progress…' : 'Vérification de sécurité en cours…');
  form.addEventListener('submit', event => {
    if (submitting) { event.preventDefault(); return; }
    if (event.defaultPrevented) return;
    const token = form.querySelector('[name="cf-turnstile-response"]');
    if (!verified || !token || !token.value) {
      event.preventDefault();
      window.contactChallengeExpired();
      return;
    }
    if (!form.checkValidity()) { event.preventDefault(); return; }
    submitting = true;
    button.disabled = true;
    button.textContent = english ? 'Sending…' : 'Envoi en cours…';
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    submitting = false;
    button.textContent = originalButtonText;
    clearRefreshTimer();
    refreshUsed = false;
    renewChallenge();
  });
})();

