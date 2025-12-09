import type { AuthProvider } from 'react-admin';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    type User,
    setPersistence,
    browserSessionPersistence,
    type AuthError
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase.config';

// Helper to get user-friendly error messages
const getAuthErrorMessage = (error: AuthError): string => {
    switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            return 'Email ou mot de passe incorrect';
        case 'auth/too-many-requests':
            return 'Trop de tentatives. Veuillez réessayer plus tard';
        case 'auth/network-request-failed':
            return 'Erreur réseau. Vérifiez votre connexion';
        case 'auth/invalid-email':
            return 'Email invalide';
        default:
            return 'Erreur de connexion. Veuillez réessayer';
    }
};

export const authProvider: AuthProvider = {
    login: async ({ username, password }) => {
        try {
            await setPersistence(auth, browserSessionPersistence);
            await signInWithEmailAndPassword(auth, username, password);
            return Promise.resolve();
        } catch (error) {
            const authError = error as AuthError;
            const message = getAuthErrorMessage(authError);
            console.error('Login error:', authError.code);
            return Promise.reject(new Error(message));
        }
    },

    logout: async () => {
        try {
            await signOut(auth);
            return Promise.resolve();
        } catch (error) {
            console.error('Logout error:', error);
            return Promise.reject(new Error('Erreur lors de la déconnexion'));
        }
    },

    checkError: (error) => {
        if (error.status === 401 || error.status === 403) {
            return Promise.reject(new Error('Session expirée. Veuillez vous reconnecter'));
        }
        return Promise.resolve();
    },

    checkAuth: () => {
        return new Promise((resolve, reject) => {
            const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
                unsubscribe();
                if (user) {
                    resolve();
                } else {
                    reject(new Error('Non authentifié'));
                }
            });
        });
    },

    getPermissions: async () => {
        const user = auth.currentUser;
        if (!user) {
            return Promise.reject(new Error('Utilisateur non connecté'));
        }

        try {
            const userDoc = await getDoc(doc(db, 'agents', user.uid));

            if (userDoc.exists()) {
                const userData = userDoc.data();
                return Promise.resolve(userData.role || 'agent');
            }

            return Promise.resolve('agent');
        } catch (error) {
            console.error('Error fetching permissions:', error);
            return Promise.resolve('agent');
        }
    },

    getIdentity: async () => {
        const user = auth.currentUser;
        if (user) {
            return Promise.resolve({
                id: user.uid,
                fullName: user.displayName || user.email || 'Admin',
                avatar: user.photoURL || undefined,
            });
        }
        return Promise.reject(new Error('Utilisateur non connecté'));
    }
};
