import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { logger, classifyError, formatDate } from '../utils/logger';
import { exportCSV, csvDate, todayISO } from '../utils/csvExport';
import { REQUEST_STATUS, statusLabel as sl } from '../utils/statusMap';
import { showToast } from '../components/Toast';
import { uploadClientFile } from '../utils/uploadFile';

interface RequestsPageProps {
    clientId: string;
}

interface ClientRequest {
    id: string;
    title: string;
    message?: string;
    status: string;
    priority?: string;
    category?: string;
    siteId?: string;
    siteName?: string;
    createdAt?: { seconds: number } | string;
    [key: string]: unknown;
}

interface SiteOption { id: string; name: string; }

const CATEGORIES = [
    { value: '', label: '— Aucune —' },
    { value: 'planning', label: 'Planning' },
    { value: 'facturation', label: 'Facturation' },
    { value: 'remplacement', label: 'Remplacement agent' },
    { value: 'incident', label: 'Incident / Signalement' },
    { value: 'contrat', label: 'Contrat / Administratif' },
    { value: 'autre', label: 'Autre' },
];

const PRIORITIES = [
    { value: 'normal', label: 'Normale' },
    { value: 'high', label: 'Haute' },
    { value: 'urgent', label: 'Urgente' },
];

/**
 * R17 — RequestsPage
 * Formulaire structuré : titre, catégorie, priorité, site, message.
 */
