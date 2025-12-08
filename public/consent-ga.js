/* consent-ga.js — Mo'Cyno — Consent Mode v2 + GA4 (+ Ads optionnel) */
(function () {
  'use strict';

  /* ===========================
   *  Config / helpers
   * =========================== */
  var LS_KEY = 'mocyno_consent_state'; // 'granted' | 'denied'
  var LS_TS = 'mocyno_consent_ts';
  var FALLBACK_GA4 = 'G-E5JX7DYYYN';   // remplace si besoin
  var FALLBACK_ADS = null;             // ex: 'AW-1067390390' ou laisse null
  var DOC = document;
  var WIN = window;

  function getMeta(name) {
    var m = DOC.querySelector('meta[name="' + name + '"]');
    return m && m.content ? m.content.trim() : '';
  }
  function getGA4Id() {
    return getMeta('ga-measurement-id') || FALLBACK_GA4;
  }
  function getAdsId() {
    return getMeta('google-ads-id') || FALLBACK_ADS || '';
  }
  function isEnglish() {
    var htmlLang = (DOC.documentElement.getAttribute('lang') || '').toLowerCase();
    if (htmlLang.startsWith('en')) return true;
    if (location.pathname.startsWith('/en')) return true;
    return false;
  }
  function nowISO() { try { return new Date().toISOString(); } catch (e) { return ''; } }

  function readConsent() {
    try { return localStorage.getItem(LS_KEY) || 'denied'; } catch (e) { return 'denied'; }
  }
  function saveConsent(value) {
    try {
      localStorage.setItem(LS_KEY, value);
      localStorage.setItem(LS_TS, nowISO());
    } catch (e) { }
  }

  /* Expose un mini-API pour révoquer facilement depuis le site */
  WIN.MOCYNO_CONSENT = {
    revoke: function () {
      saveConsent('denied');
      // Recharger pour repartir en mode "denied"
      location.reload();
    }
  };

  /* =========================================
   *  gtag bootstrap (sans charger gtag.js)
   * ========================================= */
  WIN.dataLayer = WIN.dataLayer || [];
  function gtag() { WIN.dataLayer.push(arguments); }
  WIN.gtag = WIN.gtag || gtag;

  /* Mettre le consentement par défaut sur DENIED
     (exigence Consent Mode v2) */
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied'
  });

  /* =========================================
   *  Loader des librairies (gtag.js + config)
   * ========================================= */
  var __loaded = false;
  function loadAnalytics() {
    if (__loaded) return;
    __loaded = true;

    var GA4_ID = getGA4Id();
    var ADS_ID = getAdsId();

    // Inject gtag.js
    var s = DOC.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_ID);
    DOC.head.appendChild(s);

    // Init GA4
    gtag('js', new Date());
    gtag('config', GA4_ID, {
      // active le linker si besoin (sites sous sous-domaines)
      'linker': { 'accept_incoming': true }
    });

    // Optionnel : Google Ads (si meta fournie ou FALLBACK_ADS défini)
    if (ADS_ID) {
      gtag('config', ADS_ID); // active Conversion Linker
    }

    // Events utiles si consentement OK
    setupSiteEvents();
  }

  /* =========================================
   *  Mise à jour du consentement
   * ========================================= */
  function grantConsent() {
    gtag('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted'
    });
  }

  /* =========================================
   *  Bannière de consentement
   * ========================================= */
  function buildBanner() {
    // Si déjà choisi -> rien
    var state = readConsent();
    if (state === 'granted') {
      grantConsent();
      loadAnalytics();
      return;
    }
    // state 'denied' : on affiche la bannière
    var en = isEnglish();

    var box = DOC.createElement('div');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-live', 'polite');
    box.style.position = 'fixed';
    box.style.left = '16px';
    box.style.right = '16px';
    box.style.bottom = '16px';
    box.style.background = '#0b1220';
    box.style.color = '#e8edf3';
    box.style.border = '1px solid rgba(255,255,255,.15)';
    box.style.borderRadius = '14px';
    box.style.boxShadow = '0 10px 24px rgba(0,0,0,.28)';
    box.style.padding = '14px 16px';
    box.style.zIndex = '99999';
    box.style.display = 'grid';
    box.style.gridTemplateColumns = '1fr auto';
    box.style.gap = '12px';
    box.style.alignItems = 'center';
    box.style.maxWidth = '980px';
    box.style.margin = '0 auto';

    // Dans la fonction buildBanner(), après la ligne 127
    box.setAttribute('aria-labelledby', 'consent-title');
    box.setAttribute('aria-describedby', 'consent-desc');

    var title = DOC.createElement('div');
    title.id = 'consent-title';
    title.style.fontWeight = '700';
    title.style.marginBottom = '4px';
    title.textContent = en ? 'Cookie Consent' : 'Consentement aux cookies';

    var txt = DOC.createElement('div');
    txt.id = 'consent-desc';
    txt.style.fontSize = '14px';
    txt.style.lineHeight = '1.45';
    txt.innerHTML = en
      ? "We use analytics cookies (GA4) only after your consent. You can revoke anytime."
      : "Nous utilisons des cookies d’analyse (GA4) uniquement après votre consentement. Vous pouvez le révoquer à tout moment.";

    var textContainer = DOC.createElement('div');
    textContainer.appendChild(title);
    textContainer.appendChild(txt);

    var actions = DOC.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    actions.style.flexWrap = 'wrap';

    function mkBtn(label, primary) {
      var b = DOC.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.padding = '8px 12px';
      b.style.borderRadius = '999px';
      b.style.cursor = 'pointer';
      b.style.fontWeight = '600';
      if (primary) {
        b.style.background = '#CD1A20';
        b.style.border = '1px solid #CD1A20';
        b.style.color = '#fff';
      } else {
        b.style.background = 'transparent';
        b.style.border = '1px solid rgba(255,255,255,.25)';
        b.style.color = '#e8edf3';
      }
      return b;
    }

    var acceptBtn = mkBtn(en ? 'Accept' : 'Accepter', true);
    var refuseBtn = mkBtn(en ? 'Refuse' : 'Refuser', false);
    var policyLink = DOC.createElement('a');
    policyLink.href = en ? '/en/privacy.html' : '/politique-confidentialite.html';
    policyLink.textContent = en ? 'Learn more' : 'En savoir plus';
    policyLink.style.color = '#cbe0ff';
    policyLink.style.textDecoration = 'underline';
    policyLink.style.alignSelf = 'center';

    acceptBtn.addEventListener('click', function () {
      saveConsent('granted');
      grantConsent();
      loadAnalytics();
      if (box && box.parentNode) box.parentNode.removeChild(box);
    });
    refuseBtn.addEventListener('click', function () {
      saveConsent('denied'); // restera en denied (aucun chargement de GA)
      if (box && box.parentNode) box.parentNode.removeChild(box);
    });

    actions.appendChild(acceptBtn);
    actions.appendChild(refuseBtn);
    actions.appendChild(policyLink);
    box.appendChild(txt);
    box.appendChild(actions);
    DOC.body.appendChild(box);
  }

  /* =========================================
   *  Events site utiles (si consentement OK)
   * ========================================= */
  function setupSiteEvents() {
    try {
      // Click sur liens téléphone
      DOC.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a[href^="tel:"]');
        if (!a) return;
        var tel = (a.getAttribute('href') || '').replace('tel:', '');
        WIN.gtag && WIN.gtag('event', 'click_tel', { value: tel });
      }, { passive: true });

      // Soumission de formulaire (générique)
      DOC.addEventListener('submit', function (e) {
        try {
          var f = e.target;
          if (!f || !f.tagName) return;
          WIN.gtag && WIN.gtag('event', 'form_submit', {
            form_id: f.id || '',
            form_action: f.action || location.pathname
          });
        } catch (_) { }
      }, true);
    } catch (_) { }
  }

  /* =========================================
   *  Boot
   * ========================================= */
  function start() {
    // Si l'utilisateur avait déjà accepté, on charge directement
    if (readConsent() === 'granted') {
      grantConsent();
      loadAnalytics();
    } else {
      // Sinon, on affiche la bannière
      buildBanner();
    }
  }

  if (DOC.readyState !== 'loading') start();
  else DOC.addEventListener('DOMContentLoaded', start);
})();
