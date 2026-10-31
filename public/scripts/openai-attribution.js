/* First-party consent and attribution forwarding. Never loads the OpenAI SDK. */
(function () {
  'use strict';
  var CONSENT = 'mocyno_openai_consent_v1';
  var REFERENCE = 'mocyno_openai_click_v1';
  function allowed() { try { return localStorage.getItem(CONSENT) === 'granted'; } catch (_) { return false; } }
  function reference() {
    try {
      if (!allowed()) { sessionStorage.removeItem(REFERENCE); return ''; }
      var current = new URLSearchParams(location.search).get('oppref');
      if (current && current.length <= 4096) sessionStorage.setItem(REFERENCE, current);
      return sessionStorage.getItem(REFERENCE) || '';
    } catch (_) { return ''; }
  }
  function sync() {
    var consent = allowed();
    var click = reference();
    document.querySelectorAll('form[action="/api/contact"]').forEach(function (form) {
      function field(name, value) {
        var input = form.querySelector('input[name="' + name + '"]');
        if (!input) { input = document.createElement('input'); input.type = 'hidden'; input.name = name; form.appendChild(input); }
        input.value = value;
      }
      field('_mocyno_openai_consent', consent ? 'granted' : 'denied');
      field('_mocyno_openai_oppref', consent ? click : '');
      field('_mocyno_openai_path', location.pathname);
    });
  }
  window.addEventListener('mocyno:openai-consent', sync);
  window.addEventListener('storage', function (event) { if (event.key === CONSENT || event.key === null) sync(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync);
  else sync();
  // Refresh the consent snapshot before the native POST without intercepting it.
  document.addEventListener('submit', function (event) {
    if (event.target.matches('form[action="/api/contact"]')) sync();
  }, true);
})();
