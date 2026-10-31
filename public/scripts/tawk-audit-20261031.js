(function () {
  'use strict';
  var loaded=false;
  function load() {
    if(loaded || !window.MOCYNO_CONSENT || !window.MOCYNO_CONSENT.has('chat'))return;
    loaded=true;
    window.Tawk_API=window.Tawk_API||{};
    window.Tawk_LoadStart=new Date();
    var script=document.createElement('script');script.async=true;
    script.src='https://embed.tawk.to/693452a684fc15197fdfc2a0/1jbq65n5t';
    script.charset='UTF-8';script.setAttribute('crossorigin','*');
    document.head.appendChild(script);
  }
  window.addEventListener('mocyno:consent',load);
  load();
})();
