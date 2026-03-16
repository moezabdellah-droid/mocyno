# Mo'Cyno Admin — Guide d'Exploitation

> Dernière mise à jour : A26 — 16 mars 2026

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
| `client` | Custom claim + Firestore `clients/{uid}` | ❌ Portail client uniquement |

- `checkAuth` revalide le rôle Firestore à chaque navigation (A21)
- `createAgent` Cloud Function pose le custom claim `role` + crée le document Firestore

## 6. Dépannage rapide

| Symptôme | Cause probable | Action |
|---|---|---|
| Dashboard vide | Données non chargées | Vérifier connexion Firestore |
| Agent non visible | `perPage` limit atteinte | Augmenter `perPage` ou paginer |
| CSV vide | Aucun agent avec role ≠ admin | Vérifier que des agents existent |
| Planning calendar vide | Aucune mission créée | Créer une mission |
| Incident non visible | Filtre actif | Vérifier les filtres actifs |
| "Permission denied" | Rôle non admin | Vérifier `agents/{uid}.role = admin` |

## 7. Architecture technique

- **Frontend** : React Admin + Material UI + Vite
- **Backend** : Firebase (Firestore, Cloud Functions, Auth, Storage, Hosting)
- **Types** : `@mocyno/types` (monorepo packages/types)
- **Build** : `cd admin && npx vite build` → output dans `public/admin/`
- **Deploy** : `firebase deploy --only hosting` (admin + vitrine)
