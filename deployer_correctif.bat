@echo off
echo 🚀 Déploiement du correctif Mo'cyno en cours...
echo.

echo 1. Ajout de TOUS les fichiers modifiés...
git add .

echo.
echo 2. Validation des changements (Commit)...
git commit -m "fix: resolution crash CreateConsigne"

echo.
echo 3. Envoi vers GitHub (Push) pour déclencher le déploiement...
git push

echo.
echo ✅ Opération terminée ! Le déploiement va démarrer automatiquement sur GitHub Actions.
echo Vous pouvez fermer cette fenêtre.
pause
