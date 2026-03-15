import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { Consigne } from '@mocyno/types';

interface ConsignesPageProps {
    siteId: string;
}

const priorityLabel: Record<string, string> = {
    high: '🔴 Urgent',
    medium: '🟡 Normal',
    low: '🟢 Info',
};

const ConsignesPage: React.FC<ConsignesPageProps> = ({ siteId }) => {
    const [consignes, setConsignes] = useState<Consigne[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const q = query(
            collection(db, 'consignes'),
            where('targetId', '==', siteId),
            orderBy('createdAt', 'desc')
        );
        getDocs(q)
            .then((snap) => {
                setConsignes(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Consigne));
            })
            .catch(() => setError('Impossible de charger les consignes.'))
            .finally(() => setLoading(false));
    }, [siteId]);

    return (
        <div className="page-container">
            <h2 className="page-title">Consignes</h2>
            {loading && <div className="loading-spinner" />}
            {error && <p className="error-text">{error}</p>}
            {!loading && !error && consignes.length === 0 && (
                <p className="empty-text">Aucune consigne pour ce site.</p>
            )}
            <ul className="consignes-list">
                {consignes.map((c) => (
                    <li key={c.id} className={`consigne-card priority-${c.priority ?? 'low'}`}>
                        <div className="consigne-header">
                            <span className="consigne-title">{c.title}</span>
                            {c.priority && (
                                <span className="consigne-badge">{priorityLabel[c.priority]}</span>
                            )}
                        </div>
                        <p className="consigne-content">{c.content}</p>
                        {c.createdAt && (
                            <span className="consigne-date">
                                {new Date(c.createdAt as string).toLocaleDateString('fr-FR')}
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ConsignesPage;
