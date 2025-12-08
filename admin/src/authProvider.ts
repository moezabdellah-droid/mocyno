import type { AuthProvider } from 'react-admin';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, type User, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export const authProvider: AuthProvider = {
    login: async ({ username, password }) => {
        try {
            await setPersistence(auth, browserSessionPersistence);
            await signInWithEmailAndPassword(auth, username, password);
            return Promise.resolve();
        } catch (error) {
            return Promise.reject(error);
        }
    },
    logout: () => {
        return signOut(auth);
    },
    checkError: (error) => {
        if (error.status === 401 || error.status === 403) {
            return Promise.reject();
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
                    reject();
                }
            });
        });
    },
    getPermissions: async () => {
        const user = auth.currentUser;
        if (!user) {
            return Promise.reject();
        }

        try {
            // Fetch user role from Firestore
            const userDoc = await getDoc(doc(db, 'agents', user.uid));

            if (userDoc.exists()) {
                const userData = userDoc.data();
                return Promise.resolve(userData.role || 'agent');
            }

            return Promise.resolve('agent'); // Default to agent if no role found
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
        return Promise.reject();
    }
};
