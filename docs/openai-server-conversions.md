# MO’CYNO — demandes acceptées, mesure serveur seule

État au 31 octobre 2026 : source contactForm et frontend serveur seul déployés dans mocyno-staging ; production inchangée. Après accord explicite, le correctif de retrait est publié dans la version Hosting `f968749819401b64` et les boutons FR/EN sont vérifiés dans le navigateur, sur ordinateur et mobile. Anti-spam enforce et simulation active conservés. Les contrôles négatifs passent encore via l’aperçu public. Aucun événement réel envoyé à OpenAI, aucun e-mail réel demandé. La clé CAPI reste à configurer avant tout test positif.

## Résultat attendu

Une notification commerciale explicitement acceptée par Resend produit au plus un appel CAPI, avec l’identifiant réservé côté serveur et la date de cette acceptation. L’accusé au visiteur est indépendant. Aucune conversion pour une validation refusée, un honeypot, une preuve Turnstile absente/refusée, une limite, un doublon serveur, une simulation ou une réponse Resend ambiguë.

Le formulaire conserve le POST natif et les redirections FR/EN. Le JavaScript du navigateur transmet uniquement le consentement distinct et une référence `oppref` réellement observée après accord, conservée pour la session de l’onglet. Le refus et le retrait effacent cette référence. Sans JavaScript, aucun consentement publicitaire n’est supposé et le formulaire reste utilisable.

## Architecture et données

- Un seul canal : API Conversions, après acceptation explicite Resend.
- Aucun SDK/Pixel OpenAI chargé par le parcours actif. `consent-ga.js` charge seulement `openai-attribution.js`, servi par le site.
- Données externes : `id`, `type: lead_created`, `timestamp_ms`, `action_source: web`, `source_url` issue d’une liste de pages autorisées, `opt_out: true`, `data: { type: customer_action }`, et `oppref` original si disponible.
- Aucun objet `user`, coordonnées en clair/hachées, message, IP, user-agent, valeur commerciale ou vente inventée.
- Appel unique, sans relance automatique, limité à deux secondes. Une indisponibilité d’OpenAI ne relance aucun e-mail et ne transforme pas l’acceptation commerciale en échec. La mesure peut être perdue lors d’une panne ; elle n’est pas exhaustive.
- L’identifiant JSON facultatif est identique à celui de l’événement. Le parcours natif n’a pas besoin de ce reçu.

## Paramètres à préparer

`OPENAI_CONVERSION_MODE` est désactivé par défaut. `validate` utilise le paramètre officiel `validate_only: true` et n’enregistre pas l’événement. `live` enregistre les événements autorisés. La validation seule ne prouve pas la réception dans le flux d’événements.

`OPENAI_CONVERSIONS_API_KEY` doit être une clé de l’API Conversions du même compte, conservée et montée depuis Secret Manager. Elle ne doit jamais apparaître dans le dépôt, le navigateur ou les journaux. Aucun secret OpenAI n’existe dans les deux projets lors de l’inventaire. Ne pas confondre cette clé avec une clé Advertiser API.

## Projection de la production

`scripts/prepare-openai-live-source.cjs` modifie uniquement le gestionnaire contact dans l’archive réellement déployée. Les octets avant et après ce gestionnaire sont conservés. Le module anti-spam est copié sans modification. Le montage Resend, les destinataires, le compte d’exécution et les paramètres doivent être conservés par le déploiement ciblé.

Le gestionnaire préparé dans `functions/index.js` porte la même logique de mesure. Il ne constitue pas une reproduction complète des différences de production : ne pas déployer l’ensemble des fonctions depuis cette branche. Le chemin habituel de publication et la conservation de la protection déployée séparément doivent encore être réconciliés avant toute publication production.

La configuration publique du widget dans cette branche est désormais recopiée à l’identique de la production protégée, au lieu du brouillon désactivé. Cela prépare la conservation du widget lors d’un futur Hosting ; aucune publication production n’est effectuée. Le déploiement de fonction doit toujours utiliser la projection vérifiée et conserver explicitement l’environnement, les secrets montés et le compte d’exécution, pas un déploiement global depuis main.

