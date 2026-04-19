/**
 * Google Reviews Premium Block — MO'CYNO V1
 * Static local data, no external API.
 * Reads data-variant and data-zone from the container.
 */
(function () {
  'use strict';

  var LANG = (document.documentElement.lang || 'fr').substring(0, 2);
  var isEN = LANG === 'en';

  var PROFILE_URL = 'https://maps.app.goo.gl/uPTTaChzKy37RtESA';
  var RATING = isEN ? '5.0' : '5,0';
  var REVIEW_COUNT = 11;
  var CONTACT_URL = isEN ? '/en/contact/' : '/fr/contact/';

  var ALL_REVIEWS = [
    {
      author: 'Client Google',
      text: "Intervention sérieuse, réactive et rassurante. Très bonne gestion du dispositif sur site et communication fluide avec l\u2019équipe.",
      service: 'Surveillance humaine',
      location: 'Toulon',
      stars: 5
    },
    {
      author: 'Client Google',
      text: "Prestation professionnelle et discrète pour une propriété haut de gamme. Présence dissuasive, ponctualité et très bon relationnel.",
      service: 'Protection villas',
      location: 'Saint-Tropez',
      stars: 5
    },
    {
      author: 'Client Google',
      text: "Dispositif cynophile efficace et rassurant. Bonne anticipation, excellente présence terrain et grande disponibilité.",
      service: 'Sécurité cynophile',
      location: 'Cannes',
      stars: 5
    },
    {
      author: 'Client Google',
      text: "Très bonne réactivité sur un besoin urgent. Mise en place rapide et suivi sérieux jusqu\u2019à la fin de mission.",
      service: 'Gardiennage',
      location: 'Nice',
      stars: 5
    }
  ];

  /* Variants config */
  var VARIANTS = {
    home: {
      eyebrow: isEN ? 'Google Reviews' : 'Avis Google',
      title: isEN ? 'Trust is built in the field' : 'La confiance se construit sur le terrain',
      subtitle: isEN
        ? "Private security, K9, SSIAP and bespoke security solutions\u00a0: read what our clients say about MO\u2019CYNO."
        : "Prestations de sécurité privée, cynophile, SSIAP et dispositifs sur mesure\u00a0: découvrez quelques retours de clients ayant fait appel à MO\u2019CYNO.",
      count: 3,
      indices: [0, 1, 2],
      showSecondaryCta: true
    },
    contact: {
      eyebrow: isEN ? 'Reassurance' : 'Réassurance',
      title: isEN ? 'A team renowned for its responsiveness' : 'Une équipe reconnue pour sa réactivité',
      subtitle: isEN ? "Our clients testify to the quality of our services." : "Nos clients témoignent de la qualité de nos interventions.",
      count: 1,
      indices: [0],
      showSecondaryCta: false,
      compact: true
    },
    zone: {
      count: 2,
      showSecondaryCta: true
    }
  };

  var ZONE_CONFIG = {
    'saint-tropez': {
      title: 'Avis clients — Sécurité à Saint-Tropez',
      eyebrow: 'Avis Google',
      subtitle: "La confiance de nos clients dans le Golfe de Saint-Tropez.",
      indices: [1, 0]
    },
    'cannes': {
      title: 'Avis clients — Sécurité à Cannes',
      eyebrow: 'Avis Google',
      subtitle: "Retours de missions réalisées sur le secteur de Cannes.",
      indices: [2, 1]
    },
    'nice': {
      title: 'Avis clients — Sécurité à Nice',
      eyebrow: 'Avis Google',
      subtitle: "Des interventions rapides et efficaces sur Nice et sa métropole.",
      indices: [3, 2]
    }
  };

  function stars(n) {
    var s = '';
    for (var i = 0; i < n; i++) s += '<span class="gr-star">★</span>';
    return s;
  }

  function googleIcon() {
    return '<svg class="gr-google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>' +
      '<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>' +
      '<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>' +
      '<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>' +
      '</svg>';
  }

  function renderCard(review) {
    var initials = review.author.split(' ').map(function (w) { return w[0]; }).join('').toUpperCase();
    return '<div class="gr-card">' +
      '<div class="gr-card-header">' +
        '<div class="gr-card-author">' +
          '<div class="gr-avatar">' + initials + '</div>' +
          '<div>' +
            '<div class="gr-author-name">' + review.author + '</div>' +
            '<div class="gr-author-source">' + (isEN ? 'Google Review' : 'Avis Google') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="gr-card-stars">' + stars(review.stars) + '</div>' +
      '</div>' +
      '<p class="gr-card-text">' + review.text + '</p>' +
      '<div class="gr-card-tags">' +
        '<span class="gr-tag">' + review.service + '</span>' +
        '<span class="gr-tag">' + review.location + '</span>' +
      '</div>' +
    '</div>';
  }

  function render(container) {
    var variant = container.getAttribute('data-variant') || 'home';
    var zone = container.getAttribute('data-zone') || '';
    var cfg = VARIANTS[variant];
    if (!cfg) return;

    var eyebrow, title, subtitle, indices;

    if (variant === 'zone' && ZONE_CONFIG[zone]) {
      var zc = ZONE_CONFIG[zone];
      eyebrow = zc.eyebrow;
      title = zc.title;
      subtitle = zc.subtitle;
      indices = zc.indices;
    } else {
      eyebrow = cfg.eyebrow || 'Avis Google';
      title = cfg.title || '';
      subtitle = cfg.subtitle || '';
      indices = cfg.indices || [0];
    }

    var reviews = indices.map(function (i) { return ALL_REVIEWS[i]; }).filter(Boolean);
    var compactClass = cfg.compact ? ' gr-compact' : '';

    var html = '<section class="gr-section' + compactClass + '">' +
      '<div class="gr-inner">' +
        '<p class="gr-eyebrow">' + eyebrow + '</p>' +
        '<h2 class="gr-title">' + title + '</h2>' +
        '<p class="gr-subtitle">' + subtitle + '</p>' +
        '<div class="gr-summary">' +
          '<div class="gr-rating-badge">' +
            googleIcon() +
            '<span>' + RATING + '</span>' +
            '<span class="gr-stars">' + stars(5) + '</span>' +
          '</div>' +
          '<span class="gr-count">' + REVIEW_COUNT + (isEN ? ' Google reviews' : ' avis Google') + '</span>' +
        '</div>' +
        '<div class="gr-cards">' +
          reviews.map(renderCard).join('') +
        '</div>' +
        '<div class="gr-actions">' +
          '<a class="gr-cta-primary" href="' + PROFILE_URL + '" target="_blank" rel="noopener noreferrer">' +
            googleIcon() + (isEN ? ' See all Google reviews' : ' Voir tous les avis Google') +
          '</a>' +
          (cfg.showSecondaryCta
            ? '<a class="gr-cta-secondary" href="' + CONTACT_URL + '">' + (isEN ? 'Request a quote' : 'Demander un devis') + '</a>'
            : '') +
        '</div>' +
      '</div>' +
    '</section>';

    container.innerHTML = html;
  }

  /* Init — silent fallback if container absent */
  function init() {
    var el = document.getElementById('google-reviews');
    if (el) render(el);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
