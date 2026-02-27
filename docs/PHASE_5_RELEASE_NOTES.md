# PHASE 5 — Release Notes
**MO’CYNO Admin — Verrous Anti-Régression & Santé Système**  
Version: **5.0 / 5.1**  
Date: **2026-02-27**  
Timezone: **Europe/Paris**

---

## 0) Objectif de la Phase
Cette phase vise à garantir un socle **zéro-erreur** et **zéro faux-vert** pour le backoffice MO’CYNO, en mettant en place :
- un **contrat de données exécutable** (anti-régression),
- une **CI bloquante** (build + scan + audit data strict),
- un **système de diagnostic runtime** côté Admin (Health Panel),
- des **fonctions de maintenance** robustes (rebuild shifts / init stats_meta),
- une sécurité **RBAC dual-source** (claims JWT + Firestore agents/{uid}).

Résultat attendu : empêcher les régressions silencieuses (deploy, règles Firestore, imports Functions, modèle data) et rendre les incidents **diagnostiquables et réparables** sans scripts locaux.

---

## 1) Périmètre
### Inclus
- Contrat de données, audit strict et verrous CI
- Scan de champs interdits (legacy + snake_case)
- Maintenance Functions (Gen2 onCall) et sécurisation du déploiement
- Health Panel Admin (auto-diagnostic + actions correctives)
- Alignement RBAC (dual-source) côté rules + functions
- Documentation d’exploitation (runbook + addendum RBAC)

### Non inclus (hors phase)
- Implémentation complète du “réalisé / actual” (pointage, durationMinutesActual alimenté, rollups actual)
- Refonte complète de la pagination Firestore (cursor-based)
- Optimisations UI avancées (charts lourds, drill-down multi-filtres)
- Refactor complet du module Documents (create hors dataProvider) — signalé comme risque

---

## 2) Décisions produit / métier actées
- **Manager = FULL SCOPE** : un manager voit tout (clients/sites/missions/shifts/documents/stats).
- **Client portal** : doit accéder aux **shifts** + **exports/documents** liés à son clientId.
- **Relation Site↔Client canonique** : `sites.clientIds[]` (many-to-many).  
  `primaryClientId` / `authorizedClients` sont legacy et doivent être progressivement dépréciés.
- Fuseau métier : **Europe/Paris**.
- Arrondi des heures : **décimal exact** (minutes → heures via conversion).

---

## 3) Livrables (fichiers ajoutés / modifiés)
### 3.1 Contrat et audits
- `tools/contract.config.json`  
  Définit :
  - `forbiddenFields`
  - `invariantsCritical`
  - thresholds (ex: passRate requis, forbiddenFieldsAllowed)
- `tools/audit-firestore.js`  
  Mode `--strict` + exit codes :
  - **Exit 4** : mauvais projet / credentials / ping Firestore KO
  - **Exit 3** : champs interdits détectés au-delà du seuil
  - **Exit 2** : invariant critique sous seuil, invariant manquant, ou `checked=0`
- `tools/scan-forbidden-fields.js`  
  Scan repo pour détecter champs bannis (legacy + snake_case), ignore natif `node_modules`/binaires.

### 3.2 CI (GitHub Actions)
- `.github/workflows/ci.yml`  
  Jobs bloquants :
  - `build_admin` : typecheck + build strict React-Admin
  - `forbidden_fields` : scan champs interdits
  - `audit_data` : audit strict Firestore sur DB réelle
  - `functions_import_smoke` : `require(functions/index.js)` sans crash
  - `functions_exports_smoke` : vérifie exports obligatoires Functions

### 3.3 Docs exploitation / contrat
- `docs/ANTI_REGRESSION.md`  
  Runbook : comment lancer les audits, lire les rapports, dépanner CI.
- `docs/DATA_CONTRACT_ADDENDUM_RBAC.md`  
  RBAC & visibility scope (dual-source, ownership, scopes).
- `docs/PHASE_5_RELEASE_NOTES.md` (ce document)

### 3.4 Admin UI — Santé / diagnostic
- `admin/src/dashboard/components/SystemHealthPanel.tsx`  
  Affiche :
  - `projectId` runtime front
  - état `stats_meta/current`
  - probes `planning` et `shifts` (perPage=1)
  - erreurs Firestore lisibles
  - boutons maintenance callables (`adminRebuildShiftsFromPlanning`, `adminInitStatsMeta`)
