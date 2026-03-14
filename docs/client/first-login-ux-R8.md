# FIX 3 — UX Premier Login : comparatif et décision R8

**Date : 14 mars 2026**

## Flux actuel (R7) — Option A : mot de passe temporaire

```
provision-client.js
  → Auth.createUser(email, tempPassword)
  → Firestore agents/{uid} { mustChangePassword: true }
  → transmettre tempPassword par canal sécurisé

Premier login client :
  → App.tsx détecte mustChangePassword === true
  → redirige vers ChangePasswordPage
  → updatePassword(user, newPassword)
  → updateDoc(agents/{uid}, { mustChangePassword: false })
  → reload → accès normal
```

## Option B : sendPasswordResetEmail

```
provision-client.js
  → Auth.createUser(email, randomPassword)
  → sendPasswordResetEmail(email)
  → client reçoit un lien par email valable 1h (Firebase default)
  → client clique, définit son mot de passe via UI Firebase (externe)
  → premier login normal
  → mustChangePassword non nécessaire
```

## Comparatif A vs B

| Critère | Option A (actuel) | Option B (reset email) |
|---|---|---|
| **Traçabilité** | ✅ Totale — flag Firestore | ⚠️ Partielle — email Firebase |
| **Sécurité mdp** | ✅ Forcé dans l'app | ✅ Forcé via lien signé Firebase |
| **UX client** | ⚠️ Transmission mdp par canal externe | ✅ Email direct, standard |
| **Côté admin** | ✅ CLI autonome | ✅ CLI autonome (1 appel supplémentaire) |
| **Dépendances** | ✅ Aucune nouvelle | ✅ Firebase Auth (existant) |
| **Expiration** | ❌ mdp temporaire illimité si non changé | ✅ Lien expire en 1h (default Firebase) |
| **Comptes existants** | — | ⚠️ Comptes R6/R7 déjà provisionnés sans lien |
| **Complexité R8** | ✅ 0 ligne de code | ⚠️ Modification script + suppression ChangePasswordPage si on abandonne |
| **Risque régression** | ✅ Aucun | ⚠️ Demi-transition dangereuse si incomplète |

## Décision R8

**Option A conservée** pour les raisons suivantes :

1. **`sendPasswordResetEmail` absent du codebase** — aucune infrastructure email de test disponible en staging
2. **Comptes déjà provisionnés** avec `mustChangePassword: true` — une bascule partielle créerait deux comportements coexistants non gérés
3. **Lien Firebase expirant** — si le client ne clique pas dans l'heure, re-provisionnement nécessaire, complexifiant le support
4. **Pas de demi-transition** — le garde-fou C interdit de supprimer le flux actuel sans flux complet de remplacement

## Améliorations mineures possibles en R8 (sans casser A)

La seule limite réelle de l'Option A est le **mot de passe temporaire illimité** si non changé.

Option minimale sûre applicable dès R8 :
- Ajouter `provisionedAt: ISO_DATE` dans le document Firestore
- Un Admin peut identifier les comptes jamais connectés (mustChangePassword toujours true)
- Aucune limite technique forcée côté Auth sans Cloud Function dédiée (hors scope R8)

**Verdict : Option A maintenue, aucune modification runtime. Améliorations mineures reportées à R9 si nécessaire.**
