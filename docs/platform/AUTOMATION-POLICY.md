# Mo'Cyno — Politique d'Automatisation Opérationnelle

> A36 — 17 mars 2026

## Automatisations actives

| Automatisme | Fonction | Fréquence | Collection de sortie |
|---|---|---|---|
| Contrôle opérationnel quotidien | `dailyOperationalCheck` | Tous les jours à 08:00 (Europe/Paris) | `automationLogs` |

## Signaux vérifiés par le contrôle quotidien

| Signal | Seuil | Niveau |
|---|---|---|
| Consignes client en attente | > 3 jours, source=client, status=pending | 🟠 Élevé |
| Demandes urgentes non closes | priority=urgent, status ≠ closed | 🔴 Critique |
| Incidents critique/élevé ouverts | severity in [critical, high], status=open | 🔴 Critique |
| Agents avec SST expirée | sstExpiresAt < aujourd'hui, status=active | 🔴 Critique |
| Agents sans carte pro | professionalCardNumber vide, status=active | 🟠 Élevé |
| Résumé audit 24h | Compteurs créations agent/client, changements MDP | ℹ️ Info |

## Principes fondamentaux

1. **Lecture seule** — Les automatisations ne modifient jamais les données opérationnelles
2. **Traçabilité** — Chaque exécution écrit dans `automationLogs`
3. **Simplicité** — Une automatisation = une phrase explicative
4. **Désactivabilité** — Commenter l'export dans `functions/index.js` suffit à arrêter
5. **Pas de cascade** — Aucun effet de bord déclenché par une automatisation

## Structure d'un automationLog

```json
{
  "type": "dailyOperationalCheck",
  "runAt": "<Timestamp serveur>",
  "signals": [
    { "type": "stale_consignes", "count": 2, "level": "high", "detail": "..." }
  ],
  "totalIssues": 5,
  "auditSummary": { "total": 3, "agentCreations": 1, "clientCreations": 0, "passwordChanges": 1 },
  "status": "issues_found | all_clear | error",
  "version": "A36"
}
```

## Ce qui n'est PAS automatisé (volontairement)

| Action | Raison |
|---|---|
| Envoi d'email de relance | Canal email client non validé pour ce flux |
| Suspension d'agents | Décision métier ambiguë — doit rester manuelle |
| Clôture automatique | Risque de perte de signal |
| Suppression de données | Irréversible — politique d'archivage non définie |
| Notifications push | Infrastructure push non en place |

## Comment vérifier un run

1. **Console Supervision** : section « ⚙️ Automatisations » affiche le dernier run
2. **Firestore** : collection `automationLogs`, trier par `runAt` DESC
3. **Cloud Functions logs** : rechercher `[dailyOperationalCheck]`

## Comment modifier les seuils

Les seuils sont définis dans `functions/index.js` dans la fonction `dailyOperationalCheck` :
- `threeDaysAgo` : seuil pour les consignes stale (actuellement 3 jours)
- Les filtres Firestore déterminent les populations concernées

Toute modification nécessite un redéploiement : `firebase deploy --only functions`

## Comment désactiver

1. Commenter `exports.dailyOperationalCheck = ...` dans `functions/index.js`
2. Redéployer : `firebase deploy --only functions`
3. Les logs existants dans `automationLogs` restent consultables

## Comment ajouter une nouvelle automatisation

1. Ajouter dans `AUTOMATION-BASELINE.md` avec classification
2. Vérifier que l'automatisation suit les 5 principes ci-dessus
3. Implémenter dans `functions/index.js`
4. Écrire dans `automationLogs` pour la traçabilité
5. Exposer dans la section Supervision Admin si pertinent
6. Documenter dans ce fichier
