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
    createdAt?: { seconds: number } | string;
    [key: string]: unknown;
}

/**
 * R10C — DocumentsPage
 * Affiche les documents visibles pour le client (visibility.client == true).
 * Téléchargement via getDocumentSignedUrl callable.
 */
const DocumentsPage: React.FC<DocumentsPageProps> = ({ clientId }) => {
    const [documents, setDocuments] = useState<ClientDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

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
        try {
            const getDocumentSignedUrl = httpsCallable<{ documentId: string }, { url: string }>(
                functions, 'getDocumentSignedUrl'
            );
            const result = await getDocumentSignedUrl({ documentId });
            window.open(result.data.url, '_blank');
        } catch (err) {
            console.error('Download error:', err);
            alert('Impossible de télécharger ce document.');
        } finally {
            setDownloadingId(null);
        }
    };

    const formatDate = (ts: { seconds: number } | string | undefined) => {
        if (!ts) return '—';
        try {
            const d = typeof ts === 'string' ? new Date(ts) : new Date(ts.seconds * 1000);
            return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch { return '—'; }
    };

    if (loading) return <div className="page-loading">Chargement des documents…</div>;
    if (error) return <div className="page-error">{error}</div>;

    return (
        <div className="page-content">
            <h2>Documents</h2>
            {documents.length === 0 ? (
                <p className="empty-state">Aucun document disponible.</p>
            ) : (
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Nom</th>
                                <th>Type</th>
                                <th>Date</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {documents.map(doc => (
                                <tr key={doc.id}>
                                    <td>{doc.name}</td>
                                    <td>{doc.type || '—'}</td>
                                    <td>{formatDate(doc.createdAt)}</td>
                                    <td>
                                        <button
                                            onClick={() => handleDownload(doc.id)}
                                            className="action-btn"
                                            disabled={downloadingId === doc.id}
                                        >
                                            {downloadingId === doc.id ? 'Chargement…' : 'Télécharger'}
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
