# Anti-Régression MO'CYNO — Runbook Technique

Ce document décrit comment exécuter les tests d'intégrité et comment dépanner le système en cas d'échec de la CI.

### Références Documentaires
- **Fonctionnalités & Historique** : [PHASE_5_RELEASE_NOTES.md](PHASE_5_RELEASE_NOTES.md)
- **Contrat de Données (Global)** : [../DATA_CONTRACT.md](../DATA_CONTRACT.md)
- **RBAC & Visibility Scope** : [DATA_CONTRACT_ADDENDUM_RBAC.md](DATA_CONTRACT_ADDENDUM_RBAC.md)

---

## 1. Exécution des Audits

### 1.1 Audit Data (Firestore)
Vérifie l'intégrité des documents par rapport au contrat défini dans `tools/contract.config.json`.
```bash
# Mode Informatif (Rapport seul)
npm run audit:data

# Mode Strict (Bloquant pour la CI)
npm run audit:data:strict
```

### 1.2 Scan Forbidden Fields
Vérifie que des champs obsolètes ou mal nommés (snake_case) ne sont pas introduits dans le code.
```bash
npm run lint:forbidden
```

## 2. Dépannage (CI Failures)

### Si `audit_data` échoue :
1. Consultez le fichier `audit_report.md` généré localement ou les logs CI.
2. Identifiez l'ID du document en faute.
3. Si la donnée est corrompue en base, utilisez les outils de maintenance :
    - Dashboard Admin > **Health Panel** > **Rebuild shifts depuis planning**
    - Dashboard Admin > **Health Panel** > **Init stats_meta/current**
4. Corrigez le code (Front ou Cloud Function) responsable de l'insertion de données non conformes.

### Si `forbidden_fields` échoue :
1. Les logs indiquent le fichier et la ligne contenant le mot-clé banni (ex: `billingClientId`).
2. Remplacez par le nom canonique (ex: `clientIds`, `siteId`, `clientId` en camelCase).

## 3. Maintenance du Contrat
Toute modification des règles d'intégrité doit se faire dans :
1. `DATA_CONTRACT.md` (Spécification métier globale)
2. `docs/DATA_CONTRACT_ADDENDUM_RBAC.md` (Spécification RBAC/Scope)
3. `tools/contract.config.json` (Configuration technique des seuils et champs bannis)
4. `tools/audit-firestore.js` (Logique de validation des invariants)
