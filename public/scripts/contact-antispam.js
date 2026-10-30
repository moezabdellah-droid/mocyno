(function () {
  'use strict';
  var forms = Array.from(document.querySelectorAll('form[action="/api/contact"]'));
  if (!forms.length || !window.fetch) return;
  fetch('/contact-guard-config.json', { cache: 'no-store' }).then(function (r) {
    if (!r.ok) throw new Error('Configuration unavailable');
    return r.json();
  }).then(function (config) {
    if (config.enabled !== true) return;
    var en = (document.documentElement.lang || '').indexOf('en') === 0;
    var widgets = [];
    forms.forEach(function (form) {
      var box = document.createElement('div');
      var status = document.createElement('p');
      status.setAttribute('role', 'alert');
      status.textContent = en ? 'Please complete the security check before sending.' : 'Merci de terminer la vérification de sécurité avant l’envoi.';
      form.appendChild(box); form.appendChild(status);
      form.addEventListener('submit', function (event) {
        var token = form.querySelector('[name="cf-turnstile-response"]');
        if (!token || !token.value) {
          event.preventDefault(); event.stopImmediatePropagation();
          status.textContent = en ? 'Complete the security check, or contact us by phone.' : 'Terminez la vérification de sécurité ou contactez-nous par téléphone.';
        }
      }, true);
      widgets.push({ box: box, status: status, form: form });
    });
    if (typeof config.siteKey !== 'string' || !/^[a-zA-Z0-9_-]{10,100}$/.test(config.siteKey)) return;
    window.mocynoContactGuardReady = function () {
      widgets.forEach(function (item) {
        var widget = window.turnstile.render(item.box, {
          sitekey: config.siteKey, action: 'quote',
          callback: function () { item.status.textContent = ''; },
          'expired-callback': function () { item.status.textContent = en ? 'Please repeat the security check.' : 'Merci de renouveler la vérification de sécurité.'; },
          'error-callback': function () { item.status.textContent = en ? 'Security check unavailable. Please contact us by phone.' : 'Vérification indisponible. Contactez-nous par téléphone.'; }
        });
        item.form.addEventListener('reset', function () { window.turnstile.reset(widget); });
      });
    };
    var script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=mocynoContactGuardReady&render=explicit';
    script.async = true; script.defer = true;
    document.head.appendChild(script);
  }).catch(function () { /* Server enforcement remains authoritative. */ });
})();
