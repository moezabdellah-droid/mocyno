# Pré-cadrage Technique — Portail Client MoCyno
*Date : 14 mars 2026 — R4 MoCyno Staging*

## État de apps/clients/

`apps/clients/` contient uniquement :
- `node_modules/` (dépendances installées localement)
- `.env.local` (config locale)

**Conclusion : amorce vide, aucune structure applicative existante.**

---

## Stack cible recommandée

| Élément | Recommandation | Justification |
|---|---|---|
| Framework | **Vite + React + TypeScript** | Cohérent avec admin et mobile |
| UI | **Ionic React** (mobile-first) ou **MUI** (desktop) | À décider selon usage cible (mobile agent vs desktop gestionnaire) |
| Auth | **Firebase Auth** (email/password) | Déjà configuré, Firestore rules prêtes |
| Data | **Firebase Firestore** (SDK web) | Même config que admin/mobile |
| Types | **@mocyno/types** | Package partagé déjà enrichi en R2/R3 |
| Hosting | **Firebase Hosting** `/client/` path | Cohérent avec `/admin/` et `/mobile/` |

---

## Point d'entrée applicatif suggéré

```
apps/clients/
  src/
    firebase.ts          (auth + db — même pattern que mobile)
    App.tsx
    pages/
      LoginPage.tsx
      ContractPage.tsx   (vision des contrats du site)
      DocumentsPage.tsx  (documents accessibles)
    components/
  index.html
  vite.config.ts         (outDir: '../../public/client', base: '/client/')
```

---

## Auth prévue

- Firebase Auth email/password (même provider que admin + mobile)
- Rôle Firestore dédié : `'client'` (à ajouter dans les règles Firestore)
- Isolation par `siteId` : chaque compte client ne voit que son site

**Blocage actuel :** Les règles Firestore ne définissent pas de rôle `client`. À ajouter avant build.

---

## Collections exploitables (visibles dans le code actuel)

| Collection | Lisible par client ? | Condition |
|---|---|---|
| `consignes` | ⚠️ Partiel | Actuellement `isAuthenticated()` — nécessite filtre par `siteId` |
| `planning` | ⚠️ Partiel | `isAuthenticated()` — client ne doit voir que son site |
| `events` | ❌ | Main courante — données internes, à exclure |
| `sites` | ✅ Lecture | `isAuthenticated()` — client peut lire son propre site |
| `agents` | ❌ | Données RH/privées — hors scope client |

---

## Blocages techniques à lever avant build

1. **Firestore rules** : ajouter rôle `client` + isoler par `siteId`
   ```
   function isClient() { return hasRole('client'); }
   match /consignes/{id} {
     allow read: if isClient() && resource.data.siteId == getUserData().siteId;
   }
   ```

2. **Auth Firebase** : provisionner les comptes clients (admin panel ou script)

3. **`@mocyno/types`** : ajouter `role: 'client'` dans `Agent.role` union type (ou créer un type `ClientAccount` dédié)

4. **Firebase Hosting** : ajouter une section `hosting` pour `/client/` dans `firebase.json`

5. **`packages/types/dist/`** : rebuildir après chaque enrichissement de types (rappel R4)

---

## Faisabilité globale

**Faisabilité : ✅ Bonne** — la stack est identique à l'existant, les dépendances sont disponibles, seules les règles Firestore et un scaffold minimal restent à créer.

**Effort estimé :** 1 round de build dédié (R5 ou R6) avec 4 commits atomiques :
1. Règles Firestore client
2. Scaffold Vite + firebase.ts
3. LoginPage + routing
4. Pages métier minimales (contrat, documents)

---

*Ce document est un cadrage technique. Aucun scaffold créé dans R4.*
