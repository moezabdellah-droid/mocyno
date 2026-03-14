import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Site } from '@mocyno/types';

interface SitePageProps {
    siteId: string;
}

const SitePage: React.FC<SitePageProps> = ({ siteId }) => {
    const [site, setSite] = useState<Site | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getDoc(doc(db, 'sites', siteId))
            .then((snap) => {
                if (snap.exists()) {
                    setSite({ id: snap.id, ...snap.data() } as Site);
                } else {
                    setError('Site introuvable.');
                }
            })
            .catch(() => setError('Impossible de charger les informations du site.'))
            .finally(() => setLoading(false));
    }, [siteId]);

    if (loading) return <div className="page-container"><div className="loading-spinner" /></div>;
    if (error) return <div className="page-container"><p className="error-text">{error}</p></div>;
    if (!site) return null;

    return (
        <div className="page-container">
            <h2 className="page-title">Mon site</h2>
            <div className="site-card">
                <h3 className="site-name">{site.name}</h3>
                {site.address && (
                    <div className="site-field">
                        <span className="site-label">Adresse</span>
                        <span>{site.address}</span>
                    </div>
                )}
                {site.clientContact && (
                    <div className="site-field">
                        <span className="site-label">Contact</span>
                        <span>{site.clientContact}</span>
                    </div>
                )}
                {site.email && (
                    <div className="site-field">
                        <span className="site-label">Email</span>
                        <a href={`mailto:${site.email}`} className="site-link">{site.email}</a>
                    </div>
                )}
                {site.notes && (
                    <div className="site-field site-notes">
                        <span className="site-label">Notes</span>
                        <p>{site.notes}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SitePage;
