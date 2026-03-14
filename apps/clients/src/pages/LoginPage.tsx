import React, { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

interface LoginPageProps {
    onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [resetMode, setResetMode] = useState(false);
    const [resetSent, setResetSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            onLogin();
        } catch {
            setError('Identifiants incorrects. Vérifiez votre email et mot de passe.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!email) {
            setError('Veuillez saisir votre adresse email.');
            return;
        }
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setResetSent(true);
        } catch {
            setError('Impossible d\'envoyer le lien. Vérifiez l\'adresse email.');
        } finally {
            setLoading(false);
        }
    };

    if (resetMode) {
        return (
            <div className="login-container">
                <div className="login-card">
                    <h1 className="login-title">MoCyno</h1>
                    <p className="login-subtitle">Réinitialisation du mot de passe</p>
                    {resetSent ? (
                        <div className="reset-success">
                            <p>Un lien de réinitialisation a été envoyé à <strong>{email}</strong>.</p>
                            <p className="login-info">Vérifiez votre boîte de réception et vos spams.</p>
                            <button onClick={() => { setResetMode(false); setResetSent(false); }} className="login-btn">
                                Retour à la connexion
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleResetPassword} className="login-form">
                            <p className="login-info">Saisissez votre adresse email. Vous recevrez un lien pour définir un nouveau mot de passe.</p>
                            <div className="form-group">
                                <label htmlFor="reset-email">Email</label>
                                <input
                                    id="reset-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    placeholder="votre@email.com"
                                />
                            </div>
                            {error && <p className="login-error">{error}</p>}
                            <button type="submit" disabled={loading} className="login-btn">
                                {loading ? 'Envoi…' : 'Envoyer le lien'}
                            </button>
                            <button type="button" onClick={() => { setResetMode(false); setError(null); }} className="link-btn">
                                Retour à la connexion
                            </button>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="login-container">
            <div className="login-card">
                <h1 className="login-title">MoCyno</h1>
                <p className="login-subtitle">Portail Client</p>
                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            placeholder="votre@email.com"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Mot de passe</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            placeholder="••••••••"
                        />
                    </div>
                    {error && <p className="login-error">{error}</p>}
                    <button type="submit" disabled={loading} className="login-btn">
                        {loading ? 'Connexion…' : 'Se connecter'}
                    </button>
                    <button type="button" onClick={() => { setResetMode(true); setError(null); }} className="link-btn">
                        Mot de passe oublié ?
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
