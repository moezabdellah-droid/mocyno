// tawk-consent.js — MO'CYNO
// Chargement différé Tawk.to sur interaction utilisateur
// Pattern compatible avec le repo (var, function, setTimeout + events)
(function () {
    var tawkLoaded = false;

    function loadTawk() {
        if (tawkLoaded) return;
        tawkLoaded = true;

        var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();
        var s1 = document.createElement("script"), s0 = document.getElementsByTagName("script")[0];
        s1.async = true;
        s1.src = 'https://embed.tawk.to/693452a684fc15197fdfc2a0/1jbq65n5t';
        s1.charset = 'UTF-8';
        s1.setAttribute('crossorigin', '*');
        s0.parentNode.insertBefore(s1, s0);
    }

    // Chargement après 3 secondes
    setTimeout(loadTawk, 3000);

    // OU chargement sur première interaction
    var events = ['scroll', 'mousemove', 'touchstart', 'click'];
    var loadOnce = function () {
        loadTawk();
        events.forEach(function (event) {
            window.removeEventListener(event, loadOnce);
        });
    };

    events.forEach(function (event) {
        window.addEventListener(event, loadOnce, { passive: true, once: true });
    });
})();
