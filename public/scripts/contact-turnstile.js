(() => {
  'use strict';
  const form = document.getElementById('contactForm');
  if (!form) return;
  const button = form.querySelector('button[type="submit"]');
  const status = document.getElementById('contact-verification-status');
  const english = document.documentElement.lang === 'en';
  let verified = false;
  let submitting = false;
  const originalButtonText = button.textContent;
  function update(ready, message) {
    verified = ready;
    button.disabled = submitting || !ready;
    status.textContent = message;
  }
  window.contactChallengePassed = () => update(true, '');
  window.contactChallengeExpired = () => update(false, english
    ? 'The security check expired. Please complete it again.'
    : 'La vérification a expiré. Veuillez la refaire.');
  window.contactChallengeFailed = () => update(false, english
    ? 'Security check unavailable. Please reload the page or call us.'
    : 'Vérification indisponible. Rechargez la page ou contactez-nous par téléphone.');
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
    update(false, english ? 'Security check in progress…' : 'Vérification de sécurité en cours…');
    if (window.turnstile && typeof window.turnstile.reset === 'function') {
      window.turnstile.reset();
    }
  });
})();

