/* Adds operational details to the existing message field. No transport or tracking. */
(function () {
  'use strict';
  var form = document.getElementById('contactForm');
  if (!form) return;
  var message = form.querySelector('[name="message"]');
  var town = document.getElementById('site-town');
  var date = document.getElementById('preferred-date');
  var duration = document.getElementById('required-duration');
  if (!message || !town || !date || !duration) return;
  var en = (document.documentElement.lang || '').slice(0, 2) === 'en';
  function value(field) { return field.value.trim() || (en ? 'Not provided' : 'Non renseignée'); }
  function displayDate() {
    var raw = date.value.trim();
    if (!raw) return en ? 'Not provided' : 'Non renseignée';
    return en ? raw : raw.split('-').reverse().join('/');
  }
  function pack() {
    return (en ? 'Site town: ' : 'Commune du site : ') + value(town) + '\n' +
      (en ? 'Preferred date: ' : 'Date souhaitée : ') + displayDate() + '\n' +
      (en ? 'Required duration: ' : 'Durée souhaitée : ') + value(duration) + '\n\n' +
      (en ? 'Message:\n' : 'Message :\n') + message.value;
  }
  function validate() {
    message.setCustomValidity(pack().length > 5000 ?
      (en ? 'Please shorten the message: the complete request must not exceed 5,000 characters.' :
        'Veuillez raccourcir le message : la demande complète ne doit pas dépasser 5 000 caractères.') : '');
  }
  [town, date, duration, message].forEach(function (field) { field.addEventListener('input', validate); });
  form.addEventListener('formdata', function (event) { event.formData.set('message', pack()); });
  validate();
})();
