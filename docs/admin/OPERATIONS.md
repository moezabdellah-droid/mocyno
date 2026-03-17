# Mo'Cyno Admin — Guide d'Exploitation

> Dernière mise à jour : A28 — 17 mars 2026

---

## 1. Ressources Admin

| Ressource | Écran | Actions | Filtres |
|---|---|---|---|
| 📅 Planning | Calendrier + Liste | Créer / Modifier / Supprimer mission | Statut badge calculé |
| 💰 RH & Export | Cartes agents + heures | Export CSV, Renvoyer planning | — |
| 👥 Agents | Liste + Édition tabulée | Créer / Modifier / Supprimer | Statut, Nom, Contrat |
| 🏢 Sites | Liste + Édition | Créer / Modifier / Supprimer | — |
| 📋 Consignes | Liste + Show + Édition | Créer / Modifier | Origine, Statut, Client ID |
| 📝 Main Courante | Liste + Show | Lecture seule | — |
| 🤝 Clients | Liste + Show + Créer | Créer (via Cloud Function) | Société, Statut |
| 🔴 Incidents | Liste + Show + Edit | Modifier statut/gravité | Origine, Statut, Gravité, Type, Site, Client |
| 📄 Documents | Liste + Show | Lecture seule | Client ID, Nom, Type |
| 📩 Demandes | Liste + Show + Edit | Modifier statut/priorité | Client ID, Statut, Priorité, Catégorie, Site |
| 📥 Téléchargements | Liste | Lecture seule (traçabilité) | Client ID, Document, Rôle |
| 🛡️ Supervision | Vue consolidée | Lecture seule (A28) | — |

## 2. Dashboard

Le Dashboard est le cockpit principal. Il affiche :

