# État de production — publication du 16 novembre 2026

État de référence consigné le 17/11/2026. Ce document décrit la publication existante ; il ne déclenche aucune publication.

## Références

| Élément | Référence |
| --- | --- |
| Dépôt et branche source | moezabdellah-droid/mocyno — main |
| Commit publié | `cef3350c9ebd801e05eafbad60a74b1ea3544c9c` (« Fusion PR #16 ») |
| Projet / site / cible Hosting | `mocyno` / `mocyno` / `prodsite` |
| Version publiée | `sites/mocyno/versions/8e1201990b8f7ed3` |
| Release live | `sites/mocyno/channels/live/releases/1794863513779000` |
| Mise en ligne UTC | 2026-11-16T21:11:53.779Z |
| Mise en ligne Europe/Paris | 16/11/2026 à 22:11:53.779 |
| Version précédente de retour arrière | `sites/mocyno/versions/cc03f589f520463c` — lot 17A du 15/11 |
| Inventaire publié | 269 fichiers du site ; 271 dans l’API avec les deux fichiers Firebase réservés |
| Traçabilité | [Issue #17](https://github.com/moezabdellah-droid/mocyno/issues/17) |

Méthode : clone propre du commit de main, publication Hosting sur le canal de prévisualisation `lot18-publication-20261116`, accord écrit de Moëz, puis release live par API de la version exacte prévisualisée, sans reconstruction. URL temporaire : https://mocyno--lot18-publication-20261116-guwuid98.web.app (expiration initiale : 23/11/2026).

Les PR #8 à #16 sont fusionnées. Les PR #4, #5, #6 et #7 sont fermées car remplacées.

## Pages et routage

Pages intégrées à cette référence :

- Alarme FR : `/fr/services/intervention-alarme-video-protection/`.
- Alarme EN : `/en/services/alarm-response-cctv/`.
- Var FR/EN : `/fr/zones/var/` et `/en/zones/var/`.
- Brignoles : `/fr/zones/brignoles/`.
- Nouvelle adresse K9 EN : `/en/services/k9-security/`.

Le Hosting de `firebase.json` contient **80 redirections** : les 78 de la production antérieure et deux règles 301 pour `/en/services/securite-cynophile` et `/en/services/securite-cynophile/**`, vers `/en/services/k9-security/`. Conserver l’ordre des règles.

La réécriture `/api/**` cible le service Cloud Run `contactform`, région `europe-west1`. Aucun changement du service ni de `/api/contact` ne fait partie de cette consignation.

## Contrôles consignés

Le 16/11, en prévisualisation puis en production : **19 pages/fichiers en HTTP 200**, **7 redirections en HTTP 301 vers les destinations exactes**, et une seule balise robots `noindex, follow` sur la page publicitaire Saint-Tropez.

Pages/fichiers vérifiés :

```text
/fr/
/en/
/fr/contact/
/en/contact/
/fr/zones/var/
/fr/zones/brignoles/
/en/zones/var/
/fr/services/intervention-alarme-video-protection/
/en/services/alarm-response-cctv/
/en/services/k9-security/
/fr/services/marinas-ports/
/fr/securite-luxe-saint-tropez/
/fr/mentions-legales/
/en/legal/
/fr/blog/gardiennage-chantier-toulon/
/sitemap-index.xml
/sitemap-fr.xml
/sitemap-en.xml
/robots.txt
```

| Source vérifiée (301) | Destination |
| --- | --- |
| /en/services/securite-cynophile/ | /en/services/k9-security/ |
| /mentions-legales.html | /fr/mentions-legales/ |
| /merci/ | /fr/merci/ |
| /en/services/luxury-protection/ | /en/services/luxury-boutiques/ |
| /fr/services/protection-luxe/ | /fr/services/luxe-boutiques/ |
| /fr/services/evenementiel-premium/ | /fr/services/securite-evenementielle/ |
| / | /fr/ |

GTM-N4MSSMV3 et l’affichage Turnstile ont été contrôlés sur les deux pages de devis. Les avertissements CSP en mode Report-Only et erreurs Tawk languages/fr.json 520/CORS étaient déjà présents avant publication ; aucune correction dans ce lot.

Contrôle du 17/11, communiqué par Moëz : 12 pages conformes, redirection K9 correcte, sitemap à jour. Il s’agit d’un contrôle rapporté, sans nouvel audit réalisé pour cette PR documentaire.

## Tests réels du 17/11

Moëz a confirmé les deux envois depuis `/fr/contact/` et `/fr/securite-luxe-saint-tropez/` : Turnstile OK, confirmation affichée et e-mail reçu pour chacun. Voir les commentaires de l’issue #17. Cette validation provient du propriétaire ; l’envoi par navigateur automatisé n’a pas été confirmé.

**Google Ads et OpenAI Ads : conversions encore à confirmer sous 48 heures après les tests.** Le chargement des scripts ne prouve pas une conversion attribuée.

## Limites et suites

Les workflows de déploiement automatique et de blog mensuel doivent rester désactivés. Cette PR ne modifie aucun workflow ni réglage de compte.

Le retour arrière reste disponible comme référence et n’a pas été effectué ; vérifier la conservation effective de la version avant tout usage.

Points laissés pour des lots séparés : retirer `public/functions/index.js` de l’hébergement public et étoffer les articles avant toute réactivation de leur génération mensuelle.
