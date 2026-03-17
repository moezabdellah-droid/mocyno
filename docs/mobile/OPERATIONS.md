# Mo'Cyno Mobile Agent — Guide d'Exploitation Terrain

> Version : M23 — 17 mars 2026

## Vue d'ensemble

L'app Mobile Mo'Cyno est destinée aux agents de sécurité terrain. Elle permet :

- Prise/fin de service avec tracking GPS (PTI)
- Consultation du planning et des consignes (bornés au site)
- Création de rapports terrain (main courante, incidents, observations)
- Scan de rondes (QR checkpoints)
- Alerte SOS avec géolocalisation

## Login

- **Méthode** : email + mot de passe (Firebase Auth)
- **Vérification rôle** : après authentification, l'app vérifie `agents/{uid}.role`
  - Rôles autorisés : `agent`, `admin`, `manager`
  - Si le rôle n'est pas valide → déconnexion automatique + message d'erreur
  - Si pas de document `agents/{uid}` → accès refusé

## Home / Tableau de bord

- **En-tête** : nom, prénom, matricule de l'agent (depuis `agents/{uid}`)
- **Carte statut** : EN SERVICE / HORS SERVICE
- **Site assigné** : affiché si `siteName` est renseigné dans le document agent
- **Bouton SOS** : alerte immédiate (voir section SOS)
- **Prise/Fin de service** : active/désactive le tracking GPS (PTI)
- **Boutons accès rapide** : Scan Ronde, Consignes, Rapport, Planning

## PTI (Protection du Travailleur Isolé)

### Prise de service
1. Agent appuie sur "Prise de Service"
2. Permissions GPS demandées si nécessaire
3. `agents/{uid}.isServiceRunning = true`
4. GPS watch activé (haute précision)
5. Event `SERVICE_START` créé dans `events` (avec agentName, siteId, siteName)

### Fin de service
1. Agent appuie sur "Fin de Service"
2. GPS watch arrêté
3. `agents/{uid}.isServiceRunning = false`
4. Event `SERVICE_STOP` créé

### Tracking continu
- Position GPS envoyée en continu à `agents/{uid}.location`
- `{ lat, lng, lastUpdated }`

### Auto-reprise
- Si `isServiceRunning = true` au chargement Home → service repris automatiquement

## SOS

