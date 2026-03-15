import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { logger, classifyError, formatDate, formatTime } from '../utils/logger';
import { exportCSV, csvDate, todayISO } from '../utils/csvExport';
import { REPORT_STATUS, statusLabel as sl } from '../utils/statusMap';

interface ReportsPageProps {
    clientId: string;
}

interface Report {
    id: string;
    title: string;
    description?: string;
    status: string;
    type?: string;
    siteId?: string;
    siteName?: string;
    severity?: string;
    createdAt?: { seconds: number } | string;
    [key: string]: unknown;
}

/**
 * R10C — ReportsPage
 * Affiche les rapports d'incidents (reports) du client — lecture seule.
 * ⚠️ Create côté client non confirmé → readonly dans ce round.
 */
const ReportsPage: React.FC<ReportsPageProps> = ({ clientId }) => {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const q = query(
                    collection(db, 'reports'),
                    where('clientId', '==', clientId),
                    orderBy('createdAt', 'desc')
                );
                const snapshot = await getDocs(q);
                setReports(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Report)));
            } catch (err) {
                logger.error('ReportsPage.fetch', err);
                setError(classifyError(err));
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, [clientId]);

    const stLabel = (s: string) => sl(REPORT_STATUS, s);

    if (loading) return <div className="page-loading">Chargement des incidents…</div>;
    if (error) return <div className="page-error">{error}</div>;

    return (
        <div className="page-content">
            <div className="page-header">
                <h2>Incidents</h2>
                {reports.length > 0 && <button onClick={() => {
                    exportCSV(reports.map(r => ({ titre: r.title, statut: stLabel(r.status), type: r.type || '', date: csvDate(r.createdAt), description: r.description || '' })),
                        [{ key: 'titre', label: 'Titre' }, { key: 'statut', label: 'Statut' }, { key: 'type', label: 'Type' }, { key: 'date', label: 'Date' }, { key: 'description', label: 'Description' }],
                        `mocyno-incidents-${todayISO()}.csv`);
                }} className="action-btn">⬇ CSV</button>}
            </div>
            <div className="filter-bar">
                <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">Tous les statuts</option>
                    <option value="open">Ouvert</option>
                    <option value="in_progress">En cours</option>
                    <option value="resolved">Résolu</option>
                    <option value="closed">Clôturé</option>
                </select>
                <span className="filter-count">{reports.filter(r => statusFilter === 'all' || r.status === statusFilter).length} / {reports.length}</span>
            </div>
            {(() => {
                const filtered = reports.filter(r => statusFilter === 'all' || r.status === statusFilter);
                if (reports.length === 0) {
                    return (
                        <div className="empty-state-box">
                            <span className="empty-icon">✅</span>
                            <p>Aucun incident signalé.</p>
                            <span className="empty-detail">Les incidents apparaîtront ici automatiquement.</span>
                        </div>
                    );
                }
                if (filtered.length === 0) {
                    return <p className="empty-state">Aucun incident ne correspond au filtre sélectionné.</p>;
                }
                return (
                    <div className="detail-cards">
                        {filtered.map(report => (
                            <div key={report.id} className="detail-card">
                                <div className="detail-card-header">
                                    <strong className="detail-card-title">{report.title}</strong>
                                    <span className={`status-badge status-${report.status}`}>{stLabel(report.status)}</span>
                                </div>
                                {report.description && <p className="detail-card-body">{report.description}</p>}
                                <div className="detail-card-footer">
                                    <span className="detail-date">📅 {formatDate(report.createdAt)}{report.createdAt ? ` à ${formatTime(report.createdAt)}` : ''}</span>
                                    {report.siteName && <span className="detail-type">📍 {report.siteName}</span>}
                                    {!report.siteName && report.siteId && <span className="detail-type">📍 {report.siteId}</span>}
                                    {report.type && <span className="detail-type">{report.type}</span>}
                                    {report.severity && <span className="detail-priority">{report.severity === 'critical' ? '🔴 Critique' : report.severity === 'high' ? '🟠 Élevée' : ''}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })()}
        </div>
    );
};

export default ReportsPage;