- **Alertes** : bannière orange pour incidents critiques, demandes urgentes, consignes à valider, missions sans agent
- **KPI Exploitation** : missions (total/en cours/à venir), heures (effectuées/planifiées), agents mobilisés, sites actifs, clients actifs
- **KPI Support** : incidents ouverts, demandes en attente/en cours, consignes à valider
- **Filtre période** : 7 jours / 30 jours / 90 jours / Tout (s'applique aux KPI support)
- **Activité récente** : les 8 derniers incidents, demandes et consignes client
- **Raccourcis** : liens rapides vers les actions courantes

## 3. Workflows Support

### Incidents (Reports)
1. Client signale un incident via le portail → `reports` collection, `source: client`
2. Admin voit l'incident dans 🔴 Incidents, filtre par statut/gravité
3. Admin change le statut : `open` → `in_progress` → `resolved` → `closed`
4. Admin peut commenter via le thread de commentaires (Show view)

### Demandes client
1. Client crée une demande → `clientRequests` collection
2. Admin voit dans 📩 Demandes, filtre par statut/priorité
3. Admin change statut : `pending` → `in_progress` → `resolved` → `closed`
4. Admin peut ajuster la priorité : `normal` / `high` / `urgent`
5. Thread de commentaires disponible dans Show view

### Consignes client
1. Client crée une consigne sur son site → `consignes` collection, `source: client`, `status: pending`
2. Admin voit dans 📋 Consignes, filtre par `source=client` + `status=pending`
3. Admin valide (`approved`) ou refuse (`rejected`)

## 4. Workflows RH / Planning

### Créer une mission
1. Ouvrir 📅 Planning → vue Calendrier
2. Cliquer-glisser sur un créneau → dialogue de création
3. Sélectionner le site, ajouter agents + vacations, sauvegarder

### Suivi heures agents
1. Ouvrir 💰 RH & Export
2. Chaque agent affiche : heures effectuées, heures planifiées, majorations (nuit/dimanche/férié)
3. Bouton "Renvoyer Planning" envoie un récapitulatif par email

### Export CSV RH
1. Ouvrir 💰 RH & Export
2. Cliquer "Export Global CSV"
3. Fichier `export-rh-YYYY-MM-DD.csv` téléchargé (11 colonnes, séparateur `;`, compatible Excel)

## 5. RBAC

| Rôle | Source | Accès Admin |
|---|---|---|
| `admin` | Firestore `agents/{uid}.role` | ✅ Accès complet |
| `agent` | Firestore `agents/{uid}.role` | ❌ Redirigé vers login |
| `client` | Custom claims (`role`, `clientId`) + Firestore `clients/{clientId}` (avec `authUid` dans le doc) | ❌ Portail client uniquement |

- `checkAuth` revalide le rôle Firestore à chaque navigation (A21)
- `createAgent` Cloud Function pose le custom claim `role` + crée le document Firestore

## 6. Dépannage rapide

| Symptôme | Cause probable | Action |
|---|---|---|
| Dashboard vide | Données non chargées | Vérifier connexion Firestore |
| Agent non visible | Filtre actif ou page suivante | Vérifier les filtres, passer à la page suivante |
| CSV vide | Aucun agent avec role ≠ admin | Vérifier que des agents existent |
| Planning calendar vide | Aucune mission créée | Créer une mission |
| Incident non visible | Filtre actif | Vérifier les filtres actifs |
| "Permission denied" | Rôle non admin | Vérifier `agents/{uid}.role = admin` |

## 7. Observabilité & Audit (A27)

### Actions auditées

| Action | Déclencheur | Cible |
|---|---|---|
| `createAgent` | Cloud Function | Agent |
| `createClient` | Cloud Function | Client |
| `updateAgentPassword` | Cloud Function | Agent |
| `generateMatricule` | Cloud Function | Agent |

### Collection `auditLogs`

Chaque entrée contient :
- `action` — identifiant de l'action
- `actorUid` — UID de l'auteur
- `actorRole` — rôle de l'auteur (admin/manager)
- `targetType` — type de la cible (agent/client)
- `targetId` — ID de la cible
- `summary` — résumé non sensible
- `createdAt` — timestamp serveur

### Ressource Admin

Accessible via 🔍 **Journal d'Audit** dans le menu. Filtres : action, type cible, UID auteur, ID cible.

### Données volontairement exclues

- Mots de passe
- Tokens / secrets
- Contenus de messages clients
- Payloads complets

### Diagnostic

| Cas | Où regarder |
|---|---|
| Création agent/client | 🔍 Journal d'Audit → filtre action |
| Changement MDP | 🔍 Journal d'Audit → `updateAgentPassword` |
| Logs techniques functions | Firebase Console → Functions → Logs |
| Erreurs UI | Console navigateur (diagnostics catégorisés `[DataProvider]`, `[Auth]`, `[Proxy]`) |

## 8. Architecture technique

- **Frontend** : React Admin + Material UI + Vite
- **Backend** : Firebase (Firestore, Cloud Functions, Auth, Storage, Hosting)
- **Types** : `@mocyno/types` (monorepo packages/types)
- **Build** : `cd admin && npx vite build` → output dans `public/admin/`
- **Deploy** : `firebase deploy --only hosting` — après vérification stricte du diff et isolation des fichiers hors scope (cf. PROD-GATE)

## 9. Supervision proactive & Conformité (A28)

### Bloc "À surveiller" (Dashboard)

Le Dashboard affiche un bloc bleu **🔍 À surveiller** qui remonte les points d'attention proactifs :

| Signal | Condition | Navigation |
|---|---|---|
| Missions sans agent | `agentAssignments` vides sur missions futures | Planning → Liste |
| Consignes client > 7j | `source=client`, `status=pending`, créée > 7 jours | Consignes filtrées |
| Incidents critique/élevé | `status=open`, `severity` in [high, critical] | Incidents filtrés |
| Demandes urgentes | `priority=urgent`, `status ≠ closed` | Demandes filtrées |
| Clients sans site | Ni `siteId` ni `siteIds` renseigné | Clients |

Le bloc est masqué si tous les compteurs sont à zéro.

### Signaux de conformité

Bloc violet **📋 Conformité opérationnelle** avec signaux provables :

| Signal | Condition | Limite connue |
|---|---|---|
| Agent(s) sans carte pro | `status=active`, `professionalCardNumber` vide | Peut inclure des agents récents non encore documentés |
| Agent(s) sans matricule | `status=active`, `matricule` vide | Normal si matricule non encore généré |
| SST expirée | `sstExpiresAt < today` | Seulement si le champ a été renseigné — pas de faux rouge si vide |
| Client(s) sans site | Ni `siteId` ni `siteIds` | Peut être normal pour un client en cours de provisioning |
| Mission(s) sans affectation | Missions futures sans aucun `agentId` | Doublon visuel avec le watchlist |

### Niveaux d'alerte (Dashboard)

Le bloc **⚡ Alertes & Supervision** regroupe toutes les alertes en 3 niveaux :

| Niveau | Couleur | Exemples |
|---|---|---|
| 🔴 Urgent | Rouge | Incidents critiques ouverts, demandes urgentes |
| 🟡 À traiter | Jaune / Orange | Consignes en attente, demandes pending |
| 🔵 À surveiller | Bleu | Missions sans agent, écarts conformité |

Un compteur discret affiche les actions sensibles des dernières 24h (créations agents, changements MDP) depuis le journal d'audit.

### Comment traiter une alerte

1. **Cliquer** sur le chip d'alerte → navigation vers la ressource filtrée
2. **Traiter** l'élément (changer statut, affecter un agent, valider une consigne…)
3. Le compteur se met à jour au prochain rechargement du Dashboard

### Vue Supervision (🛡️)

Page dédiée accessible via le menu latéral. Centralise en lecture seule :

- **Exploitation** : missions sans agent, missions en cours
- **Support client** : incidents ouverts, demandes urgentes/en attente, consignes client
- **Conformité** : agents sans carte pro/matricule, SST expirée, clients sans site
- **Activité d'audit** : 10 dernières entrées du journal d'audit avec détails

Le résumé en bas à droite indique l'état global (✅ OK ou ⚠️ points à traiter).

### Lien avec l'audit trail (A27)

La vue Supervision complète l'audit trail :

- **Audit trail** = traçabilité des actions passées (qui a fait quoi, quand)
- **Supervision** = état actuel des points d'attention (qu'est-ce qui nécessite une action)

Pour une investigation complète : utiliser la Supervision pour identifier le problème, puis le Journal d'Audit pour comprendre le contexte.

### Limites connues

- Les signaux conformité dépendent des données renseignées — un champ vide ne génère un signal que si le contexte le justifie (ex: SST expirée seulement si `sstExpiresAt` est renseigné)
- Les compteurs du Dashboard ne sont pas en temps réel — ils se mettent à jour au chargement de la page
- La supervision ne remplace pas un audit de conformité réglementaire — elle fournit des indicateurs opérationnels simples

