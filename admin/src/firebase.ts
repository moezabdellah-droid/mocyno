import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// TODO: Replace with your actual config or load from env vars
// For local dev with emulators, config can be minimal
const firebaseConfig = {
    apiKey: "AIzaSyBgpftBp0m6rMW4_pSn_pxWgpem3Y4D3JU",
    authDomain: "mocyno.firebaseapp.com",
    projectId: "mocyno",
    storageBucket: "mocyno.firebasestorage.app",
    messagingSenderId: "962385123794",
    appId: "1:962385123794:web:38d346d7cda528b2c8900b",
    measurementId: "G-HP2SRZN42P"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Connect to emulators if needed
// import { connectAuthEmulator } from 'firebase/auth';
// import { connectFirestoreEmulator } from 'firebase/firestore';
// connectAuthEmulator(auth, "http://localhost:9099");
// connectFirestoreEmulator(db, 'localhost', 8080);
