const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json'); // You need to download this from Firebase Console

// Or for Emulator usage (no key needed if env var set, but this script is for manual run)
// To run against emulator: export FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099" && export FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"

// For now, let's assume we run this with `firebase functions:shell` or similar context, 
// OR we just provide the instruction.

// This script is intended to be run locally with admin credentials.

async function seedMoez() {
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            // databaseURL: "..."
        });
    }

    const email = 'moez@mocyno.com'; // Assumed email based on name
    const password = 'Admin';
    const displayName = 'Moez';

    try {
        // 1. Create Auth User
        console.log(`Creating user ${email}...`);
        let userRecord;
        try {
            userRecord = await admin.auth().getUserByEmail(email);
            console.log("User already exists, updating password...");
            await admin.auth().updateUser(userRecord.uid, { password });
        } catch (e) {
            userRecord = await admin.auth().createUser({
                email,
                password,
                displayName
            });
        }

        // 2. Set Admin Role in Firestore
        console.log(`Setting admin role for ${userRecord.uid}...`);
        await admin.firestore().collection('agents').doc(userRecord.uid).set({
            firstName: 'Moez',
            lastName: 'Admin',
            email,
            role: 'admin',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'active'
        }, { merge: true });

        console.log("Success! Moez is now Admin.");
    } catch (e) {
        console.error("Error:", e);
    }
}

seedMoez();