Le test réel a révélé que les URL HTML canoniques sans extension sont actuellement servies avec `Cache-Control: max-age=3600` malgré la règle portant sur `*.html`. Une page déjà ouverte peut donc conserver l’ancien chargeur. Les contrôles navigateur du correctif utilisent une URL de recette fraîche (`qa=consent-2`, sans référence publicitaire). La proposition production devra inclure une règle de revalidation des routes HTML canoniques et ses tests ; ne pas supposer que versionner le fichier JavaScript invalide le HTML déjà en cache.

Le script `openai-measurement.js` historique reste inactif ; il ne doit pas être réintroduit dans les pages ou le chargeur de consentement. La QA active couvre l’architecture serveur.

## Validation locale

34 tests ciblés réussis : API et consentement, six vrais HTML de formulaires, projection du gestionnaire de production, protections et interface anti-spam. Le test de projection utilise soit la vraie source téléchargée indiquée par `MOCYNO_PRODUCTION_SOURCE`, soit un extrait de référence sans secrets conservé pour la CI.

Un paquet staging distinct conserve en plus la simulation sans e-mail, refuse toute exécution hors `mocyno-staging` et limite les deux destinataires de test à `moezabdellah@mocyno.com`. Huit scénarios locaux et les contrôles de destinataires/empreinte anti-spam y ont été vérifiés.

Ces tests locaux utilisent des prestataires et bases simulés. Après accord explicite, le paquet staging a été publié : l’archive relue correspond exactement au paquet approuvé, la fonction est ACTIVE et la configuration est conservée. Les contrôles réels invalide/honeypot/preuve absente passent en direct et via l’aperçu public. Cela ne confirme pas encore le parcours positif ni une réception OpenAI.

## Recette et approbations restantes

1. Fait : source contactForm staging publiée et vérifiée, enforce et simulation conservés. Nouvelle génération source `1793431050173846`. Aucun e-mail ni événement réel pour cette étape.
2. Publier ensuite un aperçu Hosting staging correspondant au consentement serveur seul, avec routage vers mocyno-staging. Renouveler le canal autorisé dans Turnstile plutôt que supposer son ancienne validité. Cette publication reste à préparer et vérifier.
3. Configurer une clé de conversions dans Secret Manager staging, puis vérifier l’API en mode validation sans enregistrer de conversion.
4. Avant un vrai test commercial : faire autoriser exactement deux e-mails vers `moezabdellah@mocyno.com` (notification et accusé), ainsi que le basculement de la recette hors simulation. Ne pas utiliser les trois destinataires réels de production.
5. Pour confirmer une réception OpenAI, faire autoriser un événement de test enregistré. Aucun mécanisme documenté ne permet de considérer le debug Pixel ou validate_only comme un flux de test enregistré séparé. Ne pas polluer les conversions réelles avec des événements synthétiques non approuvés.
6. Présenter les différences finales et le retour arrière protégé avant toute approbation de production. Association de campagne séparée, sans changer les enchères ou budgets.

## Versions protégées relevées

- Hosting production : `projects/mocyno/sites/mocyno/versions/d71977f05c29c59c`.
- Fonction production : bucket `gcf-v2-sources-962385123794-europe-west1`, objet `contactForm/function-source.zip`, génération `1793391751429407`.
- Fonction staging précédente : bucket `gcf-v2-sources-922849429001-europe-west1`, même objet, génération `1793387958158680`.

Un retour arrière de production devra restaurer la version Hosting protégée et cette source fonction protégée, en gardant les montages de secrets, le compte d’exécution et enforce. Ne pas revenir à main ou à un état antérieur à la protection. Revalider les références juste avant publication ; elles ne garantissent pas l’absence de modification concurrente.

Références officielles consultées : https://developers.openai.com/ads/conversions-api et https://help.openai.com/en/articles/20001604-troubleshooting-conversion-tracking-for-chatgpt-ads.
