# Mo'Cyno — Cartographie des Automatismes Opérationnels

> A36 — 17 mars 2026

## Automatismes potentiels identifiés

### ✅ Utile maintenant — Retenu A36

| Automatisme | Déclenchement | Cible | Risque |
|---|---|---|---|
| Résumé quotidien d'activité | Scheduled (08h00) | auditLogs → automationLogs | ⚪ Aucun (lecture seule) |
| Rappel consignes client stale (> 3 jours) | Scheduled (08h00) | consignes pending → automationLogs | ⚪ Aucun (signalement) |
| Rappel demandes urgentes ouvertes | Scheduled (08h00) | clientRequests urgent non fermées → automationLogs | ⚪ Aucun (signalement) |
| Rappel incidents critiques ouverts | Scheduled (08h00) | reports critical/high open → automationLogs | ⚪ Aucun (signalement) |
| Signal agents conformité SST | Scheduled (08h00) | agents SST expirée → automationLogs | ⚪ Aucun (signalement) |

### 🔵 Utile plus tard — Hors scope A36

| Automatisme | Raison du report |
|---|---|
| Email automatique de relance client | Nécessite validation du canal email client |
| Notification push mobile agent | Infrastructure push non en place |
| Archivage automatique incidents > 90j | Risque de perte de données — nécessite politique validée |
| Génération rapport PDF hebdomadaire | Valeur faible, complexité élevée |

### 🔴 Trop risqué — Exclu

| Automatisme | Raison |
|---|---|
| Suspension automatique agents inactifs | Décision métier ambiguë |
| Clôture automatique demandes stale | Perte de signal |
| Suppression automatique de données | Irréversible |
| Déclenchement en cascade (alerte → action → email) | Difficile à auditer |

## Architecture retenue

- **1 Cloud Function scheduled** exécutée quotidiennement à 08h00 Europe/Paris
- **Écriture dans `automationLogs`** collection Firestore (traçabilité)
- **Aucun effet de bord** : les automations signalent, elles ne modifient pas de données
- **Désactivable** : supprimer/commenter l'export dans `functions/index.js`

## Seuils retenus

| Paramètre | Valeur | Justification |
|---|---|---|
| Consignes stale | > 3 jours | Cohérent avec A34 Supervision |
| Incidents critiques | severity in [critical, high], status=open | Urgence réelle |
| Demandes urgentes | priority=urgent, status ≠ closed | Suivi actif |
| SST expirée/proche | sstExpiresAt < today ou < today+30 | Conformité légale |
