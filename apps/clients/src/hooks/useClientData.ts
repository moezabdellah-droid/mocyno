import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Agent } from '@mocyno/types';

/**
 * Charge le document agents/{uid} du client connecté.
 * Fournit siteId et mustChangePassword pour le routage applicatif.
 */
export function useClientData(uid: string | null) {
    const [clientData, setClientData] = useState<Agent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!uid) { setLoading(false); return; }
        getDoc(doc(db, 'agents', uid))
            .then((snap) => {
                if (snap.exists()) {
                    setClientData({ id: snap.id, ...snap.data() } as Agent);
                } else {
                    setError('Profil client introuvable.');
                }
            })
            .catch(() => setError('Erreur de chargement du profil.'))
            .finally(() => setLoading(false));
    }, [uid]);

    return { clientData, loading, error };
}
