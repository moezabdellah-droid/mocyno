# Mo'Cyno Mobile Agent — Guide d'Exploitation Terrain

> Version : A31 — 17 mars 2026

## Vue d'ensemble

L'app Mobile Mo'Cyno est destinée aux agents de sécurité terrain. Elle permet :

- Prise/fin de service avec tracking GPS (PTI)
- Consultation du planning et des consignes
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

> **Note** : si la géolocalisation échoue, l'alerte est quand même envoyée (sans position).

## Missions (Planning)

- **Source** : collection `planning`, filtrée par `assignedAgentIds array-contains uid`
- **Affichage** : site, spécialité, dates et horaires par vacation
- **Tri** : par date (première vacation)
- **Empty state** : "Aucune mission planifiée."
- **Erreur** : toast visible si la query échoue
- **Temps réel** : onSnapshot (mises à jour automatiques)

## Consignes

- **Source** : collection `consignes`, triée par `createdAt` desc
- **Scope** : toutes les consignes (choix métier — les agents terrain ont accès à l'ensemble des consignes)
- **Affichage** : liste avec titre et type, détail en modal avec contenu HTML (sanitisé via DOMPurify)
- **Loading** : spinner pendant le chargement
- **Empty state** : message si aucune consigne
- **Erreur** : toast visible

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

## Scan Ronde

### Flux
1. Appuyer sur "Lancer le Scanner"
2. Permission caméra demandée
3. Scan QR Code / DataMatrix
4. Point de contrôle validé avec géolocalisation

### Données enregistrées
- Collection : `events`
- Champs : type `RDL_CHECKPOINT`, content (payload QR), authorId, authorEmail, agentName, siteId, siteName, location, timestamp, status `VALIDATED`

## Métadonnées terrain → Admin

Tous les events créés par le mobile sont enrichis avec :

| Champ | Source | Description |
|---|---|---|
| `authorId` | `auth.currentUser.uid` | UID Firebase de l'agent |
| `authorEmail` | `auth.currentUser.email` | Email de l'agent |
| `agentName` | `agents/{uid}.firstName + lastName` | Nom lisible de l'agent |
| `siteId` | `agents/{uid}.siteId` | Site assigné |
| `siteName` | `agents/{uid}.siteName` | Nom du site |
| `location` | GPS | Coordonnées lat/lng |
| `timestamp` | `serverTimestamp()` | Date serveur |

## Plugins Capacitor

| Plugin | Utilisation | Permission requise |
|---|---|---|
| `@capacitor/camera` | Photos rapport | Caméra |
| `@capacitor/geolocation` | PTI / SOS / Scan | Localisation |
| `@capacitor/motion` | Détection chute (dev) | Motion |
| `@capacitor-mlkit/barcode-scanning` | Scan QR ronde | Caméra |

## Limites connues

- **Offline** : pas de support offline explicite (les données ne sont pas mises en cache localement)
- **Background tracking** : le GPS watch fonctionne en foreground uniquement (limitation Capacitor web)
- **Notifications push** : non implémentées
- **Détection de chute** : simulée (bouton dev-only), pas de détection automatique via capteurs
- **Consignes** : lecture globale — les agents voient toutes les consignes (toutes sites/clients). C'est un choix métier actuel.
- **Filtrage site** : les missions sont filtrées par agent, mais les consignes sont globales
