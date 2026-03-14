# Politique des artefacts de build versionnés — MoCyno

## Contexte

Le repo `mocyno2/` suit la **politique CAS B** (établie en R4, FIX 1) :

> Les artefacts de build (`public/admin/`, `public/mobile/`, `public/client/`) sont des
> artefacts versionnés, cohérents avec la configuration `firebase.json` (hosting public `public/`)
> et les configurations Vite (`outDir`). Ils doivent être commités en même temps que le code source
> qui les génère.

## Règle de discipline

| Situation | Action |
|---|---|
| Rebuild admin/mobile/client modifie des assets (hashes Rollup changent) | Inclure `public/{app}/` dans le **même commit** que le code source |
| Build échoue | Ne pas commiter les artefacts partiels |
| Artefacts modifiés sans rebuild volontaire (IDE, OS) | Ne pas commiter — vérifier `git diff` avant |

## Workflow typique

```bash
# Après modification du code source
pnpm --filter admin build            # → public/admin/ mis à jour
git add admin/src/ public/admin/     # Source + artefacts ensemble
git commit -m "feat(admin): ..."

# Idem pour mobile et client
pnpm --filter client build
git add apps/clients/src/ public/client/
git commit -m "feat(client): ..."
```

## Pourquoi versionner les artefacts ?

- `firebase.json` déclare `"public": "public"` → Firebase Hosting sert directement depuis `public/`
- Sans artefacts commités, un déploiement `firebase deploy --only hosting` sur une branche
  sans CI/CD ne déploie rien de fonctionnel
- Cohérent avec l'historique : `public/admin/` versionné depuis le début du projet

## Cas particulier : commit technique annexe

Si un round ne modifie pas le code source d'une app mais qu'un rebuild est nécessaire
(ex: dépendance mise à jour), le commit d'artefacts est classé **commit technique annexe**
et doit être explicitement noté dans le bilan du round.

## Hors scope de cette politique

- `node_modules/` → toujours ignoré (`.gitignore`)
- `dist/` des packages intermédiaires (`packages/types/dist/`) → versionné car consommé en workspace
- Fichiers `.env.*` → jamais commités (`.gitignore`)
