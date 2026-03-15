import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { logger, classifyError, toJsDate, formatDate } from '../utils/logger';

interface ConsignesPageProps {
    clientId: string;
}

interface Consigne {
    id: string;
    title: string;
    type?: string;
    content?: string;
    targetId?: string;
    siteName?: string;
    createdAt?: unknown;
    [key: string]: unknown;
}

const TYPE_LABELS: Record<string, string> = {
    general: 'Générale',
    metier: 'Métier',
    site: 'Site',
    service: 'Service',
};

/**
 * R12 — ConsignesPage
 * Charge les sites rattachés au client (4-query dedup comme SitesPage),
 * puis récupère les consignes liées via targetId.
 */
const ConsignesPage: React.FC<ConsignesPageProps> = ({ clientId }) => {
    const [consignes, setConsignes] = useState<Consigne[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [typeFilter, setTypeFilter] = useState('all');



    useEffect(() => {
        const fetchConsignes = async () => {
            try {
                // 1. Fetch client's sites (same 4-query approach as SitesPage)
                const sitesCol = collection(db, 'sites');
                const siteQueries = [
                    query(sitesCol, where('clientIds', 'array-contains', clientId)),
                    query(sitesCol, where('authorizedClients', 'array-contains', clientId)),
                    query(sitesCol, where('primaryClientId', '==', clientId)),
                    query(sitesCol, where('clientId', '==', clientId)),
                ];
                const siteResults = await Promise.all(siteQueries.map(q => getDocs(q)));
                const sitesMap = new Map<string, string>();
                for (const snapshot of siteResults) {
                    for (const d of snapshot.docs) {
                        if (!sitesMap.has(d.id)) {
                            sitesMap.set(d.id, (d.data().name as string) || d.id);
                        }
                    }
                }

                if (sitesMap.size === 0) {
                    setConsignes([]);
                    setLoading(false);
                    return;
                }

                // 2. Fetch consignes for all client sites
                //    Firestore 'in' supports up to 30 values
                const siteIds = Array.from(sitesMap.keys());
                const chunks: string[][] = [];
                for (let i = 0; i < siteIds.length; i += 30) {
                    chunks.push(siteIds.slice(i, i + 30));
                }

                const allConsignes: Consigne[] = [];
                for (const chunk of chunks) {
                    const q = query(
                        collection(db, 'consignes'),
                        where('targetId', 'in', chunk),
                        orderBy('createdAt', 'desc')
                    );
                    const snapshot = await getDocs(q);
                    for (const d of snapshot.docs) {
                        const data = d.data();
                        allConsignes.push({
                            id: d.id,
                            ...data,
                            siteName: sitesMap.get(data.targetId as string) || (data.targetId as string),
                        } as Consigne);
                    }
                }

                // Sort by createdAt desc (in case of multiple chunks)
                allConsignes.sort((a, b) => {
                    const da = toJsDate(a.createdAt);
                    const db2 = toJsDate(b.createdAt);
                    if (!da || !db2) return 0;
                    return db2.getTime() - da.getTime();
                });

                setConsignes(allConsignes);
            } catch (err) {
                logger.error('ConsignesPage.fetch', err);
                setError(classifyError(err));
            } finally {
                setLoading(false);
            }
        };
        fetchConsignes();
    }, [clientId]);

    const stripHtml = (html: string): string => {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    };

    if (loading) return <div className="page-loading">Chargement des consignes…</div>;
    if (error) return <div className="page-error">{error}</div>;

    return (
        <div className="page-content">
            <h2>Consignes</h2>
            <div className="filter-bar">
                <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                    <option value="all">Tous les types</option>
                    <option value="general">Générale</option>
                    <option value="metier">Métier</option>
                    <option value="site">Site</option>
                    <option value="service">Service</option>
                </select>
                <span className="filter-count">{consignes.filter(c => typeFilter === 'all' || c.type === typeFilter).length} / {consignes.length}</span>
            </div>
            {consignes.length === 0 ? (
                <p className="empty-state">Aucune consigne disponible pour vos sites.</p>
            ) : (
                <div className="consignes-list">
                    {consignes.filter(c => typeFilter === 'all' || c.type === typeFilter).map(c => (
                        <div key={c.id} className={`consigne-card${expandedId === c.id ? ' expanded' : ''}`}>
                            <div
                                className="consigne-header"
                                onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                            >
                                <div className="consigne-title-row">
                                    <span className={`consigne-type-badge type-${c.type || 'general'}`}>
                                        {TYPE_LABELS[c.type || 'general'] || c.type}
                                    </span>
                                    <strong className="consigne-title">{c.title}</strong>
                                </div>
                                <div className="consigne-meta">
                                    <span className="consigne-site">{c.siteName}</span>
                                    <span className="consigne-date">{formatDate(c.createdAt)}</span>
                                    <span className="consigne-chevron">{expandedId === c.id ? '▲' : '▼'}</span>
                                </div>
                            </div>
                            {expandedId === c.id && c.content && (
                                <div className="consigne-body">
                                    {c.content.includes('<') ? (
                                        <div dangerouslySetInnerHTML={{ __html: c.content }} />
                                    ) : (
                                        <p>{c.content}</p>
                                    )}
                                </div>
                            )}
                            {expandedId !== c.id && c.content && (
                                <p className="consigne-preview">{stripHtml(c.content).substring(0, 120)}…</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ConsignesPage;
