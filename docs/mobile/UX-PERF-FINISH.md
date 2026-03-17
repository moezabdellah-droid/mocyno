# Mo'Cyno Mobile — Critères de finition UX / Performance — M25

> 17 mars 2026

## Principes retenus

1. **Feedback cohérent** : IonToast pour notifications (succès/erreur/warning), IonAlert pour confirmations
2. **Pas de `alert()` natif** : toute action terrain utilise les composants Ionic
3. **Francisation complète** : tous les textes visibles sont en français
4. **Loading visible** : IonSpinner pour les données, IonLoading pour les actions
5. **Navigation standard** : IonBackButton partout (pas de bouton custom)
6. **Toast duration** : 4s minimum pour les erreurs, 4s pour les succès

## États UX attendus

| État | Composant | Comportement |
|---|---|---|
| Loading données | `IonSpinner name="crescent"` + texte | Centré, visible avant premier affichage |
| Loading action | `IonLoading` | Overlay modal pendant envoi/upload |
| Empty state | Icône + texte | Centré, icône contextuelle |
| Erreur réseau | `IonToast color="danger" 4s` | Toast non-bloquant |
| Validation form | `IonToast color="warning" 4s` | Toast non-bloquant |
| Succès action | `IonToast color="success" 4s` | Toast + goBack après 1.2-1.5s |
| Confirmation | `IonAlert` avec annulation | Modal bloquante (SOS uniquement) |
| Refresh | `IonRefresher` pull-to-refresh | Missions, Consignes |

## Règles feedback terrain

| Action | Avant | Après | Pattern |
|---|---|---|---|
| SOS | `alert()` direct | IonAlert confirmation → IonAlert résultat | Confirmation + feedback |
| Rapport | `alert()` validation/succès | IonToast warning/success + delayed goBack | Toast + auto-retour |
| Scan | `alert()` succès/erreur | IonToast success/danger + delayed goBack | Toast + auto-retour |
| Login | Toast 2s | Toast 4s + textes FR | Toast erreur lisible |

## Hors scope volontaire

| Élément | Raison |
|---|---|
| Offline mode | Non implémenté, nécessite service worker + queue |
| Push notifications | Non implémenté, nécessite FCM setup |
| Carte GPS temps réel | Données location fragmentaires |
| Redesign Ionic | Pas de valeur terrain ajoutée |
| AgentMeta hook partagé | Dette D1, reporté |
| GPS throttle | Risque fonctionnel si implémenté mal |
