# Portail Client — Guide d'exploitation et support

> Dernière mise à jour : R13, 15 mars 2026

---

## Architecture d'identité client

### Modèle cible
- **Claims Firebase Auth** : `{ role: 'client', clientId: '<firestore-doc-id>' }`
- **Collection Firestore** : `clients/{clientId}` (ID ≠ Auth UID)
- **Champs requis** : `authUid`, `email`, `firstName`, `lastName`, `role`, `status`, `mustChangePassword`, `portalAccess`

### Prérequis d'un client valide
1. Compte Firebase Auth existant avec mot de passe
2. Custom Claims positionnés : `role: 'client'`, `clientId: '<id>'`
3. Document `clients/{clientId}` existant avec `portalAccess: true`
4. Au moins 1 site rattaché via `clientIds` ou `authorizedClients` ou `primaryClientId` ou `clientId`
5. `portalAccess` doit être **explicitement `true`** — si absent ou `false`, le portail refuse l'accès
6. `mustChangePassword` peut être `true` lors du premier accès : le client est alors redirigé vers le changement de mot de passe avant de voir le portail

---

## Provisioning d'un client

### Via Admin (UI)
Admin > Clients > Créer → Formulaire : Prénom, Nom, Email, MDP provisoire, Société, Site

### Via Callable
```
callable: createClient (region: europe-west1)
payload: { email, password, firstName, lastName, siteId, companyName? }
```

### Séquence backend
1. Vérification site existant
2. Création/mise à jour Auth user
3. Création `clients/{clientId}` avec `mustChangePassword: true`
4. Positionnement custom claims
5. Rattachement au site (`clientIds` + `authorizedClients`)

### Logs attendus
```
[createClient] Called by <adminUid>
[createClient] Success: email → clients/<id>, site=<siteId>, new/existing auth user
```

---

## Flux premier login

1. Client se connecte avec email + MDP provisoire sur `/clients/`
2. `useClientData` lit les claims → charge `clients/{clientId}`
3. Si `mustChangePassword === true` → redirigé vers `ChangePasswordPage`
4. Client définit un nouveau MDP (min 8 car)
5. `updatePassword(Auth)` → `clearFlag(Firestore)` → reload
6. Portail complet affiché

### Erreurs possibles
| Symptôme | Cause probable | Action |
|---|---|---|
| "Email ou mot de passe incorrect" | Mauvais identifiants | Vérifier email/MDP |
| "Trop de tentatives" | Rate limit Firebase Auth | Attendre quelques minutes |
| "Ce compte a été désactivé" | Compte Auth disabled | Réactiver dans Firebase Auth |
| "Accès refusé" | Claims manquants/mauvais | Vérifier claims dans Firebase Auth |
| "Profil client introuvable" | Document `clients/{id}` absent | Vérifier Firestore |
| "Votre session a expiré" | requires-recent-login | Se reconnecter |

---

## Dépannage

### Planning vide
1. Vérifier que des `shiftSegments` existent avec `clientId == <clientId>`
2. Vérifier l'index composite : `shiftSegments / COLLECTION_GROUP / clientId ASC + startTimestamp DESC`
3. L'index doit être **actif (Activé)** dans Firebase Console — un index en cours de construction (building) ne suffit pas
4. Vérifier les rules Firestore autorisent la lecture

### Consignes vides
1. Les consignes sont liées par `targetId` (= siteId du site cible)
2. Le portail récupère d'abord les sites du client (4 queries), puis cherche les consignes via `where('targetId', 'in', [siteIds])` + `orderBy('createdAt', 'desc')`
3. Vérifier que le client a au moins un site rattaché
4. Vérifier que des consignes existent avec `targetId` = un des siteIds du client
5. Index requis : `consignes / targetId + createdAt DESC` (COLLECTION)

### Document non téléchargeable
1. Vérifier le document existe dans `documents/` avec `clientId` correct et `visibility.client: true`
2. Vérifier que `storagePath` / `filePath` / `path` pointe vers un fichier existant dans Storage
3. Le téléchargement passe par la callable `getDocumentSignedUrl` (pas de lecture directe Storage par le client)
4. La function vérifie : auth, role client, ownership (`clientId`), visibility, existence fichier Storage
5. Logs functions : `[getDocumentSignedUrl] Success` ou `Access denied` / `Not found`

### Badge agent non trouvé
1. Le fichier doit être dans `badges/{agentId}.pdf` ou `badges/{agentId}_badge.pdf` ou `badges/{agentId}_carte.pdf`
2. Un `shiftSegment` doit lier `clientId + agentId`
3. Logs functions : `[getAgentBadgeSignedUrl] Success` ou `Access denied`

---

## Indexes Firestore critiques

| Collection | Champs | Scope | Utilisé par |
|---|---|---|---|
| `shiftSegments` | `clientId ASC + startTimestamp DESC` | COLLECTION_GROUP | PlanningPage |
| `documents` | `clientId + visibility.client + createdAt` | COLLECTION | DocumentsPage |
| `clientRequests` | `clientId + createdAt` | COLLECTION | RequestsPage |
| `consignes` | `targetId + createdAt DESC` | COLLECTION | ConsignesPage (via multi-site) |

---

## Signed URLs

- Générées par Cloud Functions callables
- Expiration : **15 minutes**
- Vérifications : auth, role, ownership, visibility
- Pas de stockage côté client — URL régénérée à chaque clic

---

## Redirections

| Source | Destination | Type |
|---|---|---|
| `/client` | `/clients/` | 301 permanent |
| `/client/**` | `/clients/` | 301 permanent |

Note : les sous-chemins `/client/xxx` redirigent tous vers `/clients/` (pas de conservation du path).

Configuré dans `firebase.json` > `hosting.redirects`

---

## Admin Clients

**Resource react-admin** : `clients` → collection Firestore `clients`

### Vues disponibles
- **Liste** : Prénom, Nom, Email, Société, Statut, Accès portail, MDP à changer, Date
- **Show** : Client ID, Auth UID, rôle, site(s), portalAccess, provisionedAt
- **Create** : appelle `createClient` callable

### Diagnostic rapide
1. Client ne peut pas se connecter → vérifier Auth user dans Firebase Console
2. Client bloqué sur "changer MDP" → vérifier `mustChangePassword` dans `clients/{docId}`
3. Client ne voit pas ses sites → vérifier `clientIds`/`authorizedClients` sur les sites
4. Client n'a pas de planning → vérifier `shiftSegments` avec bon `clientId`

---

## Logs opérationnels

### Client (navigateur — DevTools Console)
Format : `[MoCyno/Client] <Context>: <Message>`
- Logs détaillés uniquement en DEV (`logger.info`)
- Erreurs toujours visibles (`logger.error`)

### Functions (Firebase Console > Functions > Logs)
Format : `[functionName] <Action>: <Details>`
- `[createClient]` — provisioning
- `[getDocumentSignedUrl]` — download document
- `[getAgentBadgeSignedUrl]` — badge agent
