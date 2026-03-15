import React, { useState } from 'react';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface ChangePasswordPageProps {
    clientId: string;
}

/**
 * R10C — ChangePasswordPage migré vers modèle avancé.
 * Met à jour le flag mustChangePassword dans clients/{clientId} (au lieu de agents/{uid}).
 */
const ChangePasswordPage: React.FC<ChangePasswordPageProps> = ({ clientId }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 8) {
            setError('Le mot de passe doit contenir au moins 8 caractères.');
            return;
        }
        if (newPassword !== confirm) {
            setError('Les mots de passe ne correspondent pas.');
            return;
        }

        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('Non authentifié.');
            // 1. Update Firebase Auth password
            await updatePassword(user, newPassword);
            // 2. Clear mustChangePassword in clients/{clientId}
            await updateDoc(doc(db, 'clients', clientId), { mustChangePassword: false });
            // Reload to trigger App re-render
            window.location.reload();
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inconnue.';
            if (msg.includes('requires-recent-login')) {
                setError('Votre session a expiré. Reconnectez-vous puis changez votre mot de passe.');
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1 className="login-title">MoCyno</h1>
                <p className="login-subtitle">Changement de mot de passe requis</p>
                <p className="login-info">Pour votre sécurité, veuillez définir un nouveau mot de passe avant de continuer.</p>
                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="new-password">Nouveau mot de passe</label>
                        <input
                            id="new-password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={8}
                            autoComplete="new-password"
                            placeholder="8 caractères minimum"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirm-password">Confirmer</label>
                        <input
                            id="confirm-password"
                            type="password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            required
                            autoComplete="new-password"
                            placeholder="••••••••"
                        />
                    </div>
                    {error && <p className="login-error">{error}</p>}
                    <button type="submit" disabled={loading} className="login-btn">
                        {loading ? 'Enregistrement…' : 'Changer mon mot de passe'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordPage;
