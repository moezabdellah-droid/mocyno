# DATA_CONTRACT — Addendum
## RBAC & Visibility Scope (v1.0)

> Cette section complète `DATA_CONTRACT.md` et constitue la référence **métier + technique** sur la visibilité des données selon les rôles.  
> Elle doit rester alignée avec :
> - `firestore.rules` (enforcement)
> - `functions/index.js` (RBAC server-side)
> - `admin/src/providers/authProvider.ts` (RBAC front)
> - `tools/contract.config.json` + `tools/audit-firestore.js` (anti-régression)

---

## 1) Rôles & principes

### 1.1 Rôles supportés
- **admin**
- **manager**
- **agent**
- **client**

### 1.2 Source RBAC (dual-source)
Un utilisateur est considéré **admin/manager** si **au moins une** des sources suivantes confirme le rôle :

1) **Custom Claims JWT**  
   `request.auth.token.role ∈ {"admin","manager"}`

2) **Firestore agents/{uid}**  
   `get(/databases/$(database)/documents/agents/$(request.auth.uid)).data.role ∈ {"admin","manager"}`

✅ Objectif : éviter les blocages transitoires (claims non propagés) tout en gardant un contrôle central.

---

## 2) Visibility scope — règles métier (obligatoires)

### 2.1 Manager : visibilité globale (FULL SCOPE)
**Un manager voit tout** (tous clients / sites / missions / shifts / documents / stats).

- Pas de périmètre régional ou “agence” en v1.
- Toute limitation future (ex: zones, entités) devra créer un nouveau concept de scope et être documentée ici.

### 2.2 Admin : visibilité globale (FULL SCOPE)
Un admin voit tout, et peut en plus :
- modifier rôles
- accéder aux données sensibles (PII) si une sous-collection /private existe

### 2.3 Agent : visibilité “own scope”
Un agent voit :
- **ses shifts** (agentId == request.auth.uid) + éventuellement les shifts ouverts si le produit le souhaite
- ses documents/ack/receipts si ces objets lui appartiennent

### 2.4 Client : visibilité “own scope + exports”
Un client voit :
- **ses shifts** (clientId == claim.clientId OU mapping authUid→clientId côté Firestore)
- **ses exports/rapports/documents** (documents liés à son clientId)
- ses sites (si `sites.clientIds` contient son clientId)

---

## 3) Mapping des ressources (résumé contractuel)

> Note : “read:list” = list/collection query, “read:get” = lecture doc unique.

| Resource (Firestore) | Admin | Manager | Agent | Client |
|---|---:|---:|---:|---:|
| `clients` | FULL | FULL | NO | OWN (son client doc) |
| `sites` (via `clientIds[]`) | FULL | FULL | NO (sauf besoin produit) | OWN (si clientId ∈ site.clientIds) |
| `planning` (SoT édition) | FULL | FULL | NO (sauf besoin produit) | NO |
| `shifts` (SoT analytique) | FULL | FULL | OWN (agentId==uid) | OWN (clientId==clientId) |
| `stats_meta` | READ | READ | NO | NO (ou READ si dashboard client) |
| `stats_daily` / `stats_monthly` | READ | READ | NO | NO (ou OWN si stats client) |
| `documents` | FULL | FULL | OWN/ASSIGNED (selon modèle) | OWN (liés à clientId) |
| `documentReceipts` | FULL | FULL | OWN (agentId==uid) | NO |
| `auditLogs` | READ | READ | NO | NO |
| `rateLimits` | NO | NO | NO | NO |

---

## 4) Relation canonique Site↔Client
**Canonical relation** : `sites.clientIds[]` est la seule source de rattachement client-site (primaryClientId/authorizedClients = legacy).

---

## 5) Changements futurs (process)
Tout changement de scope (ex: manager partiel) exige :
1) Mise à jour de cette section
2) Mise à jour `firestore.rules`
3) Mise à jour `tools/contract.config.json` (nouveaux invariants si besoin)
4) Mise à jour tests CI + audit (voir `docs/ANTI_REGRESSION.md`)
