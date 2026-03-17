# Mo'Cyno — Politique de Maintenance

> A33 — 17 mars 2026

## Principes

1. **Lire avant de modifier** — vérifier l'usage réel avant de toucher un champ, une rule ou un index
2. **Corriger seulement le prouvé** — pas de nettoyage spéculatif
3. **Documenter plutôt que supprimer** — si un champ est douteux, le documenter dans DATA-CONVENTIONS.md plutôt que le supprimer brutalement
4. **1 fix = 1 commit** — atomicité stricte
5. **Pas de déploiement sans gate** — PROD-GATE obligatoire pour hosting, rules, functions

## Ajout d'un nouveau champ

1. Ajouter le champ dans `@mocyno/types` (`packages/types/src/index.ts`)
2. Rebuild types : `cd packages/types && npx tsc`
3. Valider les builds impactés : `pnpm qa:admin` / `qa:client` / `qa:mobile`
4. Si le champ est cross-surface (admin + mobile + portail), le documenter dans `DATA-CONVENTIONS.md`
5. Si le champ touche les rules, mettre à jour `firestore.rules` ou `storage.rules`
6. Si les rules changent → déployer avec `firebase deploy --only firestore:rules`

## Dépréciation d'un champ

1. Vérifier tous les usages : `grep -r "champName" admin/src apps/clients/src mobile/src functions/`
2. Si aucun usage → supprimer du type, rebuild, valider builds
3. Si encore utilisé pour compatibilité → marquer `/** @deprecated */` dans le type et documenter dans DATA-CONVENTIONS.md
4. Ne jamais supprimer un champ de Firestore rules si des documents existants l'utilisent encore

## Modification d'un index

1. Modifier `firestore.indexes.json`
2. Vérifier que la query correspondante existe dans le code
3. Commit séparé
4. Déployer avec `firebase deploy --only firestore:indexes` (action explicite)
5. ⚠️ Ne pas confondre "versionné" et "déployé" — noter l'état dans le rapport

## Nettoyage d'un reliquat

1. Prouver l'orphelinat (grep, usage rules, usage functions)
2. Si confirmé orphelin et sans impact runtime → supprimer
3. Si encore potentiellement utile → documenter dans HOUSEKEEPING-BASELINE.md
4. Si artefact généré (dist, bundles) → ajouter à `.gitignore` plutôt que supprimer manuellement

## PROD-GATE

### Quand déclencher
- Après tout round de modifications
- Avant tout `firebase deploy`
- Après toute modification de rules/indexes/functions

### Séquence
1. `git status --short` — working tree
2. `git diff --name-only` — fichiers modifiés
3. Isoler le hors-scope si nécessaire (`git stash push -m "..."`)
4. Déployer (`firebase deploy --only <target>`)
5. Restaurer le stash si utilisé
6. Vérifier live (curl des URLs)

### Cibles de déploiement

| Cible | Commande | Scope |
|---|---|---|
| Hosting | `firebase deploy --only hosting` | public/** |
| Rules | `firebase deploy --only firestore:rules` | firestore.rules |
| Storage rules | `firebase deploy --only storage` | storage.rules |
| Functions | `firebase deploy --only functions` | functions/ |
| Indexes | `firebase deploy --only firestore:indexes` | firestore.indexes.json |

## Documentation d'un comportement de compatibilité

Si un comportement est conservé uniquement pour compatibilité :
1. Ajouter un commentaire `// COMPAT: raison` dans le code
2. Documenter dans DATA-CONVENTIONS.md section "Champs legacy tolérés"
3. Créer une entrée HOUSEKEEPING-BASELINE.md si le comportement devrait être revu

## Artefacts générés

| Artefact | Généré par | Gitignore |
|---|---|---|
| `packages/types/dist/` | `npx tsc` | ✅ Ignoré |
| `public/{admin,clients,mobile}/` | Vite build | Non (commités volontairement pour hosting) |
| `node_modules/` | pnpm install | ✅ Ignoré |

## Copies locales de types (dette technique)

`admin/src/types/models.ts` et `mobile/src/types/shared.ts` sont des copies divergentes de `@mocyno/types`. À progressivement supprimer en faveur de l'import partagé.

**Règle** : ne pas ajouter de nouveau type dans ces fichiers locaux. Tout nouveau type va dans `@mocyno/types`.
