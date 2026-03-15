import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { logger, classifyError, toJsDate, formatDate } from '../utils/logger';
import { CONSIGNE_STATUS, statusLabel } from '../utils/statusMap';
import { showToast } from '../components/Toast';

interface ConsignesPageProps {
    clientId: string;
}

interface Consigne {
    id: string;
    title: string;
    type?: string;
    content?: string;
    targetId?: string;
    siteName?: string;
    source?: string;
    status?: string;
    createdAt?: unknown;
    [key: string]: unknown;
}

const TYPE_LABELS: Record<string, string> = {
    general: 'Générale',
    metier: 'Métier',
    site: 'Site',
    service: 'Service',
};

/**
 * R12 — ConsignesPage
 * Charge les sites rattachés au client (4-query dedup comme SitesPage),
 * puis récupère les consignes liées via targetId.
 */
const ConsignesPage: React.FC<ConsignesPageProps> = ({ clientId }) => {
    const [consignes, setConsignes] = useState<Consigne[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [typeFilter, setTypeFilter] = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [formTitle, setFormTitle] = useState('');
    const [formType, setFormType] = useState('site');
    const [formContent, setFormContent] = useState('');
    const [formSiteId, setFormSiteId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [sitesMap, setSitesMap] = useState<Map<string, string>>(new Map());



    useEffect(() => {
        const fetchConsignes = async () => {
            try {
                // 1. Fetch client's sites (same 4-query approach as SitesPage)
                const sitesCol = collection(db, 'sites');
                const siteQueries = [
                    query(sitesCol, where('clientIds', 'array-contains', clientId)),
                    query(sitesCol, where('authorizedClients', 'array-contains', clientId)),
                    query(sitesCol, where('primaryClientId', '==', clientId)),
                    query(sitesCol, where('clientId', '==', clientId)),
                ];
                const siteResults = await Promise.all(siteQueries.map(q => getDocs(q)));
                const sitesMap = new Map<string, string>();
                for (const snapshot of siteResults) {
                    for (const d of snapshot.docs) {
                        if (!sitesMap.has(d.id)) {
                            sitesMap.set(d.id, (d.data().name as string) || d.id);
                        }
                    }
                }

                if (sitesMap.size === 0) {
                    setConsignes([]);
                    setLoading(false);
                    return;
                }

                // 2. Fetch consignes for all client sites
                //    Firestore 'in' supports up to 30 values
                const siteIds = Array.from(sitesMap.keys());
                const chunks: string[][] = [];
                for (let i = 0; i < siteIds.length; i += 30) {
                    chunks.push(siteIds.slice(i, i + 30));
                }

                const allConsignes: Consigne[] = [];
                for (const chunk of chunks) {
                    const q = query(
                        collection(db, 'consignes'),
                        where('targetId', 'in', chunk),
                        orderBy('createdAt', 'desc')
                    );
                    const snapshot = await getDocs(q);
                    for (const d of snapshot.docs) {
                        const data = d.data();
                        allConsignes.push({
                            id: d.id,
                            ...data,
                            siteName: sitesMap.get(data.targetId as string) || (data.targetId as string),
                        } as Consigne);
                    }
                }

                // Sort by createdAt desc (in case of multiple chunks)
                allConsignes.sort((a, b) => {
                    const da = toJsDate(a.createdAt);
                    const db2 = toJsDate(b.createdAt);
                    if (!da || !db2) return 0;
                    return db2.getTime() - da.getTime();
                });

                setConsignes(allConsignes);
                setSitesMap(sitesMap);
            } catch (err) {
                logger.error('ConsignesPage.fetch', err);
                setError(classifyError(err));
            } finally {
                setLoading(false);
            }
        };
        fetchConsignes();
    }, [clientId]);

    const handleCreateConsigne = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formTitle.trim() || !formSiteId) return;
        setSubmitting(true);
        try {
            await addDoc(collection(db, 'consignes'), {
                title: formTitle.trim(),
                type: formType,
                content: formContent.trim() || null,
                targetId: formSiteId,
                clientId,
                source: 'client',
                status: 'pending',
                createdBy: clientId,
                createdAt: serverTimestamp(),
            });
            setFormTitle('');
            setFormContent('');
            setFormSiteId('');
            setShowForm(false);
            showToast('Votre consigne a été enregistrée et sera examinée.');
            // Refetch
            setLoading(true);
            window.location.reload();
        } catch (err) {
            logger.error('ConsignesPage.create', err);
            alert('Erreur lors de la cr\u00e9ation de la consigne.');
        } finally {
            setSubmitting(false);
        }
    };

    const stripHtml = (html: string): string => {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    };

    if (loading) return <div className="page-loading">Chargement des consignes…</div>;
    if (error) return <div className="page-error">{error}</div>;

    return (
        <div className="page-content">
            <div className="page-header">
                <h2>Consignes</h2>
                {sitesMap.size > 0 && (
                    <button onClick={() => setShowForm(!showForm)} className="action-btn primary">
                        {showForm ? 'Annuler' : '+ Ajouter une consigne'}
                    </button>
                )}
            </div>

            {showForm && (
                <form onSubmit={handleCreateConsigne} className="inline-form">
                    <p style={{fontSize:'0.8rem',color:'#9ca3af',marginBottom:'0.5rem'}}>
                        ℹ️ Cette consigne sera marquée comme « ajoutée par le client ».
                    </p>
                    <div className="form-group">
                        <label htmlFor="con-site">Site concerné *</label>
                        <select id="con-site" value={formSiteId} onChange={e => setFormSiteId(e.target.value)} required>
                            <option value="">— Sélectionnez un site —</option>
                            {Array.from(sitesMap.entries()).map(([id, name]) => (
                                <option key={id} value={id}>{name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-row">
                        <div className="form-group" style={{flex:2}}>
                            <label htmlFor="con-title">Titre *</label>
                            <input id="con-title" type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} required placeholder="Ex: Vérifier portail arrière" />
                        </div>
                        <div className="form-group" style={{flex:1}}>
                            <label htmlFor="con-type">Type</label>
                            <select id="con-type" value={formType} onChange={e => setFormType(e.target.value)}>
                                <option value="site">Site</option>
                                <option value="general">Générale</option>
                                <option value="service">Service</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="con-content">Contenu</label>
                        <textarea id="con-content" value={formContent} onChange={e => setFormContent(e.target.value)} rows={3} placeholder="Détail de la consigne (optionnel)" />
                    </div>
                    <button type="submit" disabled={submitting} className="action-btn primary">
                        {submitting ? 'Envoi…' : 'Créer la consigne'}
                    </button>
                </form>
            )}

            <div className="filter-bar">
                <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                    <option value="all">Tous les types</option>
                    <option value="general">Générale</option>
                    <option value="metier">Métier</option>
                    <option value="site">Site</option>
                    <option value="service">Service</option>
                </select>
                <span className="filter-count">{consignes.filter(c => typeFilter === 'all' || c.type === typeFilter).length} / {consignes.length}</span>
            </div>
            {consignes.length === 0 ? (
                <p className="empty-state">Aucune consigne disponible pour vos sites.</p>
            ) : (
                <div className="consignes-list">
                    {consignes.filter(c => typeFilter === 'all' || c.type === typeFilter).map(c => (
                        <div key={c.id} className={`consigne-card${expandedId === c.id ? ' expanded' : ''}`}>
                            <div
                                className="consigne-header"
                                onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                            >
                                <div className="consigne-title-row">
                                    <span className={`consigne-type-badge type-${c.type || 'general'}`}>
                                        {TYPE_LABELS[c.type || 'general'] || c.type}
                                    </span>
                                    <strong className="consigne-title">{c.title}</strong>
                                </div>
                                <div className="consigne-meta">
                                    <span className="consigne-site">{c.siteName}</span>
                                    <span className="consigne-date">{formatDate(c.createdAt)}</span>
                                    {c.source === 'client' && (
                                        <span className="doc-status" style={{background: (CONSIGNE_STATUS[c.status || 'pending']?.color || '#f59e0b') + '22', color: CONSIGNE_STATUS[c.status || 'pending']?.color || '#f59e0b'}}>
                                            {statusLabel(CONSIGNE_STATUS, c.status || 'pending')}
                                        </span>
                                    )}
                                    <span className="consigne-chevron">{expandedId === c.id ? '▲' : '▼'}</span>
                                </div>
                            </div>
                            {expandedId === c.id && c.content && (
                                <div className="consigne-body">
                                    {c.content.includes('<') ? (
                                        <div dangerouslySetInnerHTML={{ __html: c.content }} />
                                    ) : (
                                        <p>{c.content}</p>
                                    )}
                                </div>
                            )}
                            {expandedId !== c.id && c.content && (
                                <p className="consigne-preview">{stripHtml(c.content).substring(0, 120)}…</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ConsignesPage;
