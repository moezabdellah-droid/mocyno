/* OpenAI consent bridge: local form metadata only; no Pixel or network transport. */
(function(){'use strict';
 var originals=new Map();
 function granted(){return !!(window.MOCYNO_CONSENT&&window.MOCYNO_CONSENT.has('openai'));}
 function reference(){var r=new URL(window.location.href).searchParams.get('oppref');return r&&r.length<=4096?r:'';}
 function restore(){originals.forEach(function(v,a){if(a.getAttribute('href')===v.written)a.setAttribute('href',v.original);});originals.clear();}
 function forward(a){if(!granted()||!a||!a.href)return;var r=reference();if(!r)return;var u;try{u=new URL(a.href,location.href);}catch(_){return;}if(u.origin!==location.origin||!/^\/(?:fr|en)\/contact(?:\/|\.html)?$/.test(u.pathname)||u.searchParams.has('oppref'))return;var original=a.getAttribute('href');u.searchParams.set('oppref',r);a.setAttribute('href',u.href);originals.set(a,{original:original,written:u.href});}
 function fields(){var f=document.getElementById('contactForm');if(!f)return;f.querySelectorAll('[data-mocyno-openai-field]').forEach(function(e){e.remove();});if(!granted())return;function hidden(n,v){var e=document.createElement('input');e.type='hidden';e.name=n;e.value=v;e.setAttribute('data-mocyno-openai-field','');f.appendChild(e);}hidden('_mocyno_openai_consent','granted');hidden('_mocyno_openai_path',location.pathname);var r=reference();if(r)hidden('_mocyno_openai_oppref',r);}
 function sync(){if(!granted())restore();else document.querySelectorAll('a[href]').forEach(forward);fields();}
 window.addEventListener('mocyno:consent',sync);
 window.addEventListener('focus',sync);
 document.addEventListener('click',function(e){if(!granted()){sync();return;}forward(e.target&&e.target.closest&&e.target.closest('a[href]'));},true);
 document.addEventListener('submit',function(e){if(e.target&&e.target.id==='contactForm')fields();},true);
 sync();
})();
