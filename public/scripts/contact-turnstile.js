(() => {
  'use strict';
  const form = document.getElementById('contactForm');
  if (!form) return;
  const button = form.querySelector('button[type="submit"]');
  const status = document.getElementById('contact-verification-status');
  const english = document.documentElement.lang === 'en';
  let verified = false;
  function update(ready, message) {
    verified = ready;
    button.disabled = !ready;
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
    const token = form.querySelector('[name="cf-turnstile-response"]');
    if (!verified || !token || !token.value) {
      event.preventDefault();
      window.contactChallengeExpired();
    }
  });
})();

