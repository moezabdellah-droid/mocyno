import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';

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

    const toJsDate = (value: unknown): Date | null => {
        if (!value) return null;
        if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
            return (value as { toDate: () => Date }).toDate();
        }
        if (typeof value === 'object' && value !== null && 'seconds' in value) {
            return new Date((value as { seconds: number }).seconds * 1000);
        }
        const d = new Date(value as string | number);
        return isNaN(d.getTime()) ? null : d;
    };

    const formatDate = (value: unknown): string => {
        const d = toJsDate(value);
        if (!d) return '—';
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

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
                console.error('Error loading documents:', err);
                setError('Erreur de chargement des documents.');
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
            console.error('Download error:', err);
            setDownloadError(`Échec du téléchargement. Réessayez ou contactez le support.`);
        } finally {
            setDownloadingId(null);
        }
    };

    if (loading) return <div className="page-loading">Chargement des documents…</div>;
    if (error) return <div className="page-error">{error}</div>;

    return (
        <div className="page-content">
            <h2>Documents</h2>
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
                            {documents.map(doc => (
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
