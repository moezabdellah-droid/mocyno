import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { logger, toJsDate, formatDate } from '../utils/logger';
import { REQUEST_STATUS, REPORT_STATUS } from '../utils/statusMap';

interface DashboardPageProps {
    clientId: string;
    clientName: string;
    onNavigate: (tab: string) => void;
}

interface DashboardCard {
    label: string;
    value: string | number;
    icon: string;
    tab: string;
    detail?: string;
}

/**
 * R14 — DashboardPage
 * Synthèse opérationnelle: compteurs + aperçus récents + raccourcis.
 */
const DashboardPage: React.FC<DashboardPageProps> = ({ clientId, clientName, onNavigate }) => {
    const [cards, setCards] = useState<DashboardCard[]>([]);
    const [nextShift, setNextShift] = useState<string | null>(null);
    const [recentRequests, setRecentRequests] = useState<{ title: string; status: string; date: string }[]>([]);
    const [recentReports, setRecentReports] = useState<{ title: string; status: string; date: string }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                // Parallel queries — all lightweight
                const [sitesSnap, docsSnap, reqSnap, repSnap, planSnap] = await Promise.all([
                    // Sites count (4-query dedup)
                    getDocs(query(collection(db, 'sites'), where('clientId', '==', clientId))),
                    // Documents count
                    getDocs(query(collection(db, 'documents'), where('clientId', '==', clientId), where('visibility.client', '==', true))),
                    // Recent requests
                    getDocs(query(collection(db, 'clientRequests'), where('clientId', '==', clientId), orderBy('createdAt', 'desc'), limit(3))),
                    // Recent reports
                    getDocs(query(collection(db, 'reports'), where('clientId', '==', clientId), orderBy('createdAt', 'desc'), limit(3))),
                    // Next planning
                    getDocs(query(collection(db, 'shiftSegments'), where('clientId', '==', clientId), orderBy('startTimestamp', 'desc'), limit(5))),
                ]);

                // Also count sites from other link fields
                const [s2, s3] = await Promise.all([
                    getDocs(query(collection(db, 'sites'), where('clientIds', 'array-contains', clientId))),
                    getDocs(query(collection(db, 'sites'), where('authorizedClients', 'array-contains', clientId))),
                ]);
                const siteIds = new Set<string>();
                [sitesSnap, s2, s3].forEach(snap => snap.docs.forEach(d => siteIds.add(d.id)));

                const pendingReqs = reqSnap.docs.filter(d => d.data().status === 'pending').length;
                const openReports = repSnap.docs.filter(d => ['open', 'in_progress'].includes(d.data().status)).length;

                // Next shift
                const now = new Date();
                let nextShiftLabel: string | null = null;
                for (const d of planSnap.docs) {
                    const ts = toJsDate(d.data().startTimestamp);
                    if (ts && ts > now) {
                        nextShiftLabel = formatDate(d.data().startTimestamp);
                        break;
                    }
                }
                setNextShift(nextShiftLabel);

                setCards([
                    { label: 'Sites', value: siteIds.size, icon: '🏢', tab: 'sites' },
                    { label: 'Documents', value: docsSnap.size, icon: '📄', tab: 'documents' },
                    { label: 'Demandes en attente', value: pendingReqs, icon: '📝', tab: 'requests', detail: `${reqSnap.size} total` },
                    { label: 'Incidents ouverts', value: openReports, icon: '⚠️', tab: 'reports', detail: `${repSnap.size} total` },
                ]);

                setRecentRequests(reqSnap.docs.slice(0, 3).map(d => {
                    const data = d.data();
                    const statusMap: Record<string, string> = Object.fromEntries(Object.entries(REQUEST_STATUS).map(([k, v]) => [k, v.label]));
                    return {
                        title: data.title as string,
                        status: statusMap[data.status as string] || (data.status as string),
                        date: formatDate(data.createdAt),
                    };
                }));

                setRecentReports(repSnap.docs.slice(0, 3).map(d => {
                    const data = d.data();
                    const repStatusMap: Record<string, string> = Object.fromEntries(Object.entries(REPORT_STATUS).map(([k, v]) => [k, v.label]));
                    return {
                        title: data.title as string,
                        status: repStatusMap[data.status as string] || (data.status as string),
                        date: formatDate(data.createdAt),
                    };
                }));
            } catch (err) {
                logger.error('DashboardPage.load', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [clientId]);

    if (loading) return <div className="page-loading">Chargement du tableau de bord…</div>;

    const greeting = new Date().getHours() < 12 ? 'Bonjour' : new Date().getHours() < 18 ? 'Bon après-midi' : 'Bonsoir';

    return (
        <div className="page-content dashboard-page">
            <h2>{greeting}, {clientName} 👋</h2>

            {nextShift && (
                <div className="dashboard-banner" onClick={() => onNavigate('planning')}>
                    <span className="banner-icon">📅</span>
                    <span>Prochaine intervention prévue : <strong>{nextShift}</strong></span>
                    <span className="banner-arrow">→</span>
                </div>
            )}

            <div className="dashboard-cards">
                {cards.map(c => (
                    <button key={c.tab} className="dash-card" onClick={() => onNavigate(c.tab)}>
                        <span className="dash-icon">{c.icon}</span>
                        <span className="dash-value">{c.value}</span>
                        <span className="dash-label">{c.label}</span>
                        {c.detail && <span className="dash-detail">{c.detail}</span>}
                    </button>
                ))}
            </div>

            {recentRequests.length > 0 && (
                <div className="dashboard-section">
                    <div className="section-header">
                        <h3>Demandes récentes</h3>
                        <button className="link-btn" onClick={() => onNavigate('requests')}>Voir tout →</button>
                    </div>
                    <div className="recent-list">
                        {recentRequests.map((r, i) => (
                            <div key={i} className="recent-item">
                                <span className="recent-title">{r.title}</span>
                                <span className="recent-meta">
                                    <span className={`mini-badge status-${(r.status || '').toLowerCase().replace(/\s/g, '_')}`}>{r.status}</span>
                                    <span>{r.date}</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {recentReports.length > 0 && (
                <div className="dashboard-section">
                    <div className="section-header">
                        <h3>Incidents récents</h3>
                        <button className="link-btn" onClick={() => onNavigate('reports')}>Voir tout →</button>
                    </div>
                    <div className="recent-list">
                        {recentReports.map((r, i) => (
                            <div key={i} className="recent-item">
                                <span className="recent-title">{r.title}</span>
                                <span className="recent-meta">
                                    <span className={`mini-badge status-${(r.status || '').toLowerCase().replace(/\s/g, '_')}`}>{r.status}</span>
                                    <span>{r.date}</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="dashboard-shortcuts">
                <button className="shortcut-btn" onClick={() => onNavigate('planning')}>📅 Planning</button>
                <button className="shortcut-btn" onClick={() => onNavigate('consignes')}>📋 Consignes</button>
                <button className="shortcut-btn" onClick={() => onNavigate('requests')}>+ Nouvelle demande</button>
                <button className="shortcut-btn" onClick={() => onNavigate('reporting')}>📊 Reporting</button>
            </div>
        </div>
    );
};

export default DashboardPage;
