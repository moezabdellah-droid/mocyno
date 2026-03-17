# Mo'Cyno — QA Baseline

> A32 — 17 mars 2026

## Scripts existants par surface

| Surface | build | lint | test | notes |
|---|---|---|---|---|
| Root | — | — | `echo "Error: no test"` (noop) | `predeploy` = SEO validation (Python) |
| Admin | `vite build` | `eslint .` | `vitest` (configured, 0 test files) | `build:check` = tsc + build |
| Clients | `tsc -b && vite build` | — | — | Aucun lint ni test |
| Mobile | `tsc -b && vite build` | `eslint .` | — | `test:e2e` = Cypress (non installé) |
| Functions | — | `echo "skip lint"` (noop) | — | `firebase-functions-test` en devDep mais 0 tests |
| Types | `tsc` | — | — | Shared package |

## Tests existants

**Zéro test custom** dans tout le repo. Seuls des tests dans `node_modules/`.

## CI existante

| Workflow | Trigger | Jobs |
|---|---|---|
| `deploy.yml` | push/PR main | tsc admin/mobile, lint admin/mobile, build admin, deploy hosting |
| `seo-validation.yml` | — | SEO tags Python |
| `blog-automation.yml` | — | Blog |

### Problèmes CI
- Clients build absent du pipeline
- Functions check absent
- Job test utilise pnpm 10, job deploy utilise pnpm 9 (incohérence)
- Pas de tests exécutés

## Zones critiques non couvertes

| Zone | Risque | Priorité test |
|---|---|---|
| `statusMap.ts` — label/color resolvers | Affichage cassé si clé inconnue | 🔴 |
| `csvExport.ts` — formatters dates/timestamps | Exports illisibles | 🔴 |
| `planningDurations.ts` — cross-day shift logic | Calculs heures faux | 🔴 |
| `planningUtils.ts` — night hours/holidays | Paie incorrecte | 🟡 |
| `App.tsx` client — deep link routing | Routes non résolues | 🟡 |
| `createClient/createAgent` functions — input validation | Données incohérentes | 🟡 |

## Gates manuels existants

- PROD-GATE hosting : procédure documentée (stash/deploy/pop)
- Builds manuels avant deploy
- Recette transverse T0 (manuelle, one-shot)
- Aucun gate automatisé
