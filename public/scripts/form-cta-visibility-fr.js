/* Presentation only: keep the floating CTA away while any FR form is in view.
   No field, validation, submission, tracking, consent or network operation. */
(function () {
  'use strict';
  if ((document.documentElement.lang || '').slice(0, 2) !== 'fr') return;
  var cta = document.querySelector('.floating-cta');
  var forms = Array.prototype.slice.call(document.querySelectorAll('form'));
  if (!cta || !forms.length) return;
  var original = {
    visibility: cta.style.visibility,
    ariaHidden: cta.getAttribute('aria-hidden'),
    tabindex: cta.getAttribute('tabindex')
  };
  function restoreAttribute(name, value) {
    if (value === null) cta.removeAttribute(name);
    else cta.setAttribute(name, value);
  }
  function update() {
    var inView = forms.some(function (form) {
      var rect = form.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 &&
        rect.bottom > 0 && rect.right > 0 &&
        rect.top < window.innerHeight && rect.left < window.innerWidth;
    });
    if (inView) {
      cta.style.visibility = 'hidden';
      cta.setAttribute('aria-hidden', 'true');
      cta.setAttribute('tabindex', '-1');
    } else {
      cta.style.visibility = original.visibility;
      restoreAttribute('aria-hidden', original.ariaHidden);
      restoreAttribute('tabindex', original.tabindex);
    }
  }
  update();
  var observer = new IntersectionObserver(update, { threshold: 0 });
  forms.forEach(function (form) { observer.observe(form); });
})();
