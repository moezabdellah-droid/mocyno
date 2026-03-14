#!/usr/bin/env node
/**
 * MoCyno — Script de provisionnement des comptes clients
 * R6 — 14 mars 2026
 *
 * Usage :
 *   node scripts/provision-client.js --email client@example.com --site SITE_ID --name "Nom Client"
 *
 * Prérequis :
 *   - Avoir GOOGLE_APPLICATION_CREDENTIALS pointant vers la clé de service Firebase
 *   - Ou avoir firebase-admin avec le projet initialisé
 *   - node scripts/provision-client.js (depuis la racine du repo)
 *
 * Ce script :
 *   1. Crée un compte Firebase Auth avec email + mot de passe temporaire
 *   2. Crée le document agents/{uid} avec role:'client' et le siteId fourni
 *   3. Affiche le mot de passe temporaire à transmettre au client (à changer à la première connexion)
 *
 * SÉCURITÉ :
 *   - Ne pas logguer le mot de passe dans un système de logs partagés
 *   - Transmettre le mot de passe par canal sécurisé (email chiffré, SMS, etc.)
 *   - Le client DOIT changer son mot de passe à la première connexion (à implémenter en R7)
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const crypto = require('crypto');

// --- Lecture des arguments CLI ---
const args = process.argv.slice(2);
const get = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };

const email = get('--email');
const siteId = get('--site');
const displayName = get('--name') || email;

if (!email || !siteId) {
    console.error('Usage: node scripts/provision-client.js --email <email> --site <siteId> [--name <nom>]');
    process.exit(1);
}

// --- Init Firebase Admin ---
// Utilise GOOGLE_APPLICATION_CREDENTIALS ou la clé de service locale
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './functions/keys/service-account.json';
let app;
try {
    app = initializeApp({ credential: cert(serviceAccountPath) });
} catch (e) {
    console.error('Erreur initialisation Firebase Admin:', e.message);
    console.error('Vérifiez GOOGLE_APPLICATION_CREDENTIALS ou la présence de functions/keys/service-account.json');
    process.exit(1);
}

const auth = getAuth(app);
const db = getFirestore(app);

// --- Génération mot de passe temporaire sécurisé ---
const tempPassword = crypto.randomBytes(10).toString('base64url').slice(0, 14) + '!';

async function provision() {
    console.log(`\n🔑 Provisionnement du compte client…`);
    console.log(`   Email   : ${email}`);
    console.log(`   Site ID : ${siteId}`);
    console.log(`   Nom     : ${displayName}`);

    // 1. Créer le compte Auth
    let userRecord;
    try {
        userRecord = await auth.createUser({ email, password: tempPassword, displayName });
        console.log(`\n✅ Compte Auth créé : ${userRecord.uid}`);
    } catch (e) {
        if (e.code === 'auth/email-already-exists') {
            userRecord = await auth.getUserByEmail(email);
            console.log(`⚠️  Compte Auth existant, mise à jour du document Firestore uniquement : ${userRecord.uid}`);
        } else {
            console.error('❌ Erreur création Auth:', e.message);
            process.exit(1);
        }
    }

    // 2. Créer/mettre à jour le document Firestore
    await db.collection('agents').doc(userRecord.uid).set({
        id: userRecord.uid,
        email,
        firstName: displayName.split(' ')[0] || '',
        lastName: displayName.split(' ').slice(1).join(' ') || '',
        role: 'client',
        siteId,
        status: 'active',
        createdAt: new Date().toISOString(),
    }, { merge: true });

    console.log(`✅ Document Firestore agents/${userRecord.uid} créé avec role:'client'`);
    console.log(`\n🔐 MOT DE PASSE TEMPORAIRE (à transmettre par canal sécurisé) :`);
    console.log(`   ${tempPassword}`);
    console.log(`\n⚠️  Ce mot de passe ne sera plus affiché. Transmettez-le immédiatement.\n`);
}

provision().catch((e) => { console.error('Erreur:', e); process.exit(1); });
