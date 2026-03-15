import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { logger, classifyError, formatDate } from '../utils/logger';

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
    const [statusFilter, setStatusFilter] = useState('all');

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
            logger.error('RequestsPage.create', err);
            setError(classifyError(err));
        } finally {
            setSubmitting(false);
        }
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
                                    <span className={`status-badge status-${req.status}`}>{statusLabel(req.status)}</span>
                                </div>
                                {req.message && <p className="detail-card-body">{req.message}</p>}
                                <div className="detail-card-footer">
                                    <span className="detail-date">📅 {formatDate(req.createdAt)}</span>
                                    {req.priority && <span className="detail-priority">Priorité : {req.priority}</span>}
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
