# Recette isolée OpenAI — staging uniquement

État : préparation testée, aucun déploiement de fonction par cette préparation.
Destinataire autorisé par Moëz : moezabdellah@mocyno.com.

## Préparation
Exécuter `node scripts/prepare-openai-staging.cjs <nouveau-dossier-temporaire>`.
Le dossier reçoit index.js et les deux fichiers de dépendances. Aucun fichier .env, secret ou credential n'est copié.
Le source de production n'est pas modifié. Des ancres exactes arrêtent la préparation en cas de dérive du source.
Les deux messages (notification et confirmation) vont uniquement à l'adresse autorisée, avec préfixe TEST STAGING.
Le handler généré refuse toute exécution dont GCLOUD_PROJECT n'est pas mocyno-staging.
Déployer seulement contactForm sur mocyno-staging, jamais l'ensemble des fonctions. Ce document n'exécute aucun déploiement.
Ne pas associer cette préparation à un déclencheur automatique de déploiement.

## Avant déploiement
Vérifier les droits de déploiement séparément des droits de lecture déjà confirmés.
Vérifier la disponibilité de RESEND_API_KEY dans le runtime staging sans lire ni publier sa valeur.
Le mode actuel getResend utilise l'environnement; ne pas supposer qu'un secret est automatiquement monté.
Conserver la version de fonction précédente pour retour arrière.
Obtenir l'accord sur le déploiement de contactForm staging et les éventuels coûts Firebase/Resend.

## Parcours réel à préparer
Créer un canal de recette dédié qui route /api/contact vers contactForm staging.
Les aperçus visuels actuels bloquent form-action/connect-src et ne conviennent pas au test réel.
Conserver noindex, exclure les interfaces admin/clients/mobile et limiter les destinations de connexion aux services nécessaires.
Utiliser des noms et messages synthétiques sans adresse de site protégé.
L'adresse fictive example.invalid ne doit jamais devenir un destinataire : l'artefact la remplace pour la confirmation.
Effectuer au maximum un envoi réussi par scénario autorisé pour limiter e-mails et événements.
Vérifier : erreur de validation = aucun devis; succès serveur avec event_id; deux e-mails de recette; refus/GA4 seul = aucun lead OpenAI; consentement explicite = un lead.
La réception côté Ads Manager est indispensable à toute déclaration de mesure opérationnelle.
La preuve d'acceptation Resend est distincte de la preuve de livraison en boîte.
Aucune fusion ni mise en production autorisée par cette recette.
