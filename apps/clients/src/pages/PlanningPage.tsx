import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { logger, classifyError, formatDate, formatTime } from '../utils/logger';
import { exportCSV, csvDateTime, todayISO } from '../utils/csvExport';

interface PlanningPageProps {
    clientId: string;
}

interface ShiftSegment {
    id: string;
    agentId: string;
    agentName?: string;
    siteId: string;
    siteName?: string;
    startTimestamp: string;
    endTimestamp: string;
    dayKey?: string;
    status: string;
    [key: string]: unknown;
}

/**
 * R10C — PlanningPage
 * Affiche les segments de planning (shiftSegments) du client.
 * Query: shiftSegments where clientId == claims.clientId
 */
const PlanningPage: React.FC<PlanningPageProps> = ({ clientId }) => {
    const [segments, setSegments] = useState<ShiftSegment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [badgeUrl, setBadgeUrl] = useState<string | null>(null);
    const [badgeLoading, setBadgeLoading] = useState(false);

    useEffect(() => {
        const fetchSegments = async () => {
            try {
                const q = query(
                    collection(db, 'shiftSegments'),
                    where('clientId', '==', clientId),
                    orderBy('startTimestamp', 'desc')
                );
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ShiftSegment));
                setSegments(data);
            } catch (err) {
                logger.error('PlanningPage.fetch', err);
                setError(classifyError(err));
            } finally {
                setLoading(false);
            }
        };
        fetchSegments();
    }, [clientId]);

    const handleViewBadge = async (agentId: string) => {
        setBadgeLoading(true);
        setBadgeUrl(null);
        try {
            const getAgentBadgeSignedUrl = httpsCallable<{ agentId: string }, { url: string }>(
                functions, 'getAgentBadgeSignedUrl'
            );
            const result = await getAgentBadgeSignedUrl({ agentId });
            setBadgeUrl(result.data.url);
        } catch (err) {
            console.error('Badge error:', err);
            alert('Impossible de charger le badge.');
        } finally {
            setBadgeLoading(false);
        }
    };



    if (loading) return <div className="page-loading">Chargement du planning…</div>;
    if (error) return <div className="page-error">{error}</div>;

    const handleExportCSV = () => {
        const rows = segments.map(s => ({
            date: csvDateTime(s.startTimestamp).split(' ')[0] || '',
            debut: csvDateTime(s.startTimestamp).split(' ')[1] || '',
            fin: csvDateTime(s.endTimestamp).split(' ')[1] || '',
            agent: s.agentName || s.agentId,
            site: s.siteName || s.siteId,
            statut: s.status,
        }));
        exportCSV(rows, [
            { key: 'date', label: 'Date' },
            { key: 'debut', label: 'Début' },
            { key: 'fin', label: 'Fin' },
            { key: 'agent', label: 'Agent' },
            { key: 'site', label: 'Site' },
            { key: 'statut', label: 'Statut' },
        ], `mocyno-planning-${todayISO()}.csv`);
    };

    return (
        <div className="page-content">
            <div className="page-header">
                <h2>Planning</h2>
                {segments.length > 0 && <button onClick={handleExportCSV} className="action-btn">⬇ Exporter CSV</button>}
            </div>
            {segments.length === 0 ? (
                <p className="empty-state">Aucun créneau planifié pour le moment.</p>
            ) : (
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Début</th>
                                <th>Fin</th>
                                <th>Agent</th>
                                <th>Site</th>
                                <th>Statut</th>
                                <th>Badge</th>
                            </tr>
                        </thead>
                        <tbody>
                            {segments.map(seg => (
                                <tr key={seg.id}>
                                    <td>{formatDate(seg.startTimestamp)}</td>
                                    <td>{formatTime(seg.startTimestamp)}</td>
                                    <td>{formatTime(seg.endTimestamp)}</td>
                                    <td>{seg.agentName || seg.agentId}</td>
                                    <td>{seg.siteName || seg.siteId}</td>
                                    <td><span className={`status-badge status-${seg.status}`}>{seg.status}</span></td>
                                    <td>
                                        <button
                                            onClick={() => handleViewBadge(seg.agentId)}
                                            className="action-btn"
                                            disabled={badgeLoading}
                                        >
                                            Voir badge
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {badgeUrl && (
                <div className="modal-overlay" onClick={() => setBadgeUrl(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setBadgeUrl(null)}>✕</button>
                        <iframe src={badgeUrl} title="Badge agent" className="badge-iframe" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlanningPage;
