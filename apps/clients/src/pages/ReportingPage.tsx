import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { logger, classifyError, toJsDate } from '../utils/logger';

interface ReportingPageProps {
    clientId: string;
}

type PeriodFilter = '7' | '30' | '90' | 'all';

/**
 * R16 — ReportingPage
 * Synthèse légère : créneaux par site, demandes par statut, incidents, documents.
 */
const ReportingPage: React.FC<ReportingPageProps> = ({ clientId }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState<PeriodFilter>('30');

    // Raw data
    const [segments, setSegments] = useState<Record<string, unknown>[]>([]);
    const [requests, setRequests] = useState<Record<string, unknown>[]>([]);
    const [reports, setReports] = useState<Record<string, unknown>[]>([]);
    const [documents, setDocuments] = useState<Record<string, unknown>[]>([]);

    useEffect(() => {
        const load = async () => {
            try {
                const [segSnap, reqSnap, repSnap, docSnap] = await Promise.all([
                    getDocs(query(collection(db, 'shiftSegments'), where('clientId', '==', clientId), orderBy('startTimestamp', 'desc'))),
                    getDocs(query(collection(db, 'clientRequests'), where('clientId', '==', clientId), orderBy('createdAt', 'desc'))),
                    getDocs(query(collection(db, 'reports'), where('clientId', '==', clientId), orderBy('createdAt', 'desc'))),
                    getDocs(query(collection(db, 'documents'), where('clientId', '==', clientId), where('visibility.client', '==', true))),
                ]);
                setSegments(segSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setRequests(reqSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setReports(repSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setDocuments(docSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) {
                logger.error('ReportingPage.fetch', err);
                setError(classifyError(err));
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [clientId]);

    const cutoff = useMemo(() => {
        if (period === 'all') return null;
        const d = new Date();
        d.setDate(d.getDate() - parseInt(period));
        return d;
    }, [period]);

    const inPeriod = (item: Record<string, unknown>, field: string): boolean => {
        if (!cutoff) return true;
        const raw = item[field];
        const d = toJsDate(raw);
        return d ? d >= cutoff : true;
    };

    const filteredSegments = useMemo(() => segments.filter(s => inPeriod(s, 'startTimestamp')), [segments, cutoff]);
    const filteredRequests = useMemo(() => requests.filter(r => inPeriod(r, 'createdAt')), [requests, cutoff]);
    const filteredReports = useMemo(() => reports.filter(r => inPeriod(r, 'createdAt')), [reports, cutoff]);

    // Compute breakdowns
    const segmentsBySite = useMemo(() => {
        const map: Record<string, number> = {};
        for (const s of filteredSegments) {
            const site = (s.siteName as string) || (s.siteId as string) || 'Inconnu';
            map[site] = (map[site] || 0) + 1;
        }
        return Object.entries(map).sort((a, b) => b[1] - a[1]);
    }, [filteredSegments]);

    const requestsByStatus = useMemo(() => {
        const map: Record<string, number> = {};
        for (const r of filteredRequests) {
            const st = (r.status as string) || 'inconnu';
            map[st] = (map[st] || 0) + 1;
        }
        return map;
    }, [filteredRequests]);

    const openIncidents = useMemo(() => filteredReports.filter(r => r.status === 'open' || r.status === 'in_progress').length, [filteredReports]);

    const statusLabel = (s: string) => ({ pending: 'En attente', in_progress: 'En cours', resolved: 'Résolu', closed: 'Clôturé', open: 'Ouvert' }[s] || s);
    const periodLabel = (p: PeriodFilter) => ({ '7': '7 derniers jours', '30': '30 derniers jours', '90': '90 derniers jours', all: 'Tout' }[p]);

    if (loading) return <div className="page-loading">Chargement du reporting…</div>;
    if (error) return <div className="page-error">{error}</div>;

    return (
        <div className="page-content">
            <div className="page-header">
                <h2>Reporting</h2>
                <select className="filter-select" value={period} onChange={e => setPeriod(e.target.value as PeriodFilter)}>
                    <option value="7">7 jours</option>
                    <option value="30">30 jours</option>
                    <option value="90">90 jours</option>
                    <option value="all">Tout</option>
                </select>
            </div>

            <p style={{fontSize: '0.85rem', color: '#9ca3af', marginBottom: '1rem'}}>
                Période : {periodLabel(period)}
            </p>

            {/* Summary Cards */}
            <div className="reporting-cards">
                <div className="reporting-card">
                    <span className="reporting-icon">📅</span>
                    <span className="reporting-value">{filteredSegments.length}</span>
                    <span className="reporting-label">Créneaux</span>
                </div>
                <div className="reporting-card">
                    <span className="reporting-icon">📝</span>
                    <span className="reporting-value">{filteredRequests.length}</span>
                    <span className="reporting-label">Demandes</span>
                </div>
                <div className="reporting-card">
                    <span className="reporting-icon">⚠️</span>
                    <span className="reporting-value">{filteredReports.length}</span>
                    <span className="reporting-label">Incidents</span>
                    {openIncidents > 0 && <span className="reporting-alert">{openIncidents} ouvert(s)</span>}
                </div>
                <div className="reporting-card">
                    <span className="reporting-icon">📄</span>
                    <span className="reporting-value">{documents.length}</span>
                    <span className="reporting-label">Documents</span>
                </div>
            </div>

            {/* Segments by site */}
            {segmentsBySite.length > 0 && (
                <div className="reporting-section">
                    <h3>Créneaux par site</h3>
                    <div className="reporting-bars">
                        {segmentsBySite.map(([site, count]) => (
                            <div key={site} className="reporting-bar-row">
                                <span className="reporting-bar-label">{site}</span>
                                <div className="reporting-bar-track">
                                    <div className="reporting-bar-fill" style={{ width: `${Math.min(100, (count / filteredSegments.length) * 100)}%` }} />
                                </div>
                                <span className="reporting-bar-value">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Requests by status */}
            {filteredRequests.length > 0 && (
                <div className="reporting-section">
                    <h3>Demandes par statut</h3>
                    <div className="reporting-status-grid">
                        {Object.entries(requestsByStatus).map(([st, count]) => (
                            <div key={st} className="reporting-status-item">
                                <span className={`status-badge status-${st}`}>{statusLabel(st)}</span>
                                <span className="reporting-status-count">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {filteredSegments.length === 0 && filteredRequests.length === 0 && filteredReports.length === 0 && (
                <div className="empty-state-box">
                    <span className="empty-icon">📊</span>
                    <p>Aucune donnée sur cette période.</p>
                    <span className="empty-detail">Essayez une période plus large.</span>
                </div>
            )}
        </div>
    );
};

export default ReportingPage;
