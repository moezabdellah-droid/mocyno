import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.config';
import { Box, Typography, TextField, Button, Chip, Paper, Divider } from '@mui/material';

interface Comment {
    id: string;
    text: string;
    author: string;
    role?: string;
    createdAt?: { seconds: number };
}

interface AdminCommentThreadProps {
    parentCollection: string;
    parentId: string;
}

/**
 * A23 — Lightweight comment thread for admin show views.
 * Reads and writes to Firestore sub-collection: {parentCollection}/{parentId}/comments
 */
export const AdminCommentThread = ({ parentCollection, parentId }: AdminCommentThreadProps) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [sending, setSending] = useState(false);

    const loadComments = useCallback(async () => {
        try {
            const q = query(
                collection(db, parentCollection, parentId, 'comments'),
                orderBy('createdAt', 'asc')
            );
            const snap = await getDocs(q);
            setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
        } catch (err) {
            console.error('[AdminCommentThread] load failed:', err);
        } finally {
            setLoading(false);
        }
    }, [parentCollection, parentId]);

    useEffect(() => {
        if (parentId) loadComments();
    }, [parentId, loadComments]);

    const handleSend = async () => {
        if (!newComment.trim()) return;
        setSending(true);
        try {
            await addDoc(collection(db, parentCollection, parentId, 'comments'), {
                text: newComment.trim(),
                author: 'Support Admin',
                role: 'admin',
                createdAt: serverTimestamp(),
            });
            setNewComment('');
            await loadComments();
        } catch (err) {
            console.error('[AdminCommentThread] send failed:', err);
        } finally {
            setSending(false);
        }
    };

    const formatDate = (ts?: { seconds: number }) => {
        if (!ts) return '';
        return new Date(ts.seconds * 1000).toLocaleString('fr-FR');
    };

    if (loading) return <Typography variant="body2" sx={{ mt: 2 }}>Chargement des commentaires...</Typography>;

    return (
        <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>💬 Échanges ({comments.length})</Typography>

            {comments.length === 0 && (
                <Typography variant="body2" color="text.secondary">Aucun commentaire pour le moment.</Typography>
            )}

            {comments.map(c => (
                <Paper key={c.id} variant="outlined" sx={{ p: 1.5, mb: 1, borderLeft: c.role === 'admin' ? '3px solid #1976d2' : '3px solid #ff9800' }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                        <Chip
                            label={c.role === 'admin' ? 'Support' : 'Client'}
                            size="small"
                            color={c.role === 'admin' ? 'primary' : 'warning'}
                        />
                        <Typography variant="caption" color="text.secondary">{c.author}</Typography>
                        <Typography variant="caption" color="text.secondary">{formatDate(c.createdAt)}</Typography>
                    </Box>
                    <Typography variant="body2">{c.text}</Typography>
                </Paper>
            ))}

            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <TextField
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Répondre..."
                    size="small"
                    fullWidth
                    multiline
                    maxRows={3}
                />
                <Button
                    variant="contained"
                    onClick={handleSend}
                    disabled={sending || !newComment.trim()}
                    sx={{ minWidth: 100 }}
                >
                    Envoyer
                </Button>
            </Box>
        </Box>
    );
};
