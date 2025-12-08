@echo off
echo 🚀 Déploiement du correctif Mo'cyno en cours...
echo.

echo 1. Ajout de TOUS les fichiers modifiés...
git add .

echo.
echo 2. Validation des changements (Commit)...
:: Cette commande peut échouer si vous avez déjà commité, ce n'est pas grave
git commit -m "fix: resolution crash CreateConsigne"

echo.
echo 3. Synchronisation avec GitHub (Récupération des changements distants)...
git pull --rebase origin main

echo.
echo 4. Envoi vers GitHub (Push)...
git push origin main

echo.
echo ✅ Opération terminée ! Le déploiement va démarrer automatiquement sur GitHub Actions.
echo Vous pouvez fermer cette fenêtre.
pause
