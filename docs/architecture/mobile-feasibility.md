# Audit de Faisabilité Mobile — Offline / Push FCM / PWA
*Date : 14 mars 2026 — R4 MoCyno Staging*

## État actuel

| Élément | Présent | Détail |
|---|---|---|
| Service Worker | ❌ | `mobile/public/` : `logo.webp` + `vite.svg` uniquement |
| `manifest.json` | ❌ | Absent du projet |
| Dépendances Push/FCM | ❌ | `@capacitor/push-notifications`, `firebase-messaging`, `workbox` : non installés |
| Persistance Firestore offline | ❌ | Aucun appel `enableIndexedDbPersistence` / `enableMultiTabIndexedDbPersistence` |
| Base Capacitor | ✅ | `@capacitor/camera`, `@capacitor/geolocation` déjà utilisés |
| Firebase 11.x | ✅ | Compatible Messaging et offline |

---

## Axe 1 — Mode Offline

**État actuel :** L'app suppose une connexion réseau active. Tous les `onSnapshot`, `getDocs`, `addDoc` sont directs sans fallback local.

**Prérequis manquants :**
- `enableIndexedDbPersistence(db)` dans `mobile/src/firebase.ts` (ou `enableMultiTabIndexedDbPersistence`)
- Identifier les flux qui nécessitent une résolution offline (lecture planning, consignes)
- Gérer les conflits de synchronisation (création locale de rapport → sync différée)

**Collisions potentielles :**
- `ReportsPage.tsx` : l'upload Storage échoue silencieusement offline → nécessite une queue locale (IndexedDB ou Capacitor Storage)
- `PtiService.ts` : les `addDoc(events)` en cas de SOS offline → perte critique

**Difficulté :** Moyenne-haute (flux temps réel + upload photo + SOS critique)  
**Faisabilité :** ⚠️ Moyenne — réalisable mais exige un round dédié avec spec des flux offline

---

## Axe 2 — Push FCM

**État actuel :** Aucun push dans le projet. Firebase Messaging absent.

**Prérequis manquants :**
- `@capacitor/push-notifications` (Capacitor natif) ou `firebase/messaging` (PWA web)
- Service Worker enregistré (`firebase-messaging-sw.js`)
- Clé VAPID configurée dans Firebase Console
- Cloud Function pour envoyer les notifications
- Gestion des tokens FCM par agent (champ `fcmToken` dans Firestore)

**Collisions potentielles :**
- `PtiService.ts` : SOS peut déclencher une notif admin → nécessite la Cloud Function
- Permissions camera + géoloc déjà demandées → ajouter permissions push sans conflit

**Difficulté :** Haute (SW + Cloud Function + tokens + natif Capacitor)  
**Faisabilité :** ⚠️ Moyenne — réalisable si scope limité (notif SOS admin uniquement)

---

## Axe 3 — PWA

**État actuel :** App Vite/React sans configuration PWA. Pas de `manifest.json`, pas de SW.

**Prérequis manquants :**
- Plugin `vite-plugin-pwa` (Workbox) dans `mobile/vite.config.ts`
- `manifest.json` (nom, icônes, thème, display)
- Stratégie de cache (cache-first pour assets, network-first pour API Firestore)
- Icônes PWA (plusieurs sizes)

**Collisions potentielles :**
- `base: '/mobile/'` dans vite.config → scope SW doit matcher `/mobile/`
- Firebase Hosting doit servir le SW avec bon header `Service-Worker-Allowed`

**Difficulté :** Faible-Moyenne (principalement config Vite + assets)  
**Faisabilité :** ✅ Bonne — peut être fait en 1 round ciblé sans toucher au code métier

---

## Recommandation d'ordre

1. **PWA** en premier (faible risque, indépendant, améliore l'installabilité)
2. **Push FCM** (dépend du SW PWA — à faire après)
3. **Offline** en dernier (scope le plus large, dépend des décisions métier sur les flux critiques)

---

*Ce document est un cadrage technique. Aucune implémentation dans R4.*
