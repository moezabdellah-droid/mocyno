# Mo'Cyno — Standards de Finition UX & Performance

> A35 — 17 mars 2026

## Principes retenus

1. **Utile avant beau** — chaque ajustement doit résoudre une friction réelle
2. **Pas de duplication de signal** — une information affichée une seule fois, au bon endroit
3. **Feedback immédiat** — tout clic doit produire un retour visible (hover, spinner, transition)
4. **Cohérence cross-surface** — mêmes conventions de statut, badges, loading/error/empty entre Admin, Client et Mobile

## Loading States

| État | Comportement attendu | Admin | Client |
|---|---|---|---|
| Chargement initial | Spinner centré | `<CircularProgress>` MUI | `.page-loading` avec `::before` spinner CSS |
| Chargement partiel | Skeleton ou zone grisée | Non implémenté (hors scope A35) | Non implémenté |
| Erreur réseau | Message rouge centré | `console.error` + fallback | `.page-error` rouge |
| Données vides | Message informatif centré | `✅ Aucune alerte` | `.empty-state` ou `.empty-state-box` |

## Status Badges

| Statut | Couleur | Surfaces |
|---|---|---|
| `pending`, `open` | 🟡 Jaune `#fbbf24` | Admin, Client |
| `in_progress` | 🔵 Bleu `#3b82f6` | Admin, Client |
| `resolved`, `confirmed`, `approved` | 🟢 Vert `#34d399` | Admin, Client |
| `closed`, `cancelled` | ⚪ Gris `#94a3b8` | Admin, Client |
| `rejected` | 🔴 Rouge `#f87171` | Client |
| Statut inconnu | ⚪ Gris fallback | Client (`.status-badge` default) |

## Navigation

| Convention | Implémenté |
|---|---|
| Raccourcis Dashboard → ressources | ✅ Admin + Client |
| Alertes cliquables → ressource filtrée | ✅ Admin (Dashboard + Supervision) |
| Deep links `/clients/:id` | ✅ Client portal |
| Tab navigation mobile-friendly | ✅ Client (scroll horizontal) |
| Shortcut hover feedback | ✅ Client (A35) |

## Niveaux d'alerte Admin

| Niveau | Couleur | Emoji | Usage |
|---|---|---|---|
| Urgent | Rouge `#d32f2f` | 🔴 | Incidents critiques, demandes urgentes |
| À traiter | Orange `#f9a825` | 🟡 | Consignes pending, demandes en attente |
| À surveiller | Bleu `#1976d2` | 🔵 | Missions sans agent, écarts conformité |

## Performance perçue

| Optimisation | Surface | Effet |
|---|---|---|
| Déduplication alertes Dashboard | Admin | Supprimé ~130 lignes de useMemo redondants |
| Spinner CSS sur `.page-loading` | Client | Feedback visuel immédiat pendant le fetch |
| Requêtes Firestore parallèles | Admin, Client | Toutes les données chargées en parallèle |
| N+1 agent name resolution | Client planning | Déjà optimisé par `Set` + batch |

## Critères de performance minimum

- **First Contentful Paint** : le spinner doit apparaître avant les données
- **Pas de flash blanc** : le dark mode est appliqué dès le body CSS
- **Pas de re-render visible** : les useMemo protègent les calculs coûteux

## Hors scope volontaire

- Skeleton loading (nécessiterait MUI Skeleton pour chaque composant)
- Lazy loading des routes (Vite code splitting — gain marginal sur un SPA)
- Service Worker / cache offline (hors périmètre sécurité privée)
- Optimisation images (pas d'images lourdes dans l'Admin ou le portail)
