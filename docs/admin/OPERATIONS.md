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

## 9. Supervision avancée & Conformité (A28 → A34)

### Niveaux d'alerte (hiérarchie A34)

| Niveau | Couleur | Usage | Exemples |
|---|---|---|---|
| 🔴 Critique | Rouge `#d32f2f` | Action immédiate requise | SST expirée, incident critique ouvert, demande urgente |
| 🟠 Élevé | Orange `#ed6c02` | Action sous 24-48h | Mission sans agent, consigne > 3 jours, agent sans carte pro |
| 🔵 Modéré | Bleu `#1976d2` | À suivre cette semaine | Demandes pending, incidents standards, agent sans matricule |
| 🟣 Surveillance | Violet `#7b1fa2` | Information / veille | Missions en cours, SST expire sous 30 jours |

### Vue Supervision (🛡️) — Triage A34

Page dédiée accessible via le menu latéral. Restructurée en 3 sections de triage :

| Section | Contenu | Actions disponibles |
|---|---|---|
| **🚨 À traiter maintenant** | Alertes critiques + élevées | Liens vers Incidents, Demandes, Agents |
| **📊 À suivre** | Alertes modérées | Liens vers Consignes, Agents |
| **👁️ Surveillance** | Points de veille | Liens vers Planning, Clients |

Chaque alerte indique :
- Le **nombre** d'éléments concernés
- Un **libellé actionnable** décrivant quoi faire
- Un **lien direct** vers la ressource filtrée

### Signaux de conformité enrichis (A34)

| Signal | Condition | Niveau | Limite connue |
|---|---|---|---|
| SST expirée | `sstExpiresAt < today` | 🔴 Critique | Seulement si renseigné |
| Agent(s) sans carte pro | `status=active`, `professionalCardNumber` vide | 🟠 Élevé | Peut inclure agents récents |
| Agent(s) sans matricule | `status=active`, `matricule` vide | 🔵 Modéré | Normal si pas encore généré |
| SST expire sous 30j | `sstExpiresAt` dans les 30 prochains jours | 🟣 Surveillance | Anticipation |
| Consigne client > 3j | `source=client`, `status=pending`, > 3 jours | 🟠 Élevé | Seuil configurable |
| Client(s) sans site | Ni `siteId` ni `siteIds` | 🔵 Modéré | Provisioning en cours |

### Activité sensible (audit trail dans Supervision)

La colonne droite affiche :
- **Compteurs 24h / 7 jours** pour l'ensemble des actions d'audit
- **Résumé activité** : créations agent/client, changements MDP
- **5 dernières entrées** du journal d'audit (action, résumé, date, auteur)
- Lien **Journal complet →** vers la ressource dédiée

### Synthèse managériale

En bas de la supervision, une carte consolidée affiche :
- Nombre d'alertes urgentes (rouge ou vert)
- Points par catégorie : Exploitation / Support / Conformité
- Compteurs audit 24h + 7 jours
- Boutons d'accès rapide : Incidents, Demandes, Agents, Journal

### Différences entre les vues

| Vue | But | Données | Quand y aller |
|---|---|---|---|
| **Dashboard** | Cockpit opérationnel | KPI, alertes, activité récente | Chaque matin, ouverture de session |
| **Supervision** | Arbitrage managérial | Alertes priorisées, conformité, audit | Revue hebdo, situations sensibles |
| **Journal d'Audit** | Traçabilité détaillée | Toutes les actions horodatées | Investigation, audit externe |

### Comment arbitrer une alerte

1. **Identifier le niveau** : la couleur et la section indiquent la priorité
2. **Cliquer** sur l'alerte → navigation directe vers les éléments concernés
3. **Traiter** : changer le statut, affecter un agent, valider une consigne, compléter un profil…
4. Le compteur se met à jour au prochain chargement

### Quand consulter le Journal d'Audit

- Après une alerte de sécurité (qui a fait quoi ?)
- Lors d'un audit de conformité externe
- Pour tracer les créations agents/clients récentes
- Pour vérifier les changements de mots de passe

### Limites connues

- Les signaux conformité dépendent des données renseignées — un champ vide ne génère un signal que si le contexte le justifie
- Les compteurs ne sont pas en temps réel — mise à jour au chargement de la page
- La supervision ne remplace pas un audit de conformité réglementaire — elle fournit des indicateurs opérationnels simples
- Le seuil des consignes "stale" (> 3 jours) est codé en dur

