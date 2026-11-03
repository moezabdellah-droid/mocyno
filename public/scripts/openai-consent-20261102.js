/* OpenAI conversion consent only. No Google tags, storage or form interception. */
(function () {
  'use strict';
  var reference = new URL(window.location.href).searchParams.get('oppref');
  if (!reference || reference.length > 4096) reference = '';

  // Keep an observed click reference on the direct journey to the quote form.
  // No cookies or local/session storage are used before or after consent.
  function forwardReference(link) {
    if (!reference || !link || !link.href) return;
    var target;
    try { target = new URL(link.href, window.location.href); } catch (_) { return; }
    if (target.origin !== window.location.origin || !/^\/(?:fr|en)\/contact(?:\/|\.html)?$/.test(target.pathname)) return;
    if (!target.searchParams.has('oppref')) {
      target.searchParams.set('oppref', reference);
      link.href = target.href;
    }
  }
  document.querySelectorAll('a[href]').forEach(forwardReference);
  document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest && event.target.closest('a[href]');
    forwardReference(link);
  }, true);

  var form = document.getElementById('contactForm');
  if (!form || form.querySelector('[name="_mocyno_openai_consent"]')) return;
  var english = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
  var label = document.createElement('label');
  label.style.cssText = 'display:flex;align-items:flex-start;gap:10px;grid-column:1/-1;font-size:14px;font-weight:400;';
  var choice = document.createElement('input');
  choice.type = 'checkbox';
  choice.name = '_mocyno_openai_consent';
  choice.value = 'granted';
  choice.checked = false;
  choice.style.cssText = 'width:auto;min-width:16px;margin-top:3px;';
  var text = document.createElement('span');
  text.textContent = english
    ? 'Optional: I agree that the successful submission of this quote request may be sent to OpenAI to measure ChatGPT ads, including the ad click reference when present. My name, email, phone number and message are not sent for this measurement.'
    : 'Facultatif : j’accepte que l’envoi réussi de cette demande de devis soit transmis à OpenAI pour mesurer les publicités ChatGPT, avec la référence du clic publicitaire si elle est présente. Mon nom, mon email, mon téléphone et mon message ne sont pas transmis pour cette mesure.';
  label.appendChild(choice);
  label.appendChild(text);
  var submit = form.querySelector('button[type="submit"]');
  var anchor = submit;
  while (anchor && anchor.parentNode !== form) anchor = anchor.parentNode;
  if (anchor) form.insertBefore(label, anchor); else form.appendChild(label);
  function hidden(name, value) {
    var input = document.createElement('input');
    input.type = 'hidden'; input.name = name; input.value = value; form.appendChild(input);
  }
  hidden('_mocyno_openai_path', window.location.pathname);
  if (reference) {
    var ref = document.createElement('input');
    ref.type = 'hidden'; ref.name = '_mocyno_openai_oppref'; ref.value = reference;
    ref.disabled = true;
    choice.addEventListener('change', function () { ref.disabled = !choice.checked; });
    form.appendChild(ref);
  }
})();