- `admin/src/dashboard/DashboardShell.tsx`  
  Si `defaults == null` : affiche `SystemHealthPanel` (et non un écran vide).

### 3.5 Cloud Functions — Maintenance & safe deploy
- `functions/index.js`  
  Consolidation des callables maintenance en **Gen2 onCall** région `europe-west1`.  
  **Safe exports** : les imports lourds/optionnels (sharp/thumbnails) ne doivent jamais empêcher l’export des fonctions critiques.
- Functions maintenance (obligatoires) :
  - `adminInitStatsMeta`
  - `adminRebuildShiftsFromPlanning`
  - `rebuildShiftsForPlanning` (recommandée pour sync ciblée)
- RBAC Functions : `requireAdminOrManager` dual-source (claims OU agents/{uid}.role).

---

## 4) Fonctionnalités livrées
### 4.1 Anti-régression “data contract”
- Contrat exécutable centralisé (`contract.config.json`)
- Audit Firestore strict en CI
- Tests anti-mensonge :
  - interdit `checked=0` pour un invariant critique
  - interdit une “réussite” si invariant critique manquant du rapport
  - ping Firestore strict pour détecter mauvais projet

### 4.2 Anti-régression “code contract”
- Scan de champs interdits (legacy/snake_case)
- Blocage CI immédiat en cas d’introduction d’un champ banni

### 4.3 Zéro faux-vert Functions
- Jobs CI “smoke” :
  - import `functions/index.js` doit réussir
  - exports maintenance doivent exister
- Élimination des déploiements “silencieux” où les exports disparaissent après crash d’import.

### 4.4 Auto-diagnostic Admin (Health Panel)
- Panneau affiché lorsque `stats_meta/current` ou `shifts` ne sont pas visibles côté front.
- Donne la preuve runtime : projectId + compteurs + erreurs.
- Permet une remise en état : rebuild shifts + init meta en 1 clic.

### 4.5 RBAC dual-source (rules + functions)
- Les décisions RBAC sont documentées et alignées.
- Dual-source évite les blocages transitoires (claims non propagés).

---

## 5) Procédures de validation (preuve de réussite)
### 5.1 Preuves CI (doivent être vertes)
- `build_admin` ✅
- `forbidden_fields` ✅
- `audit_data --strict` ✅
- `functions_import_smoke` ✅
- `functions_exports_smoke` ✅

### 5.2 Preuves runtime Admin (prod)
Depuis Dashboard > Health Panel :
- `projectId` = attendu ✅
- `planning` : ≥ 1 doc ✅
- `shifts` : ≥ 1 doc ✅
- `stats_meta/current` existe avec `latestDayKey/latestMonthKey` ✅
- `adminRebuildShiftsFromPlanning` renvoie un résultat cohérent (`shiftsUpserted > 0` ou stable idempotent) ✅
- `adminInitStatsMeta` initialise / corrige `stats_meta/current` ✅

---

## 6) Rollback plan (sécurité)
En cas de problème sur les fonctions de maintenance :
1. Désactiver temporairement les boutons maintenance dans `SystemHealthPanel` (feature flag / condition UI).
2. Ne pas retirer les jobs CI (ils protègent le contrat data).
3. Réactiver après correction Functions (safe imports / exports).

---

## 7) Risques connus & dette technique (à suivre)
- **Actual (réalisé) non implémenté** : `durationMinutesActual` reste null tant que le pointage/saisie n’est pas livré.
- **Documents create hors dataProvider** : la création via Storage + callable bypasse les validations/hooks dataProvider (à formaliser/encadrer).
- **Pagination Firestore** : pagination actuelle sans curseur (cursor-based recommandé).
- **Legacy fields** : `authorizedClients` / `primaryClientId` doivent être dépréciés au profit de `clientIds`.

---

## 8) Prochaine phase recommandée
**Phase 6.1 — Actual now (réalisé)** :
- `ShiftEdit` (saisie durationMinutesActual + status done/cancelled)
- rollups stats_daily/stats_monthly planned vs actual
- invariants supplémentaires (actual cohérent)
- RBAC client/agent sur “réalisé” si nécessaire

---

## 9) Références
- Runbook : `docs/ANTI_REGRESSION.md`
- RBAC / scope : `docs/DATA_CONTRACT_ADDENDUM_RBAC.md`
- Contrat data : `DATA_CONTRACT.md`
- Config contrat exécutable : `tools/contract.config.json`
- Audit strict : `tools/audit-firestore.js`
