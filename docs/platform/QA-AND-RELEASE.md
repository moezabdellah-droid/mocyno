# Mo'Cyno — QA & Release Discipline

> A32 — 17 mars 2026

## Scripts QA locaux

Exécutables depuis la racine du repo :

```bash
# Vérifier une surface
pnpm qa:types      # Build shared types
pnpm qa:admin      # Tests (vitest) + build admin
pnpm qa:client     # tsc + build client portal
pnpm qa:mobile     # tsc + build mobile
pnpm qa:functions  # Load check functions

# Vérifier toute la plateforme
pnpm qa:platform   # Enchaîne tous les gates
```

## Ordre de vérification conseillé

1. `pnpm qa:types` — toujours en premier (dépendance partagée)
2. Surface modifiée : `qa:admin`, `qa:client`, `qa:mobile`, ou `qa:functions`
3. Si doute transverse → `pnpm qa:platform`

## Quand lancer quel build

| Situation | Commande |
|---|---|
| Avant un commit | `pnpm qa:<surface>` pour la surface modifiée |
| Avant un merge/PR | `pnpm qa:platform` |
| Avant un déploiement | `pnpm qa:platform` + PROD-GATE |
| Recette transverse | `pnpm qa:platform` + vérification visuelle |

## PROD-GATE — Procédure de déploiement

### Quand déclencher un PROD-GATE
- Après validation de tous les builds (`qa:platform`)
- Quand un round est terminé et validé
- Avant chaque `firebase deploy`

### Étapes
1. `git status --short` — vérifier working tree
2. `git diff --name-only` — identifier fichiers modifiés
3. Vérifier que **seuls** les artefacts du round sont présents dans `public/`
4. Si hors-scope détecté → `git stash push -m "hors-scope-pre-deploy" -- <fichiers>`
5. `firebase deploy --only hosting`
6. Si stash utilisé → `git stash pop`
7. Vérification live :
   - `curl -f https://mocyno.web.app/admin`
   - `curl -f https://mocyno.web.app/clients/`
   - `curl -f https://mocyno.web.app/mobile/`

### Fichiers typiquement hors-scope
- `firebase.json` (si modifié hors round)
- `public/en/**` ou `public/fr/**` (vitrine)
- `packages/types/dist/` (rebuild automatique)

## CI (GitHub Actions)

### Workflow : `.github/workflows/deploy.yml`

| Job | Trigger | Checks |
|---|---|---|
| `quality` | push + PR | types build, lint admin/mobile, tests admin, build admin/client/mobile, functions load |
| `deploy` | push main (after quality) | build all + firebase deploy + smoke tests |

### Configuration requise (Secrets GitHub)
- `VITE_FIREBASE_*` — config Firebase pour les builds
- `FIREBASE_SA` — service account pour le déploiement

## Checks manuels (non automatisables)

| Check | Quand | Responsable |
|---|---|---|
| Recette transverse (T0) | Après un ensemble de corrections | Manuel |
| Vérification visuelle UI | Après modifications écrans | Manuel |
| Test login/auth réel | Après modification auth/rules | Manuel |
| Vérification Firestore rules | Après modification rules | Manuel |
| Test mobile terrain (device) | Après modifications mobile | Manuel |

## Tests unitaires

| Surface | Framework | Fichiers | Emplacement |
|---|---|---|---|
| Admin | Vitest | 4 | `admin/src/utils/*.test.ts` |
| Client | — | 0 | — |
| Mobile | — | 0 | — |
| Functions | — | 0 | — |

### Zones couvertes
- Planning : durées, shifts cross-jour, heures de nuit, jours fériés
- Status : résolution labels/couleurs, clés inconnues
- CSV : formatage dates, timestamps Firestore, valeurs nulles

### Priorités pour les prochains tests
1. Functions `createClient` / `createAgent` input validation
2. Client portal deep link routing
3. Mobile report type validation
