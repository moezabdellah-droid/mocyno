# Mo'Cyno — Standards de Finition UX & Performance

> A35bis — 17 mars 2026 (mise à jour après A35 + A36)

## Principes retenus

1. **Utile avant beau** — chaque ajustement doit résoudre une friction réelle
2. **Pas de duplication de signal** — une information affichée une seule fois, au bon endroit
3. **Feedback immédiat** — tout clic doit produire un retour visible (hover, spinner, transition)
4. **Cohérence cross-surface** — mêmes conventions de statut, badges, loading/error/empty entre Admin, Client et Mobile
5. **Empty states informatifs** — chaque page vide doit guider l'utilisateur avec icône + message + suggestion

## Loading States

| État | Comportement attendu | Admin | Client |
|---|---|---|---|
| Chargement initial | Spinner centré | `<CircularProgress>` MUI | `.page-loading` avec `::before` spinner CSS |
| Chargement partiel | Skeleton ou zone grisée | Non implémenté (hors scope) | Non implémenté |
| Erreur réseau | Message rouge centré | `console.error` + fallback | `.page-error` rouge |
| Données vides | Icône + message + aide | `✅ Aucune alerte` | `.empty-state-box` avec icône, message et détail |

## Empty State Pattern (Client)

```html
<div class="empty-state-box">
    <span class="empty-icon">📄</span>
    <p>Message principal.</p>
    <span class="empty-detail">Aide contextuelle.</span>
</div>
```

Pages conformes : Documents ✅, Consignes ✅, Demandes ✅, Incidents ✅, Sites ✅, Planning ✅, Reporting ✅

## Status Badges

| Statut | Couleur | Surfaces |
|---|---|---|
| `pending`, `open` | 🟡 Jaune `#fbbf24` | Admin, Client |
| `in_progress` | 🔵 Bleu `#3b82f6` | Admin, Client |
| `resolved`, `confirmed`, `approved` | 🟢 Vert `#34d399` | Admin, Client |
| `closed`, `cancelled` | ⚪ Gris `#94a3b8` | Admin, Client |
| `rejected` | 🔴 Rouge `#f87171` | Client |
| Statut inconnu | ⚪ Gris fallback | Client (`.status-badge` default) |

## Niveaux d'alerte Admin

| Niveau | Couleur | Emoji | Usage |
|---|---|---|---|
| Urgent | Rouge `#d32f2f` | 🔴 | Incidents critiques, demandes urgentes |
| À traiter | Orange `#f9a825` | 🟡 | Consignes pending, demandes en attente |
| À surveiller | Bleu `#1976d2` | 🔵 | Missions sans agent, écarts conformité |

## Performance perçue

| Optimisation | Surface | Effet |
|---|---|---|
| Déduplication alertes Dashboard | Admin | ~130 lignes de useMemo redondants supprimés |
| Spinner CSS sur `.page-loading` | Client | Feedback visuel immédiat pendant le fetch |
| Requêtes Firestore parallèles | Admin, Client | Données chargées en parallèle (Promise.all) |
| Empty-state-box partout | Client | Pas de flash "texte brut" — état vide immédiatement lisible |

## Hors scope volontaire

- Skeleton loading (nécessiterait composants dédiés par page)
- Lazy loading des routes (gain marginal sur SPA)
- Service Worker / cache offline
- Optimisation images (pas d'images lourdes dans l'Admin ou portail)
