import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './firebase';
import { useClientData } from './hooks/useClientData';
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ConsignesPage from './pages/ConsignesPage';
import SitePage from './pages/SitePage';
import './index.css';

type Tab = 'consignes' | 'site';

// Composant layout principal post-login
const ClientLayout: React.FC<{ user: User; siteId: string }> = ({ user, siteId }) => {
    const [tab, setTab] = useState<Tab>('consignes');
    const { signOut } = { signOut: () => import('firebase/auth').then(m => m.signOut(auth)) };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>MoCyno — Portail Client</h1>
                <div className="header-user">
                    <span>{user.email}</span>
                    <button onClick={signOut} className="logout-btn">Déconnexion</button>
                </div>
            </header>
            <nav className="client-nav">
                <button
                    className={`nav-btn${tab === 'consignes' ? ' active' : ''}`}
                    onClick={() => setTab('consignes')}
                >
                    Consignes
                </button>
                <button
                    className={`nav-btn${tab === 'site' ? ' active' : ''}`}
                    onClick={() => setTab('site')}
                >
                    Mon site
                </button>
            </nav>
            <main className="dashboard-main">
                {tab === 'consignes' && <ConsignesPage siteId={siteId} />}
                {tab === 'site' && <SitePage siteId={siteId} />}
            </main>
        </div>
    );
};

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const { clientData, loading: profileLoading, error: profileError } = useClientData(user?.uid ?? null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setAuthLoading(false);
        });
        return unsubscribe;
    }, []);

    // Auth loading
    if (authLoading || (user && profileLoading)) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
            </div>
        );
    }

    // Non connecté
    if (!user) return <LoginPage onLogin={() => {}} />;

    // Profil introuvable
    if (profileError || !clientData?.siteId) {
        return (
            <div className="login-container">
                <div className="login-card">
                    <p className="login-error">
                        {profileError ?? 'Profil client incomplet. Contactez votre administrateur.'}
                    </p>
                </div>
            </div>
        );
    }

    // Changement de mot de passe obligatoire
    if (clientData.mustChangePassword) {
        return <ChangePasswordPage />;
    }

    // App normale
    return <ClientLayout user={user} siteId={clientData.siteId} />;
};

export default App;
