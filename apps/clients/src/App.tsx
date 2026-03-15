import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { useClientData } from './hooks/useClientData';
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import PlanningPage from './pages/PlanningPage';
import SitesPage from './pages/SitesPage';
import DocumentsPage from './pages/DocumentsPage';
import RequestsPage from './pages/RequestsPage';
import ReportsPage from './pages/ReportsPage';
import ConsignesPage from './pages/ConsignesPage';
import DashboardPage from './pages/DashboardPage';
import './index.css';

type Tab = 'dashboard' | 'planning' | 'sites' | 'documents' | 'consignes' | 'requests' | 'reports';

const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: 'Accueil' },
    { key: 'planning', label: 'Planning' },
    { key: 'sites', label: 'Sites' },
    { key: 'documents', label: 'Documents' },
    { key: 'consignes', label: 'Consignes' },
    { key: 'requests', label: 'Demandes' },
    { key: 'reports', label: 'Incidents' },
];

/**
 * R10C — App.tsx reconstruit
 * Modèle: claims { role:'client', clientId } + clients/{docId}
 * Pages: Planning, Sites, Documents, Demandes, Incidents
 */
const App: React.FC = () => {
    const { user, clientId, clientProfile, loading, error } = useClientData();
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');

    // Loading
    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
            </div>
        );
    }

    // Not logged in
    if (!user) return <LoginPage onLogin={() => {}} />;

    // Error / no claims / no profile
    if (error || !clientId || !clientProfile) {
        return (
            <div className="login-container">
                <div className="login-card">
                    <h1 className="login-title">MoCyno</h1>
                    <p className="login-error">
                        {error ?? 'Profil client introuvable. Contactez votre administrateur.'}
                    </p>
                    <button onClick={() => signOut(auth)} className="logout-btn" style={{ marginTop: '1rem' }}>
                        Déconnexion
                    </button>
                </div>
            </div>
        );
    }

    // Force password change
    if (clientProfile.mustChangePassword) {
        return <ChangePasswordPage clientId={clientId} />;
    }

    // Main layout
    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>MoCyno — Portail Client</h1>
                <div className="header-user">
                    <span>{clientProfile.firstName} {clientProfile.lastName}</span>
                    <button onClick={() => signOut(auth)} className="logout-btn">Déconnexion</button>
                </div>
            </header>
            <nav className="client-nav">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        className={`nav-btn${activeTab === t.key ? ' active' : ''}`}
                        onClick={() => setActiveTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </nav>
            <main className="dashboard-main">
                {activeTab === 'dashboard' && <DashboardPage clientId={clientId} clientName={`${clientProfile.firstName} ${clientProfile.lastName}`} onNavigate={(tab) => setActiveTab(tab as Tab)} />}
                {activeTab === 'planning' && <PlanningPage clientId={clientId} />}
                {activeTab === 'sites' && <SitesPage clientId={clientId} />}
                {activeTab === 'documents' && <DocumentsPage clientId={clientId} />}
                {activeTab === 'consignes' && <ConsignesPage clientId={clientId} />}
                {activeTab === 'requests' && <RequestsPage clientId={clientId} />}
                {activeTab === 'reports' && <ReportsPage clientId={clientId} />}
            </main>
        </div>
    );
};

export default App;
