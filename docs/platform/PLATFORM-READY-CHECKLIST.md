# Mo'Cyno — Checklist de sortie « Plateforme Prête »

> Dernière mise à jour : A29 — 17 mars 2026

---

## Sécurité

- ✅ Firestore rules explicites pour toutes les collections utilisées (clients, sites, agents, planning, reports, clientRequests, consignes, documents, documentDownloads, auditLogs)
- ✅ Storage rules explicites pour tous les paths (agent_photos, report_photos, badges, documents, clientUploads)
- ✅ Default deny sur Firestore et Storage
- ✅ Client accès limité via `request.auth.token.clientId` (claims-based)
- ✅ Admin/Manager accès vérifié via `agents/{uid}.role`
- ✅ Cloud Functions callables protégées par vérification auth + rôle
- ✅ `mustChangePassword` forcé au premier login client
- ✅ Signed URLs (15 min) pour documents et badges — pas de lecture directe Storage

## Workflows critiques

- ✅ Provisioning client : Admin → callable createClient → Auth + Firestore + Claims + Site
- ✅ Premier login : email/MDP → changement MDP → portail affiché
- ✅ Demande client : création portail → visible admin → traitement statut → feedback client
- ✅ Incident client : signalement portail → visible admin → traitement → retour client
- ✅ Consigne client : création portail → validation admin → statut client
- ✅ Documents client : upload admin → visibilité portail → téléchargement signedURL → trace
- ✅ Commentaires bidirectionnels : client ↔ admin sur demandes et incidents
- ✅ Planning client : lecture shiftSegments via portail

## Auditabilité

- ✅ Audit trail automatique via Cloud Functions (createAgent, createClient, updateAgentPassword, generateMatricule)
- ✅ Journal d'Audit accessible dans Admin (liste paginée)
- ✅ Compteur 24h d'actions sensibles dans le Dashboard Admin
- ✅ 10 dernières entrées audit dans la vue Supervision
- ✅ Traçabilité téléchargements : `documentDownloads` collection

## Supervision

- ✅ Bloc « À surveiller » : 5 signaux proactifs (missions sans agent, consignes > 7j, incidents critiques, demandes urgentes, clients sans site)
- ✅ Bloc « Conformité » : 5 signaux opérationnels (carte pro, matricule, SST, clients sans site, missions sans affectation)
- ✅ Alertes 3 niveaux (urgent / à traiter / à surveiller)
- ✅ Vue Supervision dédiée (4 sections + résumé)

## Support & Exploitation

- ✅ Filtres structurés sur toutes les ressources Admin (statut, client, site, date, priorité)
- ✅ Exports CSV sur le portail client (demandes, incidents)
- ✅ Empty states cohérents sur le portail client et l'Admin
- ✅ Toast feedback sur les actions client (création demande, consigne, incident)
- ✅ CommentThread intégré sur demandes et incidents

## Documentation

- ✅ Guide d'exploitation Admin : `docs/admin/OPERATIONS.md`
- ✅ Guide d'exploitation Client : `docs/client/OPERATIONS.md`
- ✅ Documentation transverse : `docs/platform/OPERATIONS-CROSSFLOW.md`
- ✅ Checklist plateforme prête : `docs/platform/PLATFORM-READY-CHECKLIST.md` (ce document)

## Déploiement

- ✅ Build admin : `cd admin && npx vite build`
- ✅ Build client : `cd apps/clients && npx vite build`
- ✅ PROD-GATE procédure documentée (stash hors-scope → deploy → pop)
- ✅ Firestore rules déployées (incluant auditLogs A29)
- ⚠️ Firestore indexes : fichier versionné nettoyé (documentReceipts orphelins supprimés), non redéployé en prod dans A29

---

## Limites connues et acceptées

| Élément | Limite | Statut |
|---|---|---|
| Notifications push | Non implémentées | ⚠️ Hors scope, toasts uniquement |
| Conformité SST | Signal seulement si `sstExpiresAt` renseigné | ⚠️ Acceptable, pas de faux positif |
| Compteurs Dashboard | Non temps réel | ⚠️ Mis à jour au rechargement |
| Comments sub-collection | Pas d'index composite | ⚠️ Non bloquant, queries simples |
| Mobile agent | Non couvert dans ce round | ⚠️ Hors scope |
| Multi-tenant | Pas de séparation par tenant | ⚠️ Architecture tenant unique |
| Site vitrine | Hors scope plateforme | ❌ Périmètre distinct |

---

## Verdict

**La plateforme Mo'Cyno est prête pour un usage opérationnel encadré.**

Les fondamentaux de sécurité, les workflows critiques, l'auditabilité, la supervision proactive et la documentation sont en place. Les limites connues sont documentées et acceptables pour l'exploitation courante.

**Clôture : A29 — Stabilisation transverse & hardening final terminé.**
