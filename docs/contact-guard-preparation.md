# Protection du formulaire — préparation, non activée

Ce changement prépare un contrôle antibot Turnstile vérifié côté serveur, un plafond partagé et une réservation anti-doublon avant tout appel au fournisseur d'e-mails.
Aucun nouvel envoi, déploiement ou changement de forfait n'est déclenché par ce document.

## Paramètres proposés à valider
- 3 réservations par adresse e-mail par fenêtre fixe de 15 minutes.
- 20 réservations au total par jour UTC, tous demandeurs confondus.
- Doublon défini par adresse e-mail normalisée et message normalisé, bloqué pendant 24 heures.
Le plafond global protège aussi contre la rotation des adresses. Une attaque peut néanmoins épuiser ce plafond et bloquer des demandes légitimes; conserver le recours au téléphone.
Une réservation reste bloquée en cas d'échec fournisseur ou de résultat ambigu pour éviter une répétition d'envoi. Aucun renvoi automatique.
Les autres fonctions d'envoi ne sont pas incluses dans ce plafond. Ce n'est pas une garantie de respect du quota global du fournisseur.

## Activation ultérieure sur staging
La configuration publique est désactivée par défaut. Le serveur exige CONTACT_GUARD_MODE=enforce pour activer ces contrôles.
Prérequis : widget Turnstile, clé publique, secret privé, clé HMAC aléatoire d'au moins 32 caractères et liste exacte des domaines autorisés.
Variables serveur : TURNSTILE_SECRET_KEY, CONTACT_GUARD_HASH_KEY, CONTACT_GUARD_HOSTNAMES.
Ne jamais mettre les secrets dans le dépôt, les journaux ou une conversation.
La vérification serveur contrôle success, hostname et action=quote; elle ne fait pas confiance au seul champ du navigateur.
Échec de vérification/configuration/stockage : aucun envoi d'e-mail. Le honeypot et les validations existantes restent présents.
La requête de vérification ne transmet pas d'adresse IP au fournisseur; aucun contrôle IP n'est annoncé ni fondé sur X-Forwarded-For.

## Stockage et rétention
Les compteurs et réservations sont partagés via une transaction Firestore dans _contactGuard.
Les identifiants dérivés utilisent HMAC-SHA256. Aucun e-mail, message, jeton de challenge ou IP n'est stocké dans ces documents.
Les dates expiresAt gèrent la validité logique; elles ne suppriment pas physiquement les documents.
Avant activation, configurer et vérifier une purge TTL Firestore sur expiresAt, les droits du runtime et le refus d'accès côté client.
La règle catch-all actuelle refuse l'accès client, sous réserve de vérification de la règle réellement déployée.
Les données hachées restent à traiter comme des données pseudonymisées, pas comme anonymes.
Prévoir les coûts Firestore et la mise à jour de l'information de confidentialité avant activation.

## Recette restante
Configurer un widget staging puis relire la documentation actuelle du fournisseur; celle-ci n'a pas été accessible pendant cette préparation.
Ajuster la CSP staging pour script-src et frame-src challenges.cloudflare.com; vérifier la CSP effectivement servie.
Déployer un paquet contenant aussi contact-guard.js. Le workflow de déploiement ponctuel antérieur ne doit pas être réutilisé : il archive explicitement trois fichiers et vise un ancien commit.
Coordonner activation serveur et configuration publique; tant que la configuration est incomplète, un serveur activé refuse les soumissions.
Tester sur le vrai service les challenges valides/invalides/expirés, la concurrence multi-instance, les limites, les doublons et le parcours français/anglais.
Le challenge réel et Firestore sont simulés dans les tests automatisés : un succès local ne prouve pas leur fonctionnement en production.
Le quota d'e-mails doit être rétabli avant un essai de devis réussi et la réception de l'événement OpenAI.
Aucun passage en production sans validation explicite après recette.
