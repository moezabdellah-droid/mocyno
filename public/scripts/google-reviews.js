/* MO'CYNO: local rating summary only. No individual reviews or customer names. */
(function () {
  'use strict';
  var english = (document.documentElement.lang || 'fr').slice(0, 2) === 'en';
  var rating = 5.0;
  var reviewCount = 11;
  var profileUrl = 'https://maps.google.com/?cid=1923001679797881211';
  function init() {
    var container = document.getElementById('google-reviews');
    if (!container) return;
    var section = document.createElement('section');
    section.className = 'gr-section';
    var inner = document.createElement('div');
    inner.className = 'gr-inner';
    var heading = document.createElement('h2');
    heading.className = 'gr-title';
    heading.textContent = english ? 'Google reviews' : 'Avis Google';
    var summary = document.createElement('p');
    summary.className = 'gr-count';
    summary.textContent = (english ? rating.toFixed(1) : rating.toFixed(1).replace('.', ',')) + '/5 · ' + reviewCount + (english ? ' Google reviews' : ' avis Google');
    var link = document.createElement('a');
    link.className = 'gr-cta-primary';
    link.href = profileUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = english ? 'View Google profile' : 'Voir la fiche Google';
    inner.appendChild(heading);
    inner.appendChild(summary);
    inner.appendChild(link);
    section.appendChild(inner);
    container.replaceChildren(section);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
