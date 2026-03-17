# Mo'Cyno — Documentation Transverse Plateforme

> Dernière mise à jour : M23 — 17 mars 2026

---

## 1. Vue d'ensemble

La plateforme Mo'Cyno comprend quatre surfaces applicatives :

| Surface | URL | Rôles | Stack |
|---|---|---|---|
| Admin | `/admin/` | admin, manager | react-admin + MUI + Firebase |
| Portail Client | `/clients/` | client (via claims) | React + Firebase |
| Mobile Agent | `/mobile/` | agent, admin, manager | Ionic + Capacitor + Firebase |
| Cloud Functions | — | backend | Firebase Functions (Node.js) |

Les quatre surfaces partagent le même projet Firebase, la même base Firestore et les mêmes Storage rules.


---

## 2. Identité et rôles

### Admin / Manager
- Authentification Firebase Auth
- Rôle vérifié via `agents/{uid}.role` (Firestore)
- Accès : toutes les collections, via le `dataProvider` react-admin

### Client
- Authentification Firebase Auth
- Claims : `{ role: 'client', clientId: '<firestoreDocId>' }`
- Accès : limité à ses propres données via les Firestore rules (`request.auth.token.clientId`)

### Agent (Mobile)
- Authentification Firebase Auth
- Rôle vérifié via `agents/{uid}.role` (Firestore) — rôles : `agent`, `admin`, `manager`
- Consignes bornées au site : `agents/{uid}.siteId` (M21)
- Missions bornées par `assignedAgentIds` + fenêtre 7 jours (M22)

### Backend (Cloud Functions)
- Admin SDK (pas de vérification rules)
- Callables protégées par vérification `auth.token` côté serveur

---

## 3. Collections partagées

| Collection | Lecture Admin | Lecture Client | Écriture Client | Écriture Admin |
|---|---|---|---|---|
| `clients` | ✅ | Soi-même | ❌ | ✅ |
| `sites` | ✅ | Via `clientId`/`clientIds`/`authorizedClients` | ❌ | ✅ |
| `planning` (missions) | ✅ | ❌ (via `shiftSegments`) | ❌ | ✅ |
| `shiftSegments` | ✅ | Via `clientId` | ❌ | ✅ |
| `documents` | ✅ | Via `clientId` + `visibility.client` | ❌ | ✅ |
| `clientRequests` | ✅ | Via `clientId` | ✅ Création | ✅ |
| `reports` | ✅ | Via `clientId` | ✅ Création (`source=client`) | ✅ |
| `consignes` | ✅ | Via `targetId` (siteId) | ✅ Création (`source=client`) | ✅ |
| `agents` | ✅ | ❌ | ❌ | ✅ |
| `auditLogs` | ✅ (read-only) | ❌ | ❌ | ❌ (via Admin SDK) |
| `documentDownloads` | ✅ | Via `clientId` | ✅ (trace auto) | ✅ |

### Sous-collections partagées

| Sous-collection | Parent | Lecture Client | Écriture Client |
|---|---|---|---|
| `comments` | `clientRequests/{id}` | ✅ (auth) | ✅ (authorId == uid) |
| `comments` | `reports/{id}` | ✅ (auth) | ✅ (authorId == uid) |

---

## 4. Workflows critiques transverses

### Demande client
```
Client (Portail) → addDoc clientRequests (status=pending)
                    → visible Admin (clientRequests list)
                    → Admin change statut → client voit update
                    → Commentaires bidirectionnels via comments sub-collection
```

### Incident client
```
Client (Portail) → addDoc reports (status=open, source=client)
                    → visible Admin (reports list, filtré source=client)
                    → Admin traite → client voit statut mis à jour
                    → Pièce jointe optionnelle via clientUploads/
```

### Consigne client
```
Client (Portail) → addDoc consignes (status=pending, source=client)
                    → visible Admin (consignes list, filtré source=client)
                    → Admin valide/refuse → client voit statut (approved/rejected)
```

### Document client
```
Admin → upload document (visibility.client: true)
         → Client voit dans DocumentsPage
         → Click téléchargement → callable getDocumentSignedUrl → signed URL 15min
         → Trace dans documentDownloads
```

### Provisioning client
```
Admin (UI/callable) → createClient callable
                       → Firebase Auth user créé/mis à jour
                       → clients/{id} créé (mustChangePassword: true)
                       → Claims positionnés
                       → Site rattaché
                       → Client se connecte → change MDP → portail accessible
```

---

## 5. Audit trail

**Collection** : `auditLogs`

| Champ | Description |
|---|---|
| `action` | Type d'action (`createAgent`, `createClient`, `updateAgentPassword`, `generateMatricule`) |
| `actorUid` | UID de l'utilisateur ayant effectué l'action |
| `actorRole` | Rôle de l'acteur |
| `targetType` | Type de la cible (`agent`, `client`) |
| `targetId` | ID Firestore de la cible |
| `summary` | Résumé lisible de l'action |
| `createdAt` | Timestamp serveur |

**Accès** : lecture admin/manager uniquement (Firestore rules), écriture via Admin SDK (Cloud Functions).

**Visualisation** :
- Admin → Journal d'Audit (liste paginée)
- Admin → Dashboard (compteur 24h dernières actions sensibles)
- Admin → Supervision (10 dernières entrées avec détails)

---

## 6. Supervision (A28)

Le Dashboard Admin possède 3 blocs de supervision proactive :

| Bloc | Contenu |
|---|---|
| 🔍 À surveiller | Missions sans agent, consignes > 7j, incidents critiques, demandes urgentes, clients sans site |
| 📋 Conformité | Agents sans carte pro/matricule, SST expirée, clients sans site |
| ⚡ Alertes | 3 niveaux (🔴 urgent, 🟡 à traiter, 🔵 à surveiller) |

La page **Supervision** (🛡️) centralise tous ces signaux en lecture seule.

---

## 7. Déploiement prudent (PROD-GATE)

### Procédure standard
1. `git status --short` → vérifier working tree
2. Identifier fichiers in-scope vs hors-scope
3. Si hors-scope → `git stash push -m "hors-scope-<context>"` les fichiers concernés
4. Vérifier `firebase.json` → aucune modif hors périmètre
5. `firebase deploy --only hosting` (ou `firestore:rules` si modifiées)
6. `git stash pop` pour restaurer les fichiers stashés

### Commandes de déploiement
```bash
# Hosting seulement (admin + client)
firebase deploy --only hosting

# Rules Firestore seulement
firebase deploy --only firestore:rules

# Functions seulement
firebase deploy --only functions

# NE PAS déployer indexes sauf besoin explicite
# firebase deploy --only firestore:indexes
```

---

## 8. Limites connues

| Élément | Limite | Impact |
|---|---|---|
| Conformité agents | SST expirée seulement si `sstExpiresAt` renseigné | Pas de faux positif si champ vide |
| Compteurs Dashboard | Non temps réel — mis à jour au rechargement | Acceptable pour supervision |
| Comments sub-collection | Pas d'index composite | Fonctionne car queries simples (`orderBy createdAt`) |
| `documentReceipts` | 2 indexes orphelins nettoyés du fichier versionné (A29), pas supprimés en prod | Pas d'impact runtime |
| `auditLogs` | Écriture uniquement via Admin SDK | Aucune écriture directe client/admin |
| Notifications | Pas de push notifications dans ce round | Toasts uniquement |
