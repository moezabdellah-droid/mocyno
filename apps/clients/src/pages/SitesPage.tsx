import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

interface SitesPageProps {
    clientId: string;
}

interface Site {
    id: string;
    name: string;
    address?: string;
    city?: string;
    postalCode?: string;
    phone?: string;
    email?: string;
    notes?: string;
    [key: string]: unknown;
}

/**
 * R10C — SitesPage
 * Affiche les sites rattachés au client via 4 queries parallèles
 * (clientIds array-contains, authorizedClients array-contains, primaryClientId ==, clientId ==)
 * puis déduplique.
 */
const SitesPage: React.FC<SitesPageProps> = ({ clientId }) => {
    const [sites, setSites] = useState<Site[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSites = async () => {
            try {
                const sitesCol = collection(db, 'sites');
                const queries = [
                    query(sitesCol, where('clientIds', 'array-contains', clientId)),
                    query(sitesCol, where('authorizedClients', 'array-contains', clientId)),
                    query(sitesCol, where('primaryClientId', '==', clientId)),
                    query(sitesCol, where('clientId', '==', clientId)),
                ];

                const results = await Promise.all(queries.map(q => getDocs(q)));
                const allSites = new Map<string, Site>();
                for (const snapshot of results) {
                    for (const d of snapshot.docs) {
                        if (!allSites.has(d.id)) {
                            allSites.set(d.id, { id: d.id, ...d.data() } as Site);
                        }
                    }
                }
                setSites(Array.from(allSites.values()));
            } catch (err) {
                console.error('Error loading sites:', err);
                setError('Erreur de chargement des sites.');
            } finally {
                setLoading(false);
            }
        };
        fetchSites();
    }, [clientId]);

    if (loading) return <div className="page-loading">Chargement des sites…</div>;
    if (error) return <div className="page-error">{error}</div>;

    return (
        <div className="page-content">
            <h2>Mes sites</h2>
            {sites.length === 0 ? (
                <div className="empty-state-box">
                    <span className="empty-icon">📍</span>
                    <p>Aucun site rattaché à votre compte.</p>
                    <span className="empty-detail">Contactez votre gestionnaire pour ajouter vos sites.</span>
                </div>
            ) : (
                <div className="cards-grid">
                    {sites.map(site => (
                        <div key={site.id} className="site-card">
                            <h3>{site.name}</h3>
                            {site.address && <p className="site-address">{site.address}</p>}
                            {(site.postalCode || site.city) && (
                                <p className="site-city">{site.postalCode} {site.city}</p>
                            )}
                            {site.phone && <p className="site-contact">📞 {site.phone}</p>}
                            {site.email && <p className="site-contact">✉ {site.email}</p>}
                            {site.notes && <p className="site-notes">{site.notes}</p>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SitesPage;
