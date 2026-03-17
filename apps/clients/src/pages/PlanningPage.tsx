import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
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

                // Resolve agent names for segments missing agentName
                const unresolvedIds = [...new Set(
                    data.filter(s => !s.agentName && s.agentId).map(s => s.agentId)
                )];
                if (unresolvedIds.length > 0) {
                    const nameMap = new Map<string, string>();
                    await Promise.all(
                        unresolvedIds.map(async (aid) => {
                            try {
                                const agentSnap = await getDoc(doc(db, 'agents', aid));
                                if (agentSnap.exists()) {
                                    const ad = agentSnap.data();
                                    const name = [ad.firstName, ad.lastName].filter(Boolean).join(' ');
                                    if (name) nameMap.set(aid, name);
                                }
                            } catch { /* agent not readable by client — expected */ }
                        })
                    );
                    data.forEach(s => {
                        if (!s.agentName && nameMap.has(s.agentId)) {
                            s.agentName = nameMap.get(s.agentId);
                        }
                    });
                }

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

    const handleExportPDF = () => {
        const rows = segments.map(s => `
            <tr>
                <td>${csvDateTime(s.startTimestamp).split(' ')[0] || ''}</td>
                <td>${csvDateTime(s.startTimestamp).split(' ')[1] || ''}</td>
                <td>${csvDateTime(s.endTimestamp).split(' ')[1] || ''}</td>
                <td>${s.agentName || 'Agent affecté'}</td>
                <td>${s.siteName || s.siteId}</td>
                <td>${s.status}</td>
            </tr>`).join('');
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Planning MoCyno - ${todayISO()}</title>
            <style>
                body{font-family:system-ui,sans-serif;padding:2rem;color:#1a1a2e}
                h1{font-size:1.3rem;margin-bottom:0.25rem}
                .sub{color:#666;font-size:0.85rem;margin-bottom:1.5rem}
                table{border-collapse:collapse;width:100%;font-size:0.85rem}
                th,td{border:1px solid #ddd;padding:0.4rem 0.6rem;text-align:left}
                th{background:#f0f0f5;font-weight:600}
                @media print{body{padding:0}}
            </style></head><body>
            <h1>Planning — MoCyno</h1>
            <p class="sub">Exporté le ${new Date().toLocaleDateString('fr-FR')} — ${segments.length} créneau(x)</p>
            <table><thead><tr><th>Date</th><th>Début</th><th>Fin</th><th>Agent</th><th>Site</th><th>Statut</th></tr></thead>
            <tbody>${rows}</tbody></table>
            <script>window.onload=()=>{window.print();}<\/script>
        </body></html>`;
        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); }
    };

    return (
        <div className="page-content">
            <div className="page-header">
                <h2>Planning</h2>
                {segments.length > 0 && (
                    <div style={{display:'flex',gap:'0.5rem'}}>
                        <button onClick={handleExportCSV} className="action-btn">⬇ CSV</button>
                        <button onClick={handleExportPDF} className="action-btn">🖨 PDF</button>
                    </div>
                )}
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
                                    <td>{seg.agentName || 'Agent affecté'}</td>
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
