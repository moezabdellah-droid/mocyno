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
    fileName?: string;
    fileSize?: number;
    createdAt?: unknown;
    uploadedAt?: unknown;
    [key: string]: unknown;
}

/**
 * R12 — DocumentsPage enrichi
 * Affiche les documents visibles pour le client (visibility.client == true).
 * Téléchargement via getDocumentSignedUrl callable.
 * Améliorations: Timestamp handling, fileSize, uploadedAt, download error inline.
 */
const DocumentsPage: React.FC<DocumentsPageProps> = ({ clientId }) => {
    const [documents, setDocuments] = useState<ClientDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [downloadError, setDownloadError] = useState<string | null>(null);
    const [search, setSearch] = useState('');


    const formatFileSize = (bytes?: number): string => {
        if (!bytes || bytes <= 0) return '—';
        if (bytes < 1024) return `${bytes} o`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
    };

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

    return (
        <div className="page-content">
            <h2>Documents</h2>
            <div className="filter-bar">
                <input type="text" className="filter-input" placeholder="Rechercher par nom ou type…" value={search} onChange={e => setSearch(e.target.value)} />
                <span className="filter-count">{(() => { const s = search.toLowerCase(); const filtered = documents.filter(d => !s || d.name.toLowerCase().includes(s) || (d.type || '').toLowerCase().includes(s) || (d.fileName || '').toLowerCase().includes(s)); return `${filtered.length} / ${documents.length}`; })()}</span>
            </div>
            {downloadError && (
                <div className="inline-error">
                    {downloadError}
                    <button className="dismiss-btn" onClick={() => setDownloadError(null)}>✕</button>
                </div>
            )}
            {documents.length === 0 ? (
                <p className="empty-state">Aucun document disponible.</p>
            ) : (
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Nom</th>
                                <th>Type</th>
                                <th>Taille</th>
                                <th>Date</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {documents.filter(d => { const s = search.toLowerCase(); return !s || d.name.toLowerCase().includes(s) || (d.type || '').toLowerCase().includes(s) || (d.fileName || '').toLowerCase().includes(s); }).map(doc => (
                                <tr key={doc.id}>
                                    <td>
                                        <span className="doc-name">{doc.name}</span>
                                        {doc.fileName && doc.fileName !== doc.name && (
                                            <span className="doc-filename">{doc.fileName}</span>
                                        )}
                                    </td>
                                    <td><span className="doc-type-badge">{doc.type || '—'}</span></td>
                                    <td>{formatFileSize(doc.fileSize)}</td>
                                    <td>{formatDate(doc.uploadedAt || doc.createdAt)}</td>
                                    <td>
                                        <button
                                            onClick={() => handleDownload(doc.id)}
                                            className="action-btn"
                                            disabled={downloadingId === doc.id}
                                        >
                                            {downloadingId === doc.id ? (
                                                <><span className="btn-spinner" /> Chargement…</>
                                            ) : (
                                                '⬇ Télécharger'
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default DocumentsPage;
