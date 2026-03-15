import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

interface RequestsPageProps {
    clientId: string;
}

interface ClientRequest {
    id: string;
    title: string;
    message?: string;
    status: string;
    priority?: string;
    createdAt?: { seconds: number } | string;
    [key: string]: unknown;
}

/**
 * R10C — RequestsPage
 * Liste les demandes du client (clientRequests) + formulaire de création.
 */
const RequestsPage: React.FC<RequestsPageProps> = ({ clientId }) => {
    const [requests, setRequests] = useState<ClientRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

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
            console.error('Error loading requests:', err);
            setError('Erreur de chargement des demandes.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRequests(); }, [clientId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        try {
            await addDoc(collection(db, 'clientRequests'), {
                clientId,
                title: title.trim(),
                message: message.trim() || null,
                status: 'pending',
                createdAt: serverTimestamp(),
            });
            setTitle('');
            setMessage('');
            setShowForm(false);
            setLoading(true);
            await fetchRequests();
        } catch (err) {
            console.error('Error creating request:', err);
            alert('Erreur lors de la création de la demande.');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (ts: { seconds: number } | string | undefined) => {
        if (!ts) return '—';
        try {
            const d = typeof ts === 'string' ? new Date(ts) : new Date(ts.seconds * 1000);
            return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch { return '—'; }
    };

    const statusLabel = (status: string) => {
        const map: Record<string, string> = {
            pending: 'En attente',
            in_progress: 'En cours',
            resolved: 'Résolu',
            closed: 'Clôturé',
        };
        return map[status] || status;
    };

    if (loading) return <div className="page-loading">Chargement des demandes…</div>;
    if (error) return <div className="page-error">{error}</div>;

    return (
        <div className="page-content">
            <div className="page-header">
                <h2>Demandes</h2>
                <button onClick={() => setShowForm(!showForm)} className="action-btn primary">
                    {showForm ? 'Annuler' : '+ Nouvelle demande'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="inline-form">
                    <div className="form-group">
                        <label htmlFor="req-title">Titre</label>
                        <input
                            id="req-title"
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                            placeholder="Objet de la demande"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="req-message">Description</label>
                        <textarea
                            id="req-message"
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            rows={3}
                            placeholder="Détaillez votre demande (optionnel)"
                        />
                    </div>
                    <button type="submit" disabled={submitting} className="action-btn primary">
                        {submitting ? 'Envoi…' : 'Envoyer'}
                    </button>
                </form>
            )}

            {requests.length === 0 ? (
                <p className="empty-state">Aucune demande pour le moment.</p>
            ) : (
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Titre</th>
                                <th>Statut</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map(req => (
                                <tr key={req.id}>
                                    <td>
                                        <strong>{req.title}</strong>
                                        {req.message && <p className="row-detail">{req.message}</p>}
                                    </td>
                                    <td><span className={`status-badge status-${req.status}`}>{statusLabel(req.status)}</span></td>
                                    <td>{formatDate(req.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default RequestsPage;
