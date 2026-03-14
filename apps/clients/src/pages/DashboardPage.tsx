import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

interface DashboardPageProps {
    userEmail: string | null;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ userEmail }) => {
    const handleLogout = async () => {
        await signOut(auth);
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>MoCyno — Portail Client</h1>
                <div className="header-user">
                    <span>{userEmail}</span>
                    <button onClick={handleLogout} className="logout-btn">Déconnexion</button>
                </div>
            </header>
            <main className="dashboard-main">
                <div className="welcome-card">
                    <h2>Bienvenue sur votre espace client</h2>
                    <p>Vos consignes et informations de site seront disponibles ici.</p>
                    <p className="coming-soon">Fonctionnalités en cours d'activation — R7</p>
                </div>
            </main>
        </div>
    );
};

export default DashboardPage;
