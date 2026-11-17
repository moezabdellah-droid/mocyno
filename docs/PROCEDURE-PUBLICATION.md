# Procédure de publication Hosting

Toute publication part d’un **commit identifié de main**, jamais d’un dossier local de travail non rattaché à ce commit. Un clone propre et détaché de ce commit peut servir à préparer la publication.

Cette procédure est documentaire. Son existence n’autorise aucune exécution ni aucune mise en ligne.

## Préparer

1. Relever le SHA complet du commit de main, la version live, la release et la version de retour arrière. Vérifier que la version live correspond à la référence attendue ; arrêter sinon.
2. Utiliser les fichiers de `public/` **et** la configuration `hosting` de `firebase.json` pris sur ce même commit. Respecter la liste `ignore`. Ne pas recopier la configuration d’une ancienne version à la place de celle du dépôt.
3. Comparer les règles Hosting : redirections dans l’ordre, réécritures, en-têtes, cleanUrls et trailingSlash. Arrêter devant toute différence non prévue.
4. Garder les workflows de déploiement automatique et de blog mensuel désactivés. Ne déployer ni Functions, ni Firestore, ni Storage ; ne modifier ni `/api/contact` ni Cloud Run `contactform`.
5. Relever les conversions publicitaires de référence avant publication.

## Prévisualiser, puis faire valider

Créer une version Hosting sur un canal de prévisualisation de la cible `prodsite`, projet/site `mocyno`. Noter le canal, son URL, la version et le nombre de fichiers.

Contrôler les pages de référence de [ETAT-PRODUCTION.md](ETAT-PRODUCTION.md) : pages en 200, redirections en 301 vers les bonnes destinations, une seule balise robots `noindex, follow` sur Saint-Tropez et absence de cette page des sitemaps. Vérifier Turnstile, le chargement GTM et du consentement sur les deux pages de devis, et l’absence de nouvelle erreur JavaScript.

Ne soumettre aucun formulaire sans autorisation explicite. Fournir les résultats et le lien de prévisualisation à Moëz. **Attendre son accord écrit après prévisualisation.** Si un contrôle échoue, arrêter et expliquer ; aucune correction improvisée.

## Mettre en ligne après accord

Créer la release live de la **version exacte validée**, sans reconstruire les fichiers. Vérifier le pointeur live puis refaire les contrôles HTTP sur mocyno.com. Consigner l’heure UTC et Europe/Paris.

Effectuer les devis tests réels après mise en ligne, avec un marqueur « TEST — ne pas traiter », uniquement par Moëz ou sur son autorisation explicite. Vérifier confirmation, Turnstile et réception des e-mails. Contrôler séparément la réception des événements et l’attribution publicitaire Google Ads/OpenAI Ads ; une visite directe ne garantit pas une conversion attribuée. Accepter les cookies pour le scénario de mesure consenti, sans cliquer d’annonce ni fabriquer d’identifiant publicitaire.

## Retour arrière — commande préparée, non exécutée

Un retour arrière est une mise en ligne : **accord écrit de Moëz obligatoire avant exécution**. Pour la publication du 16/11, la version précédente est `sites/mocyno/versions/cc03f589f520463c`. Vérifier qu’elle existe encore et est FINALIZED. Le script ci-dessous vérifie aussi que live pointe encore sur la version du 16/11 ; arrêter si l’état a changé.

Le jeton est obtenu à l’exécution et reste en mémoire ; ne jamais afficher ou enregistrer sa valeur. Ne jamais inclure de mot de passe, clé ou jeton dans un fichier, une issue ou le dépôt.

```powershell
# A EXECUTER UNIQUEMENT APRES ACCORD ECRIT EXPLICITE DE MOEZ.
& {
    $ErrorActionPreference = "Stop"
    if ((Read-Host "Accord ecrit recu ? Saisir RETOUR-ARRIERE") -cne "RETOUR-ARRIERE") {
        throw "Arret : retour arriere non confirme."
    }
    try {
        $jetonRetour = gcloud auth print-access-token
        if ($LASTEXITCODE -ne 0 -or -not $jetonRetour) {
            throw "Impossible d'obtenir le jeton."
        }
        $entetesRetour = @{
            Authorization = "Bearer $($jetonRetour.Trim())"
            "x-goog-user-project" = "mocyno"
        }
        $apiRetour = "https://firebasehosting.googleapis.com/v1beta1"
        $cibleRetour = "sites/mocyno/versions/cc03f589f520463c"
        $liveRetour = "$apiRetour/sites/mocyno/channels/live/releases"
        $avantRetour = Invoke-RestMethod -Uri "${liveRetour}?pageSize=1" -Headers $entetesRetour
        if ($avantRetour.releases[0].version.name -ne "sites/mocyno/versions/8e1201990b8f7ed3") {
            throw "Arret : live a change."
        }
        $versionRetour = Invoke-RestMethod -Uri "$apiRetour/$cibleRetour" -Headers $entetesRetour
        if ($versionRetour.status -ne "FINALIZED") {
            throw "Arret : version de retour absente ou non FINALIZED."
        }
        $urlRetour = $liveRetour + "?versionName=" + [uri]::EscapeDataString($cibleRetour)
        $corpsRetour = @{ message = "Retour arriere autorise par Moez - publication du 16/11/2026" } |
            ConvertTo-Json -Compress
        $releaseRetour = Invoke-RestMethod -Uri $urlRetour -Headers $entetesRetour -Method Post -ContentType "application/json" -Body $corpsRetour
        $apresRetour = Invoke-RestMethod -Uri "${liveRetour}?pageSize=1" -Headers $entetesRetour
        if ($apresRetour.releases[0].version.name -ne $cibleRetour) {
            throw "Arret : controle live non conforme apres retour."
        }
        $releaseRetour | Select-Object name, releaseTime
    }
    finally {
        Remove-Variable jetonRetour, entetesRetour -ErrorAction SilentlyContinue
    }
}
```

Après un retour : refaire les contrôles HTTP et devis autorisés, puis consigner la nouvelle release et son heure. Aucun retour automatique en cas d’erreur.

Référence API : [Firebase — création d’une release de canal](https://firebase.google.com/docs/reference/hosting/rest/v1beta1/sites.channels.releases/create).

## Traçabilité à chaque publication

Ouvrir une issue « Publication du JJ/MM/AAAA » avec commit de main, version Firebase, release, canal et URL de prévisualisation, accord reçu, heure, méthode, résultats, limites et version de retour arrière. Ne jamais consigner de secret.

Référence historique : [issue #17 — publication du 16/11/2026](https://github.com/moezabdellah-droid/mocyno/issues/17). La sauvegarde GitHub, la rétention Firebase, les protections de branche et de tags et la visibilité du dépôt sont des étapes distinctes ; tout réglage de compte ou de dépôt attend l’accord écrit de Moëz après présentation exacte du changement.
