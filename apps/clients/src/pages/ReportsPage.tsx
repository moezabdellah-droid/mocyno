import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { logger, classifyError, formatDate, formatTime } from '../utils/logger';
import { exportCSV, csvDate, todayISO } from '../utils/csvExport';
import { REPORT_STATUS, statusLabel as sl } from '../utils/statusMap';
import { showToast } from '../components/Toast';

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
    source?: string;
    createdAt?: { seconds: number } | string;
    [key: string]: unknown;
}

interface SiteOption { id: string; name: string; }

const INCIDENT_TYPES = [
    { value: 'intrusion', label: 'Intrusion / Tentative' },
    { value: 'degradation', label: 'Dégradation' },
    { value: 'dysfonctionnement', label: 'Dysfonctionnement' },
    { value: 'comportement', label: 'Comportement suspect' },
    { value: 'autre', label: 'Autre' },
];

const SEVERITIES = [
    { value: 'low', label: 'Faible' },
    { value: 'medium', label: 'Moyenne' },
    { value: 'high', label: 'Élevée' },
    { value: 'critical', label: 'Critique' },
];

/**
 * R19 — ReportsPage
 * Affiche les rapports d'incidents + formulaire signalement client.
 */
const ReportsPage: React.FC<ReportsPageProps> = ({ clientId }) => {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [sites, setSites] = useState<SiteOption[]>([]);
    const [formTitle, setFormTitle] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formType, setFormType] = useState('autre');
    const [formSeverity, setFormSeverity] = useState('medium');
    const [formSiteId, setFormSiteId] = useState('');
    const [submitting, setSubmitting] = useState(false);

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

    useEffect(() => {
        // Fetch sites for form
        const fetchSites = async () => {
            try {
                const sitesCol = collection(db, 'sites');
                const siteQueries = [
                    query(sitesCol, where('clientIds', 'array-contains', clientId)),
                    query(sitesCol, where('authorizedClients', 'array-contains', clientId)),
                    query(sitesCol, where('primaryClientId', '==', clientId)),
                    query(sitesCol, where('clientId', '==', clientId)),
                ];
                const results = await Promise.all(siteQueries.map(q => getDocs(q)));
                const map = new Map<string, string>();
                for (const snap of results) {
                    for (const d of snap.docs) {
                        if (!map.has(d.id)) map.set(d.id, (d.data().name as string) || d.id);
                    }
                }
                setSites(Array.from(map.entries()).map(([id, name]) => ({ id, name })));
            } catch (err) {
                logger.warn('ReportsPage.fetchSites', String(err));
            }
        };
        fetchSites();
        fetchReports();
    }, [clientId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formTitle.trim() || !formSiteId) return;
        setSubmitting(true);
        try {
            const selectedSite = sites.find(s => s.id === formSiteId);
            await addDoc(collection(db, 'reports'), {
                clientId,
                title: formTitle.trim(),
                description: formDesc.trim() || null,
                type: formType,
                severity: formSeverity,
                siteId: formSiteId,
                siteName: selectedSite?.name || null,
                source: 'client',
                status: 'open',
                createdBy: clientId,
                createdAt: serverTimestamp(),
            });
            setFormTitle('');
            setFormDesc('');
            setFormType('autre');
            setFormSeverity('medium');
            setFormSiteId('');
            setShowForm(false);
            showToast('Votre incident a été signalé. Il sera pris en charge par nos équipes.');
            setLoading(true);
            await fetchReports();
        } catch (err) {
            logger.error('ReportsPage.create', err);
            setError(classifyError(err));
        } finally {
            setSubmitting(false);
        }
    };

    const stLabel = (s: string) => sl(REPORT_STATUS, s);

    if (loading) return <div className="page-loading">Chargement des incidents…</div>;
    if (error) return <div className="page-error">{error}</div>;

    return (
        <div className="page-content">
            <div className="page-header">
                <h2>Incidents</h2>
                <div style={{display:'flex',gap:'0.5rem'}}>
                    {reports.length > 0 && <button onClick={() => {
                        exportCSV(reports.map(r => ({ titre: r.title, statut: stLabel(r.status), type: r.type || '', date: csvDate(r.createdAt), description: r.description || '' })),
                            [{ key: 'titre', label: 'Titre' }, { key: 'statut', label: 'Statut' }, { key: 'type', label: 'Type' }, { key: 'date', label: 'Date' }, { key: 'description', label: 'Description' }],
                            `mocyno-incidents-${todayISO()}.csv`);
                    }} className="action-btn">⬇ CSV</button>}
                    <button onClick={() => setShowForm(!showForm)} className="action-btn primary">
                        {showForm ? 'Annuler' : '⚠️ Signaler un incident'}
                    </button>
                </div>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="inline-form">
                    <p style={{fontSize:'0.8rem',color:'#9ca3af',marginBottom:'0.5rem'}}>
                        ℹ️ Cet incident sera signalé comme « d'origine client » et pris en charge par nos équipes.
                    </p>
                    <div className="form-group">
                        <label htmlFor="inc-site">Site concerné *</label>
                        <select id="inc-site" value={formSiteId} onChange={e => setFormSiteId(e.target.value)} required>
                            <option value="">— Sélectionnez un site —</option>
                            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="inc-title">Titre *</label>
                        <input id="inc-title" type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} required placeholder="Ex: Portail forcé secteur B" />
                    </div>
                    <div className="form-row">
                        <div className="form-group" style={{flex:1}}>
                            <label htmlFor="inc-type">Type</label>
                            <select id="inc-type" value={formType} onChange={e => setFormType(e.target.value)}>
                                {INCIDENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{flex:1}}>
                            <label htmlFor="inc-severity">Gravité</label>
                            <select id="inc-severity" value={formSeverity} onChange={e => setFormSeverity(e.target.value)}>
                                {SEVERITIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="inc-desc">Description</label>
                        <textarea id="inc-desc" value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={3} placeholder="Détaillez l'incident (optionnel)" />
                    </div>
                    <button type="submit" disabled={submitting} className="action-btn primary">
                        {submitting ? 'Envoi…' : 'Signaler l\'incident'}
                    </button>
                </form>
            )}

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
                                    {report.source === 'client' && <span className="doc-status doc-new">Client</span>}
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
