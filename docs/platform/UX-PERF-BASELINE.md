# Mo'Cyno — UX & Performance Baseline (passe 2)

> A35bis — 17 mars 2026  
> Mise à jour après A35 + A36

## Frictions corrigées (A35 passe 1)

- ~~A1~~ Déduplication alertes Dashboard ✅
- ~~A2~~ Version label → A35 ✅
- ~~C1~~ Loading spinner CSS ✅
- ~~C2~~ Status badge fallback ✅
- ~~C3~~ Shortcut hover feedback ✅

## Nouvelles frictions identifiées

### Admin

| # | Type | Description | Priorité |
|---|---|---|---|
| A6 | Navigation | Dashboard manque un raccourci vers la Supervision | 🟡 |
| A7 | Cohérence | Dashboard version devrait refléter A35bis | 🟢 |

### Client Portal

| # | Type | Description | Priorité |
|---|---|---|---|
| C5 | Cohérence | ConsignesPage, RequestsPage, ReportsPage : empty state hétérogène (texte vs empty-state-box) | 🔴 |
| C6 | Lecture | Toutes les pages client loading disent un texte différent — harmoniser | 🟡 |
| C7 | Feedback | Formulaires : pas de feedback visuel au submit réussi (seul toast, pas de reset visuel) | 🟡 |
| C8 | Navigation | Dashboard recent activity manque le lien vers la page concernée | 🟢 |

### Mobile

| # | Type | Description | Priorité |
|---|---|---|---|
| M3 | Cohérence | Loading/error states acceptables (Ionic natif) — pas de friction visible | 🟢 |

## Priorités retenues pour A35bis

1. **C5** — Harmoniser les empty states sur toutes les pages client
2. **C6** — Harmoniser les loading text messages
3. **A6** — Ajouter raccourci Supervision dans Dashboard Admin
4. **A7** — Version label → A35bis
