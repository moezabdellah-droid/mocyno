/* MO'CYNO — optional analytics and chat consent. Core site/forms never depend on consent. */
(function () {
  'use strict';
  var DOC = document, WIN = window;
  var KEY = 'mocyno_consent_v2', MAX_AGE = 180 * 24 * 60 * 60 * 1000;
  var analyticsLoaded = false, dialog, returnFocus;
  var en = (DOC.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
  function read() {
    try {
      var value = JSON.parse(localStorage.getItem(KEY));
      if (value && value.version === 2 && typeof value.analytics === 'boolean' && typeof value.chat === 'boolean' && typeof value.marketing === 'boolean' && Date.now() - value.updatedAt >= 0 && Date.now() - value.updatedAt < MAX_AGE) return value;
    } catch (_) { /* No storage is treated as no choice. */ }
    return null;
  }
  var state = read();
  WIN.dataLayer = WIN.dataLayer || [];
  WIN.gtag = WIN.gtag || function () { WIN.dataLayer.push(arguments); };
  WIN.gtag('consent', 'default', {analytics_storage:'denied', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'});
  function has(category) { return !!(state && state[category] === true); }
  function loadAnalytics() {
    if (analyticsLoaded || (!has('analytics') && !has('marketing'))) return;
    var container = DOC.querySelector('meta[name="gtm-container-id"]');
    var ga = DOC.querySelector('meta[name="ga-measurement-id"]');
    var id = container && container.content;
    var script = DOC.createElement('script');
    if (id && /^GTM-[A-Z0-9]+$/.test(id)) {
      WIN.dataLayer.push({'gtm.start': Date.now(), event:'gtm.js'});
      script.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(id);
    } else if (ga && /^G-[A-Z0-9]+$/.test(ga.content)) {
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ga.content);
      WIN.gtag('js', new Date());
      WIN.gtag('config', ga.content);
    } else return;
    analyticsLoaded = true;
    script.async = true;
    DOC.head.appendChild(script);
  }
  function clearAnalyticsCookies() {
    var hostname = location.hostname;
    var domains = ['', hostname, '.' + hostname];
    if (hostname === 'mocyno.com' || hostname.endsWith('.mocyno.com')) domains.push('.mocyno.com');
    DOC.cookie.split(';').forEach(function (cookie) {
      var name = cookie.trim().split('=')[0];
      if (!/^(_ga(?:_|$)|_gid$|_gat(?:_|$)|_gcl_)/.test(name)) return;
      domains.forEach(function (domain) {
        DOC.cookie = name + '=; Max-Age=0; path=/' + (domain ? '; domain=' + domain : '') + '; SameSite=Lax';
      });
    });
  }
  function apply() {
    WIN.gtag('consent', 'update', {analytics_storage:has('analytics')?'granted':'denied', ad_storage:has('marketing')?'granted':'denied', ad_user_data:has('marketing')?'granted':'denied', ad_personalization:has('marketing')?'granted':'denied'});
    DOC.documentElement.classList.toggle('mocyno-chat-enabled', has('chat'));
    WIN.dispatchEvent(new CustomEvent('mocyno:consent', {detail:{analytics:has('analytics'), chat:has('chat'), marketing:has('marketing')}}));
    loadAnalytics();
  }
  function close() {
    if (dialog) { dialog.remove(); dialog = null; }
    if (returnFocus && returnFocus.isConnected) returnFocus.focus();
  }
  function save(analytics, chat, marketing) {
    var reload = (has('analytics') && !analytics && analyticsLoaded) || (has('marketing') && !marketing && analyticsLoaded) || (has('chat') && !chat);
    state = {version:2, analytics:!!analytics, chat:!!chat, marketing:!!marketing, updatedAt:Date.now()};
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      localStorage.setItem('mocyno_consent_state', analytics ? 'granted' : 'denied');
      localStorage.setItem('mocyno_consent_ts', new Date().toISOString());
    } catch (_) { /* Choice still applies to the current page. */ }
    if (!analytics) clearAnalyticsCookies();
    apply(); close();
    if (reload) location.reload();
  }
  function button(text, fn) {
    var b = DOC.createElement('button'); b.type='button'; b.textContent=text;
    b.addEventListener('click', fn); return b;
  }
  function open() {
    if (dialog) { dialog.querySelector('button').focus(); return; }
    returnFocus = DOC.activeElement;
    dialog = DOC.createElement('section'); dialog.className='mocyno-consent';
    dialog.setAttribute('role','dialog'); dialog.setAttribute('aria-labelledby','mocyno-consent-title');
    var title=DOC.createElement('h2'); title.id='mocyno-consent-title';
    title.textContent=en?'Your cookie preferences':'Vos préférences de cookies';
    var text=DOC.createElement('p'); text.textContent=en?
      'Optional audience measurement, advertising measurement (Google), and live chat (Tawk.to) load with your agreement. You can choose each purpose. The contact form and phone remain available if you refuse.':
      'La mesure d’audience, la mesure publicitaire (Google) et le chat (Tawk.to), facultatifs, sont chargés avec votre accord. Vous pouvez choisir chaque finalité. Le formulaire et le téléphone restent disponibles si vous refusez.';
    var actions=DOC.createElement('div'); actions.className='mocyno-consent-actions';
    actions.appendChild(button(en?'Accept all':'Tout accepter',function(){save(true,true,true);}));
    actions.appendChild(button(en?'Reject all':'Tout refuser',function(){save(false,false,false);}));
    var details=DOC.createElement('details'), summary=DOC.createElement('summary');
    summary.textContent=en?'Customize':'Personnaliser'; details.appendChild(summary);
    function choice(name,label) {
      var wrapper=DOC.createElement('label'), input=DOC.createElement('input');
      input.type='checkbox'; input.checked=has(name); input.id='mocyno-consent-'+name;
      wrapper.appendChild(input); wrapper.appendChild(DOC.createTextNode(label)); details.appendChild(wrapper);return input;
    }
    var analytics=choice('analytics',en?'Audience measurement (Google)':'Mesure d’audience (Google)');
    var chat=choice('chat',en?'Live chat (Tawk.to)':'Chat en ligne (Tawk.to)');
    var marketing=choice('marketing',en?'Advertising and conversion measurement (Google)':'Publicité et mesure des conversions (Google)');
    details.appendChild(button(en?'Save my choices':'Enregistrer mes choix',function(){save(analytics.checked,chat.checked,marketing.checked);}));
    var policy=DOC.createElement('a');policy.href=en?'/en/privacy/':'/fr/politique-confidentialite/';policy.textContent=en?'Privacy policy':'Politique de confidentialité';
    dialog.appendChild(title);dialog.appendChild(text);dialog.appendChild(actions);dialog.appendChild(details);dialog.appendChild(policy);
    if (state) dialog.appendChild(button(en?'Close':'Fermer',close));
    dialog.addEventListener('keydown',function(event){if(event.key==='Escape' && state)close();});
    DOC.body.appendChild(dialog);
  }
  WIN.MOCYNO_CONSENT={open:open,has:has,revoke:function(){save(false,false,false);}};
  function start() {
    DOC.addEventListener('click',function(event){var trigger=event.target.closest('[data-cookie-settings]');if(trigger){event.preventDefault();open();dialog.querySelector('button').focus();}});
    DOC.addEventListener('click',function(event){var link=event.target.closest('a[href^="tel:"]');if(link && has('analytics'))WIN.gtag('event','click_tel',{value:link.getAttribute('href').slice(4)});},{passive:true});
    DOC.addEventListener('submit',function(event){var form=event.target;if(has('analytics') && form && form.tagName==='FORM')WIN.gtag('event','form_submit',{form_id:form.id||'',form_action:form.action||location.pathname});},true);
    apply(); if(!state)open();
  }
  if(DOC.readyState==='loading')DOC.addEventListener('DOMContentLoaded',start);else start();
})();
