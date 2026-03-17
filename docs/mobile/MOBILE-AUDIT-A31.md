# Mo'Cyno Mobile Agent — Audit Terrain A31

> Date : 17 mars 2026

## Architecture

- **Framework** : Ionic React 8 + Capacitor 7
- **Routing** : IonReactRouter (react-router-dom 5.x), basename `/mobile`
- **Auth** : Firebase Auth (email/password)
- **Backend** : Firestore + Storage + Cloud Functions
- **Build** : Vite + TypeScript

## Écrans

| Écran | Fichier | Lignes | Statut |
|---|---|---|---|
| Login | `Login.tsx` | 57 | ✅ Fonctionnel |
| Home (PTI/SOS) | `Home.tsx` | 151 | ✅ Fonctionnel |
| Missions | `MyMissions.tsx` | 155 | ✅ Fonctionnel |
| Consignes | `ConsignesPage.tsx` | 65 | ⚠️ Fragile |
| Rapports | `ReportsPage.tsx` | 136 | ✅ Fonctionnel |
| Scan Ronde | `ScanPage.tsx` | 115 | ✅ Fonctionnel |

## Flux Terrain

### Login Agent
- Email / mot de passe → Firebase Auth
- Redirection vers `/home`
- **Pas de vérification rôle agent** → tout utilisateur authentifié accède

### Home / PTI / SOS
- Lecture temps réel `agents/{uid}` (onSnapshot)
- Affiche : nom, matricule, statut service
- Toggle Prise/Fin de service → `PtiService.startService/stopService`
- Bouton SOS → event Firestore + SMS
- Bouton "Simuler Chute" → appelle `sendSOS` (visible en prod ⚠️)

### Missions (Planning)
- Query : `planning` WHERE `assignedAgentIds` array-contains `uid`
- Affiche : site, spécialité, dates/horaires (vacations)
- Tri client-side par date
- Empty state si 0 missions

### Consignes
- Query : `consignes` ORDER BY `createdAt` desc (TOUTES les consignes)
- **Choix métier** : les agents voient toutes les consignes (toutes sites/clients)
- Rule Firestore : `isAuthenticated() && !isClient()` → OK
- **Issues** : pas de back button, pas de loading, pas d'empty state, pas d'error handling

### Rapports (Main Courante)
- Formulaire : titre + description + photo (Capacitor Camera)
- Upload photo → Storage `report_photos/{uid}/{timestamp}.jpg`
- Event Firestore → `events` collection, type `MAIN_COURANTE`
- **Missing** : pas de siteId/siteName/agentName dans l'event

### Scan Ronde
- Barcode Scanner (QR/DataMatrix) via `@capacitor-mlkit/barcode-scanning`
- Event Firestore → `events` collection, type `RDL_CHECKPOINT`
- Inclut géolocalisation
- **Missing** : pas de siteId/agentName dans l'event

## Collections Firestore Mobile

| Collection | Opérations | Rule |
|---|---|---|
| `agents/{uid}` | Read (self) + Update (location, isServiceRunning) | ✅ |
| `events` | Create (MAIN_COURANTE, RDL_CHECKPOINT, SOS, SERVICE_*) + Read | ✅ |
| `planning` | Read (array-contains) | ✅ |
| `consignes` | Read (all, non-client) | ✅ |
| `report_photos/` | Write (Storage) | ✅ |

## Plugins Capacitor

| Plugin | Usage |
|---|---|
| `@capacitor/camera` | Photos rapport |
| `@capacitor/geolocation` | PTI tracking, scan checkpoint |
| `@capacitor/motion` | Détection chute (simulée) |
| `@capacitor-mlkit/barcode-scanning` | Scan QR ronde |

## PtiService

- **Start** : GPS watch + `agents/{uid}.isServiceRunning = true` + event `SERVICE_START`
- **Stop** : Clear watch + `isServiceRunning = false` + event `SERVICE_STOP`
- **SOS** : Event `SOS` (priority CRITICAL) + SMS via `sms:` protocol
- **Location** : Continuous `agents/{uid}.location` updates
- **Resume** : Auto-resume si `isServiceRunning = true` au chargement Home

## Limites Connues

| Élément | Limite |
|---|---|
| Vérification rôle | Login ne vérifie pas `agents/{uid}.role` |
| Offline | Pas de support offline explicite |
| Consignes | Lecture globale toutes consignes (choix métier) |
| Métadonnées events | Pas de siteId/siteName/agentName |
| Simuler Chute | Visible en production |
| Notifications push | Non implémentées |
| Background tracking | Simulated (Capacitor foreground watch) |
