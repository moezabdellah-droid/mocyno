import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

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
                console.error('Error loading reports:', err);
                setError('Erreur de chargement des incidents.');
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, [clientId]);

    const formatDate = (ts: { seconds: number } | string | undefined) => {
        if (!ts) return '—';
        try {
            const d = typeof ts === 'string' ? new Date(ts) : new Date(ts.seconds * 1000);
            return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch { return '—'; }
    };

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
            {reports.length === 0 ? (
                <p className="empty-state">Aucun incident signalé.</p>
            ) : (
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Titre</th>
                                <th>Type</th>
                                <th>Statut</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map(report => (
                                <tr key={report.id}>
                                    <td>
                                        <strong>{report.title}</strong>
                                        {report.description && <p className="row-detail">{report.description}</p>}
                                    </td>
                                    <td>{report.type || '—'}</td>
                                    <td><span className={`status-badge status-${report.status}`}>{statusLabel(report.status)}</span></td>
                                    <td>{formatDate(report.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ReportsPage;
