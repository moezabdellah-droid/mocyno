# Mo'Cyno — Housekeeping Baseline

> A33 — 17 mars 2026

## Reliquats structurels confirmés

### 1. Type duplication (CRITIQUE)

| Source | Fichier | Lignes | Statut |
|---|---|---|---|
| **Source de vérité** | `packages/types/src/index.ts` | 168 | ✅ Active, workspace shared |
| Copie locale admin | `admin/src/types/models.ts` | 162 | ⚠️ Divergent — manque `mustChangePassword`, `siteId`, `siteName`, `location`, rôle `client` |
| Copie locale mobile | `mobile/src/types/shared.ts` | 158 | ⚠️ Divergent — manque `mustChangePassword`, `siteId`, `siteName`, `location`, rôle `client` |

**Impact** : toute modification du type shared doit être dupliquée manuellement → risque de dérive.  
**Action** : les copies locales devraient être supprimées si `@mocyno/types` est importé partout.

### 2. Types manquants dans `@mocyno/types`

| Collection Firestore | Interface manquante | Utilisé par |
|---|---|---|
| `reports` | `Report` | Admin, Client portal |
| `clientRequests` | `ClientRequest` | Admin, Client portal |
| `documents` | `Document` | Admin, Client portal |
| `clients` | `Client` | Admin, Functions |
| `shiftSegments` | `ShiftSegment` | Client portal |
| `auditLogs` | `AuditLog` | Admin |
| `documentDownloads` | `DocumentDownload` | Admin |

### 3. Champs divergents Event

Le type `Event` shared manque les champs ajoutés en A31 :
- `authorId` — utilisé par mobile + admin
- `agentName` — ajouté A31
- `siteId` / `siteName` — ajouté A31
- `photoPath` — utilisé par mobile reports
- `priority` — SOS events
- `location` — GPS events
- `content` — scan checkpoint payload

### 4. Champs legacy / compatibilité

| Champ | Collection | Statut |
|---|---|---|
| `dogIds` (string) | Agent | ✅ Actif (admin Agents + badge PDF). Type discutable (string vs string[]) |
| `authorizedClients` | Site (rules) | ✅ Actif — utilisé dans Firestore rules + client portal queries |
| `clientIds` | Site (rules) | ✅ Actif — utilisé dans rules |
| `primaryClientId` | Site (rules) | ✅ Actif — utilisé dans rules |
| `clientId` | Site (rules) | ✅ Actif — utilisé dans rules |
| `documentReceipts` | Collection | ❌ Orphelin — zero code usage, collection potentiellement vide |

### 5. Site type incomplet

`Site` dans `@mocyno/types` est minimal (7 champs) mais Firestore rules utilisent `clientId`, `clientIds`, `authorizedClients`, `primaryClientId` sur les documents sites. Le type ne reflète pas cette réalité.

### 6. Artefacts générés suivis

- `packages/types/dist/index.d.ts` — rebuild automatique après chaque modification types, modifié dans working tree
- Bundles `public/{admin,clients,mobile}/` — régénérés à chaque build, non systématiquement commités

### 7. Indexes

7 indexes dans `firestore.indexes.json` — tous actifs et requis par les queries client portal. Aucun orphelin.
