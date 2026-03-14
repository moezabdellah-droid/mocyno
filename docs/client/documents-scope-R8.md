# FIX 2 — Documents client : décision de blocage R8

**Statut : ❌ CAS B — BLOQUÉ**  
**Date : 14 mars 2026**

## Constat

La collection `documents` n'existe dans **aucun fichier** du codebase :
- Aucune référence dans `admin/src/` (pages, hooks, services)
- Aucune référence dans `apps/clients/src/`
- Aucune règle dans `firestore.rules`
- Aucun type dans `packages/types/src/index.ts`
- Aucun appel Firestore dans `mobile/src/`

## Pourquoi c'est bloquant

Ouvrir une collection côté client sans :
1. **Modèle de données confirmé** (champs, types, cardinalité)
2. **Clé d'isolation identifiée** (`siteId`, `clientId`, autre)
3. **Règle Firestore serveur** (`resource.data.X == clientX()`)

…constituerait une ouverture hasardeuse non conforme au garde-fou B.

## Ce qui manque pour débloquer en R9+

| Prérequis | Détail |
|---|---|
| **Modèle de données** | Définir ce qu'est un "document client" : contrat, rapport, notice, facture ? |
| **Clé d'isolation** | `siteId` suffit-il ? Ou faut-il un `clientId` distinct ? |
| **Collection réelle** | Créer la collection dans Firestore avec des données test |
| **Règle Firestore** | `allow read: if isClient() && resource.data.siteId == clientSiteId()` (pattern R6) |
| **Type TypeScript** | Ajouter `interface ClientDocument` dans `@mocyno/types` |
| **Page client** | Créer `DocumentsPage.tsx` une fois les points ci-dessus validés |

## Décision

**Documents client reporté à R9** — à condition que le modèle et les données soient d'abord définis.
