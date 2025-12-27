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
            const userCredential = await signInWithEmailAndPassword(auth, username, password);
            const user = userCredential.user;

            // Check Role immediately
            const userDoc = await getDoc(doc(db, 'agents', user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const role = userData.role || 'agent';

                if (role !== 'admin' && role !== 'manager') {
                    await signOut(auth);
                    throw new Error('Accès refusé. Réservé aux administrateurs.');
                }
            } else {
                // No agent doc? Block access just in case
                await signOut(auth);
                throw new Error('Compte agent introuvable.');
            }

            return Promise.resolve();
        } catch (error) {
            const authError = error as AuthError | Error;
            // If it's our custom error, preserve message
            if (authError instanceof Error && !('code' in authError)) {
                return Promise.reject(authError);
            }
            // Firebase Auth Errors
            return Promise.reject(new Error(getAuthErrorMessage(authError as AuthError)));
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
            const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
                unsubscribe();
                if (user) {
                    // Double check role here? 
                    // To avoid spamming Firestore reads on every nav, we rely on getPermissions or component-level checks.
                    // However, to be strict, we can just resolve. 
                    // If getPermissions fails, the user will be kicked out anyway.
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
                const role = userData.role || 'agent';
                console.log('[authProvider] Resolved role:', role); // Keep log for diagnostics

                if (role === 'admin' || role === 'manager') {
                    return Promise.resolve(role);
                }
            }

            // Rejecting here will cause React Admin to redirect to Login
            return Promise.reject(new Error('Accès non autorisé'));
        } catch (error) {
            console.error('Error fetching permissions:', error);
            return Promise.reject(new Error('Erreur de vérification des droits'));
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