const RequestsPage: React.FC<RequestsPageProps> = ({ clientId }) => {
    const [requests, setRequests] = useState<ClientRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [priority, setPriority] = useState('normal');
    const [category, setCategory] = useState('');
    const [siteId, setSiteId] = useState('');
    const [formFile, setFormFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [sites, setSites] = useState<SiteOption[]>([]);

    const fetchRequests = async () => {
        try {
            const q = query(
                collection(db, 'clientRequests'),
                where('clientId', '==', clientId),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            setRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClientRequest)));
        } catch (err) {
            logger.error('RequestsPage.fetch', err);
            setError(classifyError(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Fetch sites for the selector
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
                logger.warn('RequestsPage.fetchSites', String(err));
            }
        };
        fetchSites();
        fetchRequests();
    }, [clientId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        try {
            const selectedSite = sites.find(s => s.id === siteId);
            let attachment: { url: string; path: string; fileName: string } | null = null;
            if (formFile) {
                attachment = await uploadClientFile(clientId, formFile, 'request');
            }
            await addDoc(collection(db, 'clientRequests'), {
                clientId,
                title: title.trim(),
                message: message.trim() || null,
                priority,
                category: category || null,
                siteId: siteId || null,
                siteName: selectedSite?.name || null,
                status: 'pending',
                createdAt: serverTimestamp(),
                ...(attachment ? { attachmentUrl: attachment.url, attachmentPath: attachment.path, attachmentName: attachment.fileName } : {}),
            });
            setTitle('');
            setMessage('');
            setPriority('normal');
            setCategory('');
            setSiteId('');
            setFormFile(null);
            setShowForm(false);
            showToast('Votre demande a bien été envoyée.');
            setLoading(true);
            await fetchRequests();
        } catch (err) {
            logger.error('RequestsPage.create', err);
            setError(classifyError(err));
        } finally {
            setSubmitting(false);
        }
    };

    const stLabel = (s: string) => sl(REQUEST_STATUS, s);

    const priorityLabel = (p?: string) => {
        if (!p || p === 'normal') return null;
        return p === 'urgent' ? '🔴 Urgente' : '🟠 Haute';
    };

    const categoryLabel = (c?: string) => {
        if (!c) return null;
        return CATEGORIES.find(cat => cat.value === c)?.label || c;
    };

    if (loading) return <div className="page-loading">Chargement des demandes…</div>;
    if (error) return <div className="page-error">{error}</div>;

    return (
        <div className="page-content">
            <div className="page-header">
                <h2>Demandes</h2>
                <div style={{display:'flex',gap:'0.5rem'}}>
                    {requests.length > 0 && <button onClick={() => {
                        exportCSV(requests.map(r => ({
                            titre: r.title, statut: stLabel(r.status),
                            priorite: r.priority || 'normal',
                            categorie: categoryLabel(r.category) || '',
                            site: r.siteName || '',
                            date: csvDate(r.createdAt), message: r.message || ''
                        })),
                            [{ key: 'titre', label: 'Titre' }, { key: 'statut', label: 'Statut' }, { key: 'priorite', label: 'Priorité' }, { key: 'categorie', label: 'Catégorie' }, { key: 'site', label: 'Site' }, { key: 'date', label: 'Date' }, { key: 'message', label: 'Message' }],
                            `mocyno-demandes-${todayISO()}.csv`);
                    }} className="action-btn">⬇ CSV</button>}
                    <button onClick={() => setShowForm(!showForm)} className="action-btn primary">
                        {showForm ? 'Annuler' : '+ Nouvelle demande'}
                    </button>
                </div>
            </div>

            <div className="filter-bar">
                <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">Tous les statuts</option>
                    <option value="pending">En attente</option>
                    <option value="in_progress">En cours</option>
                    <option value="resolved">Résolu</option>
                    <option value="closed">Clôturé</option>
                </select>
                <span className="filter-count">{requests.filter(r => statusFilter === 'all' || r.status === statusFilter).length} / {requests.length}</span>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="inline-form">
                    <div className="form-group">
                        <label htmlFor="req-title">Titre *</label>
                        <input id="req-title" type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Objet de la demande" />
                    </div>
                    <div className="form-row">
                        <div className="form-group" style={{flex:1}}>
                            <label htmlFor="req-category">Catégorie</label>
                            <select id="req-category" value={category} onChange={e => setCategory(e.target.value)}>
                                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{flex:1}}>
                            <label htmlFor="req-priority">Priorité</label>
                            <select id="req-priority" value={priority} onChange={e => setPriority(e.target.value)}>
                                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                        </div>
                    </div>
                    {sites.length > 0 && (
                        <div className="form-group">
                            <label htmlFor="req-site">Site concerné</label>
                            <select id="req-site" value={siteId} onChange={e => setSiteId(e.target.value)}>
                                <option value="">— Aucun (général) —</option>
                                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="form-group">
                        <label htmlFor="req-message">Description</label>
                        <textarea id="req-message" value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="Détaillez votre demande (optionnel)" />
                    </div>
                    <div className="form-group">
                        <label htmlFor="req-file">Pièce jointe (optionnel, max 5 Mo)</label>
                        <input id="req-file" type="file" onChange={e => setFormFile(e.target.files?.[0] || null)} accept="image/*,.pdf,.doc,.docx" />
                    </div>
                    <button type="submit" disabled={submitting} className="action-btn primary">
                        {submitting ? 'Envoi…' : 'Envoyer'}
                    </button>
                </form>
            )}

            {(() => {
                const filtered = requests.filter(r => statusFilter === 'all' || r.status === statusFilter);
                if (requests.length === 0) {
                    return (
                        <div className="empty-state-box">
                            <span className="empty-icon">📝</span>
                            <p>Aucune demande pour le moment.</p>
                            <button onClick={() => setShowForm(true)} className="action-btn primary">Créer une demande</button>
                        </div>
                    );
                }
                if (filtered.length === 0) {
                    return <p className="empty-state">Aucune demande ne correspond au filtre sélectionné.</p>;
                }
                return (
                    <div className="detail-cards">
                        {filtered.map(req => (
                            <div key={req.id} className="detail-card">
                                <div className="detail-card-header">
                                    <strong className="detail-card-title">{req.title}</strong>
                                    <span className={`status-badge status-${req.status}`}>{stLabel(req.status)}</span>
                                </div>
                                {req.message && <p className="detail-card-body">{req.message}</p>}
                                <div className="detail-card-footer">
                                    <span className="detail-date">📅 {formatDate(req.createdAt)}</span>
                                    {req.siteName && <span className="detail-type">📍 {req.siteName}</span>}
                                    {categoryLabel(req.category) && <span className="detail-type">{categoryLabel(req.category)}</span>}
                                    {priorityLabel(req.priority) && <span className="detail-priority">{priorityLabel(req.priority)}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })()}
        </div>
    );
};

export default RequestsPage;
