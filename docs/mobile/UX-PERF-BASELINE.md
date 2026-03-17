# Mo'Cyno Mobile — Baseline UX / Performance — M25

> 17 mars 2026

## Micro-frictions identifiées

| # | Écran | Type | Détail | Sévérité |
|---|---|---|---|---|
| 1 | Login | Lecture | Labels en anglais ("Login", "Logging in…", "Password") | Moyenne |
| 2 | Home | Feedback | `alert()` natif pour SOS — incohérent avec design Ionic | Haute |
| 3 | Home | Lecture | Typo "Status du Service" → "Statut du Service" | Basse |
| 4 | Home | Performance | Pas de loading visible pendant chargement agent initial | Moyenne |
| 5 | Reports | Feedback | 5× `alert()` natif (validation, succès, erreur upload, erreur submit) | Haute |
| 6 | Scan | Feedback | 3× `alert()` natif (permission, succès, erreur) | Haute |
| 7 | Login | Feedback | Toast erreur 2s — trop court pour lire | Basse |
| 8 | Reports | Navigation | `chevronBack` custom au lieu de `IonBackButton` standard | Basse |
| 9 | Login | Lecture | Pas de branding Mo'Cyno visible | Moyenne |

## États UX hétérogènes

| Pattern | Login | Home | Missions | Consignes | Reports | Scan |
|---|---|---|---|---|---|---|
| Loading | IonLoading | — | IonSpinner | IonSpinner | IonLoading | IonLoading |
| Error | IonToast 2s | alert() | IonToast 4s | IonToast 4s | alert() | alert() |
| Success | — | alert() | — | — | alert() | alert() |
| Refresh | — | — | Pull | Pull | — | — |
| Back | — | — | IonBackButton | IonBackButton | chevronBack | — |

## Priorités

1. **Haute** : remplacer `alert()` par IonAlert/IonToast (Home SOS, Reports, Scan)
2. **Moyenne** : franciser Login, ajouter loading Home, branding
3. **Basse** : typo Statut, toast duration, back button cohérent
