import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { logger, classifyError, formatDate } from '../utils/logger';

interface DocumentsPageProps {
    clientId: string;
}

interface ClientDocument {
    id: string;
    name: string;
    storagePath?: string;
    type?: string;
    category?: string;
    fileName?: string;
    fileSize?: number;
    description?: string;
    createdAt?: unknown;
    uploadedAt?: unknown;
    [key: string]: unknown;
}

const TYPE_ICONS: Record<string, string> = {
    facture: '🧾', invoice: '🧾', contrat: '📜', contract: '📜',
    rapport: '📊', report: '📊', devis: '💰', quote: '💰',
    attestation: '🏅', certificat: '🏅', planning: '📅',
    procedure: '📋', consigne: '📋', default: '📄',
};

const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes <= 0) return '—';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

const getTypeIcon = (type?: string): string => {
    if (!type) return TYPE_ICONS.default;
    const key = type.toLowerCase();
    return TYPE_ICONS[key] || TYPE_ICONS.default;
};

const getFileExt = (fileName?: string, storagePath?: string): string => {
    const path = fileName || storagePath || '';
    const dot = path.lastIndexOf('.');
    return dot > 0 ? path.slice(dot + 1).toUpperCase() : '';
};

/**
 * R15 — DocumentsPage enrichi
 * Card layout avec métadonnées enrichies, type badges, et traçabilité.
 */
const DocumentsPage: React.FC<DocumentsPageProps> = ({ clientId }) => {
    const [documents, setDocuments] = useState<ClientDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [downloadError, setDownloadError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchDocuments = async () => {
            try {
                const q = query(
                    collection(db, 'documents'),
                    where('clientId', '==', clientId),
                    where('visibility.client', '==', true),
                    orderBy('createdAt', 'desc')
                );
                const snapshot = await getDocs(q);
                setDocuments(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClientDocument)));
            } catch (err) {
                logger.error('DocumentsPage.fetch', err);
                setError(classifyError(err));
            } finally {
                setLoading(false);
            }
        };
        fetchDocuments();
    }, [clientId]);

    const handleDownload = async (documentId: string) => {
        setDownloadingId(documentId);
        setDownloadError(null);
        try {
            const getDocumentSignedUrl = httpsCallable<{ documentId: string }, { url: string }>(
                functions, 'getDocumentSignedUrl'
            );
            const result = await getDocumentSignedUrl({ documentId });
            window.open(result.data.url, '_blank');
        } catch (err) {
            logger.error('DocumentsPage.download', err);
            setDownloadError('Échec du téléchargement. Réessayez ou contactez le support.');
        } finally {
            setDownloadingId(null);
        }
    };

    if (loading) return <div className="page-loading">Chargement des documents…</div>;
    if (error) return <div className="page-error">{error}</div>;

    const s = search.toLowerCase();
    const filtered = documents.filter(d => !s || d.name.toLowerCase().includes(s) || (d.type || '').toLowerCase().includes(s) || (d.fileName || '').toLowerCase().includes(s));

    return (
        <div className="page-content">
            <h2>Documents</h2>
            <div className="filter-bar">
                <input type="text" className="filter-input" placeholder="Rechercher par nom ou type…" value={search} onChange={e => setSearch(e.target.value)} />
                <span className="filter-count">{filtered.length} / {documents.length}</span>
            </div>
            {downloadError && (
                <div className="inline-error">
                    {downloadError}
                    <button className="dismiss-btn" onClick={() => setDownloadError(null)}>✕</button>
                </div>
            )}
            {documents.length === 0 ? (
                <div className="empty-state-box">
                    <span className="empty-icon">📄</span>
                    <p>Aucun document disponible.</p>
                    <span className="empty-detail">Les documents partagés apparaîtront ici.</span>
                </div>
            ) : filtered.length === 0 ? (
                <p className="empty-state">Aucun document ne correspond à la recherche.</p>
            ) : (
                <div className="detail-cards">
                    {filtered.map(doc => {
                        const ext = getFileExt(doc.fileName, doc.storagePath);
                        return (
                            <div key={doc.id} className="detail-card doc-card">
                                <div className="detail-card-header">
                                    <div className="doc-card-left">
                                        <span className="doc-icon">{getTypeIcon(doc.type)}</span>
                                        <div>
                                            <strong className="detail-card-title">{doc.name}</strong>
                                            {doc.fileName && doc.fileName !== doc.name && (
                                                <span className="doc-filename">{doc.fileName}</span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDownload(doc.id)}
                                        className="action-btn"
                                        disabled={downloadingId === doc.id}
                                    >
                                        {downloadingId === doc.id ? (
                                            <><span className="btn-spinner" /> …</>
                                        ) : (
                                            '⬇ Télécharger'
                                        )}
                                    </button>
                                </div>
                                {doc.description && <p className="detail-card-body">{doc.description}</p>}
                                <div className="detail-card-footer">
                                    {doc.type && <span className="detail-type">{doc.type}</span>}
                                    {ext && <span className="doc-ext">{ext}</span>}
                                    <span>{formatFileSize(doc.fileSize)}</span>
                                    <span className="detail-date">📅 {formatDate(doc.uploadedAt || doc.createdAt)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default DocumentsPage;
