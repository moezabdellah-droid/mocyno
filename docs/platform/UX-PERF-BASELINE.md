# Mo'Cyno — UX & Performance Baseline

> A35 — 17 mars 2026

## Micro-frictions identifiées

### Admin (Dashboard / Supervision / Resources)

| # | Type | Description | Priorité |
|---|---|---|---|
| A1 | Navigation / lecture | Dashboard : 3 blocs alerte se chevauchent (Alertes, Watchlist, Conformité) — signal dupliqué | 🔴 |
| A2 | Lecture | Dashboard version label encore `A28` | 🟡 |
| A3 | Performance | Dashboard : 7 requêtes Firestore parallèles, spinner unique sans skeleton | 🟡 |
| A4 | Lecture | Alertes Dashboard : pas de lien Supervision visible depuis le bloc alertes | 🟡 |
| A5 | Cohérence | Dashboard raccourcis : « Créer une mission » pointe vers `/planning` au lieu de `/planning?view=calendar` | 🟢 |

### Client Portal

| # | Type | Description | Priorité |
|---|---|---|---|
| C1 | Feedback | Loading states sont du texte brut sans spinner | 🟡 |
| C2 | Lecture | Status badges utilisent des CSS classes dynamiques sans fallback couleur | 🟡 |
| C3 | Navigation | Dashboard shortcuts n'ont pas d'icône de feedback au hover | 🟢 |
| C4 | Performance | PlanningPage résout les noms agents un par un (N+1) — déjà optimisé par Set | 🟢 |

### Mobile

| # | Type | Description | Priorité |
|---|---|---|---|
| M1 | Cohérence | Loading/error states hétérogènes entre pages (IonLoading vs spinner inline) | 🟡 |
| M2 | Feedback | Toast messages disparaissent trop vite (1s) | 🟢 |

## Priorités retenues pour A35

1. **A1** — Dédupliquer les blocs alertes dans le Dashboard Admin
2. **A2** — Mettre à jour le version label
3. **C1** — Améliorer les loading states client avec spinner CSS
4. **C2** — Harmoniser les status badges client
5. **A3** — Améliorer le feedback loading admin