1. Agent appuie sur le bouton SOS
2. Géolocalisation récupérée (timeout 10s, positions jusqu'à 30s acceptées)
3. Event Firestore créé :
   - type: `SOS`, priority: `CRITICAL`
   - agentName, siteId, siteName
   - location (si disponible)
4. SMS envoyé au PC Sécurité : `+33666035116`
5. Confirmation visuelle (alert natif)

> **Note** : si la géolocalisation échoue, l'alerte est quand même envoyée (sans position).

## Missions (Planning)

- **Source** : collection `planning`, filtrée par `assignedAgentIds array-contains uid`
- **Borne temporelle** : fenêtre glissante 7 jours (J-7 minimum, filtrée côté client) — M22
- **Catégorisation** : 📌 Aujourd'hui / 📅 À venir / 📋 Récentes — M22
- **Badges contextuels** : 🟢 Aujourd'hui, 🔵 À venir, ⬜ Passée — M22
- **Affichage** : site, spécialité, dates et horaires par vacation, notes
- **Loading** : `IonSpinner crescent` + texte — M22
- **Empty state** : icône calendrier + message — M22
- **Pull-to-refresh** : disponible — M22
- **Erreur** : toast danger 4s
- **Temps réel** : onSnapshot (mises à jour automatiques)

## Consignes

- **Source** : collection `consignes`, filtrée par `siteId == agents/{uid}.siteId` — M21
- **Scope** : consignes du site de l'agent uniquement — M21
- **Rule Firestore** : `resource.data.siteId == getUserData().siteId` pour agents — M21
- **Agent sans siteId** : message explicite, aucune consigne chargée — M21
- **Layout** : cards avec titre, type, date, badge priorité — M22
- **Badges priorité** : 🔴 Urgent / 🟡 Important / 🔵 Info — M22
- **Compteur** : « N consigne(s) pour votre site » — M22
- **Détail** : modal avec badges (priorité + type + date) + contenu HTML (DOMPurify) — M22
- **Loading** : `IonSpinner crescent` + texte — M22
- **Pull-to-refresh** : disponible — M22
- **Erreur** : toast danger 4s

## Rapports (Main courante)

### Création
1. Sélectionner le type : **Main courante**, **Incident**, ou **Observation**
2. Remplir titre et description
3. Optionnel : prendre une photo (Capacitor Camera)
4. Soumettre

### Données enregistrées
- Collection : `events`
- Champs : type, title, description, authorId, authorEmail, agentName, siteId, siteName, photo, photoPath, timestamp, status
- Photo : uploadée dans Storage `report_photos/{uid}/{timestamp}.jpg`

### Validation
- Titre et description obligatoires
- Type obligatoire
- Si upload photo échoue → soumission bloquée (pas d'envoi silencieux sans photo)

### Feedback utilisateur
- `IonLoading` pendant l'envoi
- Alert succès ou erreur après soumission
- Retour automatique à Home après succès

## Scan Ronde

### Flux
1. Appuyer sur "Lancer le Scanner"
2. Permission caméra demandée
3. Scan QR Code / DataMatrix (MLKit barcode-scanning)
4. Point de contrôle validé avec géolocalisation

### Données enregistrées
- Collection : `events`
- Champs : type `RDL_CHECKPOINT`, content (payload QR), authorId, authorEmail, agentName, siteId, siteName, location, timestamp, status `VALIDATED`

### Feedback utilisateur
- `IonLoading` pendant la validation
- Alert confirmant le point validé ou l'erreur
- Retour automatique à Home après succès

## Signaux terrain — Types d'events

| Type | Source | Priority | Status initial | Visible Admin |
|---|---|---|---|---|
| `SERVICE_START` | PTI | — | `CLOSED` | ✅ Main Courante |
| `SERVICE_STOP` | PTI | — | `CLOSED` | ✅ Main Courante |
| `SOS` | Bouton SOS | `CRITICAL` | `OPEN` | ✅ Main Courante |
| `MAIN_COURANTE` | Rapport | — | `OPEN` | ✅ Main Courante |
| `INCIDENT` | Rapport | — | `OPEN` | ✅ Main Courante |
| `OBSERVATION` | Rapport | — | `OPEN` | ✅ Main Courante |
| `RDL_CHECKPOINT` | Scan | — | `VALIDATED` | ✅ Main Courante |

## Métadonnées communes terrain → Admin

Tous les events créés par le mobile sont enrichis avec :

| Champ | Source | Description |
|---|---|---|
| `authorId` | `auth.currentUser.uid` | UID Firebase de l'agent |
| `authorEmail` | `auth.currentUser.email` | Email de l'agent |
| `agentName` | `agents/{uid}.firstName + lastName` | Nom lisible de l'agent |
| `siteId` | `agents/{uid}.siteId` | Site assigné |
| `siteName` | `agents/{uid}.siteName` | Nom du site |
| `location` | GPS | Coordonnées lat/lng (si disponible) |
| `timestamp` | `serverTimestamp()` | Date serveur |

> **Note** : `agentMeta` est chargé séparément dans ReportsPage, ScanPage et PtiService (pas de hook partagé — dette D1).

## Plugins Capacitor

| Plugin | Utilisation | Permission requise |
|---|---|---|
| `@capacitor/camera` | Photos rapport | Caméra |
| `@capacitor/geolocation` | PTI / SOS / Scan | Localisation |
| `@capacitor-mlkit/barcode-scanning` | Scan QR ronde | Caméra |

## Limites connues

| Élément | Détail |
|---|---|
| Offline | Pas de support offline (pas de queue d'écriture locale) |
| Background tracking | GPS watch en foreground uniquement (limitation Capacitor web) |
| Notifications push | Non implémentées |
| Détection de chute | Simulée (bouton dev-only, gated `import.meta.env.DEV`) |
| SOS feedback | `alert()` natif au lieu d'un composant Ionic structuré |
| SOS SMS | `window.location.href = sms:` — interrompt l'app |
| GPS throttle | `updateLocation` écrit à chaque tick GPS sans throttle |
| AgentMeta | Chargé en 3 endroits séparés (pas de hook partagé) |
| Event types | Constantes magiques — pas d'enum partagé |
