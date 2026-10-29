# MO’CYNO — devis réellement envoyés / OpenAI Ads

État : correctif destiné à une revue en brouillon, non déployé. La publication
en production nécessite une validation distincte après recette.

## Configuration Ads Manager déjà créée

- Source : MO’CYNO – Site web ; Pixel `DqukyUmpW35N3FBBzUdEU8`.
- Conversion : Devis envoyé avec succès ; événement standard `lead_created`.
- Les paramètres de suivi ont été enregistrés sur l’annonce cynophile.
- Aucun événement réel ou test reçu n’a été démontré. La conversion n’est pas
  encore associée à une campagne ; le changement d’objectif reste hors périmètre.

## Changement proposé

1. `contactForm` conserve ses redirections pour les formulaires natifs. Pour
   les requêtes acceptant JSON, il ne renvoie `accepted: true` et un identifiant
   aléatoire qu’après acceptation de la notification commerciale par Resend.
   Le piège antispam renvoie `accepted: false` ; erreurs et validations ne
   renvoient jamais de reçu de succès.
2. Le script de formulaire utilise cette réponse, bloque les clics concurrents,
   limite l’attente de confirmation à 20 secondes (y compris lecture du corps de
   réponse), sans renvoi automatique, affiche une confirmation accessible sur
   place et n’envoie aucune conversion
   pour une simple visite, un clic, une erreur ou un reçu manquant.
   Sans JavaScript, la soumission native reste disponible.
3. Le Pixel ne charge qu’après un accord OpenAI séparé, au moyen du choix
   « Tout accepter ». « GA4 uniquement » et « Tout refuser » bloquent OpenAI.
   Un ancien accord GA4 n’accorde jamais automatiquement le suivi publicitaire.
   Le retrait appelle aussi `oaiq("consent", false)`.
4. L’appel `lead_created` utilise l’identifiant renvoyé par le serveur,
   `opt_out: true`, et ne passe aucun champ de formulaire. La correspondance
   automatique du Pixel peut détecter des coordonnées hachées ; elle est
   explicitée dans les nouvelles informations de consentement.
5. Les deux formulaires événementiels courts, actuellement dépourvus de champ
   `message` pourtant obligatoire côté serveur, reçoivent une valeur décrivant
   leur demande de devis. Aucun message libre du client n’est inventé.
6. Les informations cookies/confidentialité FR et EN et la politique CSP en
   mode rapport sont mises à jour. Les références au script de consentement
   sont versionnées dans 84 pages, car le serveur utilise un cache JavaScript
   immutable d’un an. Ces changements de référence ne réécrivent pas leurs textes.

## Validation locale

`node --test scripts/test-openai-measurement.cjs`

19 tests ciblés couvrent reçu serveur, piège antispam, validations, échec Resend,
redirections natives, consentement refusé/absent, stockage bloqué, retrait,
succès, double clic, reçu dupliqué, erreurs réseau et migration du consentement.
6 tests supplémentaires utilisent les vraies pages HTML FR/EN dans jsdom et un
serveur HTTP local. Le serveur Firebase et le prestataire e-mail restent simulés.

Les fonctions de mail et le Pixel sont simulés : aucun message n’est envoyé,
aucune requête de conversion n’est adressée à OpenAI.

## Publication soumise à accord distinct

Le workflow `openai-measurement-qa.yml` exécute les tests de la branche de revue
sous Node 22, sans secret de production, sans envoi réel et sans déploiement.
Une PR et des tests réussis ne constituent pas un environnement Firebase de
préproduction. Une vraie recette Firebase doit encore être organisée sur un
environnement isolé ; ne pas envoyer les essais vers le formulaire de production.

Le workflow GitHub existant déploie automatiquement **Hosting** après un push
sur `main`, mais ne déploie pas `contactForm`. Ne pas fusionner avant un plan
de publication coordonné. Les droits Firebase et l’état réel de la fonction
doivent être vérifiés séparément.

Ordre recommandé après approbation :

1. Déployer uniquement la nouvelle fonction `contactForm`, puis vérifier sa
   compatibilité avec les formulaires natifs. Ne pas redéployer les autres fonctions.
2. Déployer le Hosting correspondant au même correctif.
3. Vérifier le bandeau sur mobile/ordinateur et en FR/EN. Refus et GA4 seul :
   aucune requête SDK/mesure OpenAI. Vérifier le retrait et les anciens choix GA4.
4. Après autorisation de l’envoi test, soumettre une demande synthétique clairement
   identifiée. Confirmer réception commerciale et `lead_created` dans le flux Ads
   Manager, avec le même identifiant. Vérifier absence de double comptage.
5. Associer ensuite l’événement à la campagne sur accord, sans modifier son
   objectif, son budget total de 100 €, son CPC maximal de 2,60 € ou ses statuts.

La réussite locale ne prouve pas la réception dans Ads Manager, le chargement
du SDK en production, la livraison finale du mail ou l’attribution à une annonce.

## Limites et retour arrière

Cette première version utilise le Pixel seul ; aucune clé API n’est créée,
aucune CAPI n’est installée. La déduplication locale protège les doubles clics
concurrents et les reçus répétés dans la même page, pas deux demandes explicitement
renvoyées après rechargement. Le SDK gère la conservation d’oppref après accord ;
les visites sans accord peuvent rester non attribuées.

Un retour à l’ancien Hosting est compatible avec la fonction modifiée, qui garde
le parcours natif. Un ancien backend avec le nouveau frontend ne confirme pas
les reçus JSON : publier le backend en premier et ne pas revenir à l’ancien
backend avant le Hosting.

Documentation : https://developers.openai.com/ads/measurement-pixel

## Vérifications complémentaires avant validation

- 25 tests locaux réussis : 19 ciblés + 6 HTML/HTTP.
- Requête bloquée et corps de réponse bloqué : arrêt logique après 20 secondes,
  bouton rétabli, message de réception incertaine et aucun renvoi automatique.
- Réponse ambiguë du fournisseur de mail : aucun reçu de succès.
- Exception du Pixel après envoi : confirmation commerciale conservée.
- Bandeau : une colonne, hauteur limitée à 70vh et défilement vertical.
- Contrôle visuel mobile/ordinateur non réalisé : la politique du navigateur
  de cette session bloque les fichiers de prévisualisation locale. jsdom ne
  prouve pas le rendu graphique ni le comportement d’un appareil réel.
- Branche distante main inchangée au moment du contrôle :
  `1f026e880897f099d28a628729c3b6f3a18a3cc3`. Aucun push ou déploiement effectué.

Ces résultats prouvent les scénarios locaux couverts, pas une absence absolue
de panne. Restent à valider en préproduction : rendu réel, exécution Firebase,
réception e-mail et événement dans Ads Manager, ordre de déploiement et rollback.

### Contrôle du runtime

Le 29 octobre 2026, les 25 tests ont aussi réussi sous Node v22.23.4.
Le module complet functions/index.js se charge avec ses dépendances installées
sous cette version. Cela ne constitue pas un déploiement ni un test Firebase réel.
