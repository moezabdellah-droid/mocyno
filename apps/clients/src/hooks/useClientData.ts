import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { logger } from '../utils/logger';

interface ClientProfile {
    id: string;
    authUid: string;
    email: string;
    firstName: string;
    lastName: string;
    companyName?: string;
    role: string;
    status: string;
    mustChangePassword?: boolean;
    portalAccess?: boolean;
}

interface ClientClaims {
    role: string;
    clientId: string;
}

interface UseClientDataResult {
    user: User | null;
    claims: ClientClaims | null;
    clientId: string | null;
    clientProfile: ClientProfile | null;
    loading: boolean;
    error: string | null;
}

/**
 * R10C — Hook d'identité client avancé.
 * Modèle: claims { role:'client', clientId } + clients/{clientId}
 *
 * 1. Écoute onAuthStateChanged
 * 2. Lit getIdTokenResult() → extrait role + clientId
 * 3. Charge clients/{clientId} depuis Firestore
 */
export function useClientData(): UseClientDataResult {
    const [user, setUser] = useState<User | null>(null);
    const [claims, setClaims] = useState<ClientClaims | null>(null);
    const [clientId, setClientId] = useState<string | null>(null);
    const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (!firebaseUser) {
                setUser(null);
                setClaims(null);
                setClientId(null);
                setClientProfile(null);
                setLoading(false);
                setError(null);
                return;
            }

            setUser(firebaseUser);
            setLoading(true);
            setError(null);

            try {
                // 1. Read custom claims
                const tokenResult = await firebaseUser.getIdTokenResult();
                const role = (tokenResult.claims.role as string) || '';
                const cId = (tokenResult.claims.clientId as string) || '';

                if (role !== 'client' || !cId) {
                    setError('Accès refusé. Ce compte n\'est pas un compte client.');
                    setClaims(null);
                    setClientId(null);
                    setClientProfile(null);
                    setLoading(false);
                    return;
                }

                setClaims({ role, clientId: cId });
                setClientId(cId);

                // 2. Load client profile from clients/{clientId}
                const snap = await getDoc(doc(db, 'clients', cId));
                if (snap.exists()) {
                    setClientProfile({ id: snap.id, ...snap.data() } as ClientProfile);
                } else {
                    setError('Profil client introuvable. Contactez votre administrateur.');
                    setClientProfile(null);
                }
            } catch (err) {
                logger.error('useClientData', err);
                setError('Erreur de chargement du profil client.');
            } finally {
                setLoading(false);
            }
        });

        return unsubscribe;
    }, []);

    return { user, claims, clientId, clientProfile, loading, error };
}
