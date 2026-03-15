import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { logger, classifyError, formatDate } from '../utils/logger';

interface ReportsPageProps {
    clientId: string;
}

interface Report {
    id: string;
    title: string;
    description?: string;
    status: string;
    type?: string;
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

    const statusLabel = (status: string) => {
        const map: Record<string, string> = {
            open: 'Ouvert',
            in_progress: 'En cours',
            resolved: 'Résolu',
            closed: 'Clôturé',
        };
        return map[status] || status;
    };

    if (loading) return <div className="page-loading">Chargement des incidents…</div>;
    if (error) return <div className="page-error">{error}</div>;

    return (
        <div className="page-content">
            <h2>Incidents</h2>
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
                                    <span className={`status-badge status-${report.status}`}>{statusLabel(report.status)}</span>
                                </div>
                                {report.description && <p className="detail-card-body">{report.description}</p>}
                                <div className="detail-card-footer">
                                    <span className="detail-date">📅 {formatDate(report.createdAt)}</span>
                                    {report.type && <span className="detail-type">{report.type}</span>}
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
