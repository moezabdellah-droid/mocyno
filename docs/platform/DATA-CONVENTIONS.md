# Mo'Cyno — Data Conventions

> A33 — 17 mars 2026

## Collections officiellement actives

| Collection | Surfaces | Source de vérité |
|---|---|---|
| `agents` | Admin, Mobile, Functions | `@mocyno/types → Agent` |
| `clients` | Admin, Functions, Portail client | `@mocyno/types → Client` |
| `sites` | Admin, Functions, Rules | `@mocyno/types → Site` |
| `planning` (missions) | Admin, Mobile, Portail client | `@mocyno/types → Mission` |
| `events` | Admin, Mobile | `@mocyno/types → Event` |
| `consignes` | Admin, Mobile, Portail client | `@mocyno/types → Consigne` |
| `reports` | Admin, Portail client | `@mocyno/types → Report` |
| `clientRequests` | Admin, Portail client | `@mocyno/types → ClientRequest` |
| `documents` | Admin, Portail client, Functions | `@mocyno/types → Document` |
| `documentDownloads` | Admin | `@mocyno/types → DocumentDownload` |
| `shiftSegments` | Portail client | `@mocyno/types → ShiftSegment` |
| `auditLogs` | Admin, Functions | `@mocyno/types → AuditLog` |

## Collections mortes ou orphelines

| Collection | Statut | Action |
|---|---|---|
| `documentReceipts` | ❌ Orpheline — zero usage code | Ignorer, ne pas créer de rule |

## Champs de référence

### Agent — champs critiques cross-surface

| Champ | Utilisé par | Obligatoire |
|---|---|---|
| `id` | Toutes surfaces | ✅ (= UID Firebase) |
| `firstName`, `lastName` | Admin, Mobile (agentName), Portail | ✅ |
| `email` | Auth, Admin | ✅ |
| `role` | Auth guard, Rules | ✅ (`admin` / `agent` / `manager` / `client`) |
| `status` | Admin filtre | ✅ (`active` / `inactive`) |
| `siteId` | Mobile events, planning | ⚠️ Optionnel terrain |
| `siteName` | Mobile affichage + events | ⚠️ Optionnel terrain |
| `isServiceRunning` | Mobile PTI | ⚠️ Runtime mobile |
| `location` | Mobile GPS tracking | ⚠️ Runtime mobile |
| `mustChangePassword` | Portail client | ⚠️ Provisioning |

### Event — types reconnus

| Type | Source | Description |
|---|---|---|
| `MAIN_COURANTE` | Mobile ReportsPage | Main courante standard |
| `INCIDENT` | Mobile ReportsPage | Incident terrain |
| `OBSERVATION` | Mobile ReportsPage | Observation terrain |
| `RDL_CHECKPOINT` | Mobile ScanPage | Checkpoint ronde |
| `SOS` | Mobile PtiService | Alerte SOS |
| `SERVICE_START` | Mobile PtiService | Prise de service |
| `SERVICE_STOP` | Mobile PtiService | Fin de service |

### Statuts reconnus par surface

| Map | Clés | Surface |
|---|---|---|
| `REQUEST_STATUS` | pending, in_progress, resolved, closed | Portail client |
| `REPORT_STATUS` | open, in_progress, resolved, closed | Portail client |
| `CONSIGNE_STATUS` | pending, approved, rejected | Portail client |
| Mission status | scheduled, completed, cancelled | Admin, Mobile |

## Conventions de nommage

- **Collections** : camelCase pluriel (`agents`, `clientRequests`)
- **Champs** : camelCase (`siteId`, `createdAt`, `authorEmail`)
- **Timestamps** : `createdAt`, `updatedAt` — Firestore `serverTimestamp()` ou ISO string
- **IDs** : Firebase UID pour auth-linked docs, auto-generated sinon
- **Storage paths** : `{category}/{userId}/{filename}` (ex: `report_photos/{uid}/{timestamp}.jpg`)

## Types partagés — source de vérité

**`@mocyno/types` (`packages/types/src/index.ts`)** est la source unique.

> ⚠️ Les fichiers `admin/src/types/models.ts` et `mobile/src/types/shared.ts` sont des copies legacy divergentes. Ils devraient être progressivement suppressés au profit de `@mocyno/types`.

## Champs legacy tolérés

| Champ | Raison | Statut |
|---|---|---|
| `dogIds` (string) | Champ historique agents → associe un chien | ✅ Actif, type string (pourrait être string[]) |
| `authorizedClients` (array) | Sites linkés à des clients | ✅ Actif via rules |
| `primaryClientId` (string) | Site → client principal | ✅ Actif via rules |
