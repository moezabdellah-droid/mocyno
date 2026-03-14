import React, { useState } from 'react';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const ChangePasswordPage: React.FC = () => {
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
            // 1. Mettre à jour le mot de passe Firebase Auth
            await updatePassword(user, newPassword);
            // 2. Lever le flag mustChangePassword dans Firestore
            await updateDoc(doc(db, 'agents', user.uid), { mustChangePassword: false });
            // L'App.tsx réagit automatiquement au changement de clientData (re-fetch ou reload)
            window.location.reload();
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inconnue.';
            // Firebase renvoie requires-recent-login si la session est trop ancienne
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
