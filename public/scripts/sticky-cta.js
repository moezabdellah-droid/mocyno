// MO'CYNO — sticky-cta.js
// Ce script gère l'affichage du bouton CTA flottant
// Le bouton est déjà dans le DOM, ce script peut ajouter
// un comportement dynamique (masquage au scroll, etc.)

(function () {
    var cta = document.querySelector('.floating-cta');
    if (!cta) return;

    // Masquer quand on scrolle jusqu'au footer
    var footer = document.querySelector('footer');
    if (!footer) return;

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            cta.style.opacity = entry.isIntersecting ? '0' : '1';
            cta.style.pointerEvents = entry.isIntersecting ? 'none' : 'auto';
        });
    }, { threshold: 0.1 });

    observer.observe(footer);
})();
