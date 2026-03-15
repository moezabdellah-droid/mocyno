import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { formatDate } from '../utils/logger';

interface Comment {
    id: string;
    text: string;
    authorId: string;
    authorRole: 'client' | 'admin' | 'support';
    createdAt?: unknown;
}

interface CommentThreadProps {
    parentCollection: string;
    parentId: string;
    clientId: string;
    canWrite?: boolean;
}

/**
 * R19 — Lightweight comment thread using sub-collection `comments`.
 */
const CommentThread: React.FC<CommentThreadProps> = ({ parentCollection, parentId, clientId, canWrite = true }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [sending, setSending] = useState(false);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (!expanded) return;
        const fetchComments = async () => {
            try {
                const q = query(
                    collection(db, parentCollection, parentId, 'comments'),
                    orderBy('createdAt', 'asc')
                );
                const snap = await getDocs(q);
                setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
            } catch {
                // silent — sub-collection may not exist yet
            }
        };
        fetchComments();
    }, [parentCollection, parentId, expanded]);

    const handleSend = async () => {
        if (!newComment.trim()) return;
        setSending(true);
        try {
            await addDoc(collection(db, parentCollection, parentId, 'comments'), {
                text: newComment.trim(),
                authorId: clientId,
                authorRole: 'client',
                createdAt: serverTimestamp(),
            });
            setNewComment('');
            // Refetch
            const q = query(
                collection(db, parentCollection, parentId, 'comments'),
                orderBy('createdAt', 'asc')
            );
            const snap = await getDocs(q);
            setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
        } catch {
            // silent
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="comment-thread">
            <button
                className="link-btn"
                onClick={() => setExpanded(!expanded)}
                style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}
            >
                {expanded ? '▲ Masquer les échanges' : `💬 Échanges (${comments.length || '…'})`}
            </button>
            {expanded && (
                <div className="comment-list" style={{ marginTop: '0.5rem' }}>
                    {comments.length === 0 && (
                        <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Aucun échange pour le moment.</p>
                    )}
                    {comments.map(c => (
                        <div key={c.id} className="comment-item" style={{
                            padding: '0.4rem 0.6rem',
                            background: c.authorRole === 'client' ? '#1e293b' : '#0f172a',
                            borderRadius: '6px',
                            marginBottom: '0.3rem',
                            borderLeft: c.authorRole === 'client' ? '3px solid #3b82f6' : '3px solid #10b981',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#9ca3af' }}>
                                <span>{c.authorRole === 'client' ? '👤 Vous' : '🛡️ Support'}</span>
                                <span>{formatDate(c.createdAt)}</span>
                            </div>
                            <p style={{ fontSize: '0.8rem', margin: '0.25rem 0 0', color: '#e2e8f0' }}>{c.text}</p>
                        </div>
                    ))}
                    {canWrite && (
                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                            <input
                                type="text"
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                                placeholder="Ajouter un commentaire…"
                                style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem', borderRadius: '4px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0' }}
                            />
                            <button onClick={handleSend} disabled={sending} className="action-btn" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                                {sending ? '…' : 'Envoyer'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CommentThread;
