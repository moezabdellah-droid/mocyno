import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface AgentMeta {
    authorId: string;
    authorEmail: string | null;
    agentName: string | null;
    siteId: string | null;
    siteName: string | null;
}

/**
 * Shared hook to load agent metadata for event enrichment.
 * Used by ReportsPage, ScanPage, and any future field event flow.
 */
export function useAgentMeta(): AgentMeta {
    const [meta, setMeta] = useState<AgentMeta>({
        authorId: '',
        authorEmail: null,
        agentName: null,
        siteId: null,
        siteName: null,
    });

    useEffect(() => {
        const loadMeta = async () => {
            const user = auth.currentUser;
            if (!user) return;

            const baseMeta: AgentMeta = {
                authorId: user.uid,
                authorEmail: user.email,
                agentName: null,
                siteId: null,
                siteName: null,
            };

            try {
                const agentSnap = await getDoc(doc(db, 'agents', user.uid));
                if (agentSnap.exists()) {
                    const d = agentSnap.data();
                    baseMeta.agentName = [d.firstName, d.lastName].filter(Boolean).join(' ') || null;
                    baseMeta.siteId = d.siteId || null;
                    baseMeta.siteName = d.siteName || null;
                }
            } catch (e) {
                console.error('Failed to load agent metadata:', e);
            }

            setMeta(baseMeta);
        };
        loadMeta();
    }, []);

    return meta;
}
