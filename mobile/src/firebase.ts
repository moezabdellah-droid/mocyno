import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace with your actual config
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
