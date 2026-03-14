import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './firebase';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import './index.css';

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
            </div>
        );
    }

    if (!user) {
        return <LoginPage onLogin={() => {}} />;
    }

    return <DashboardPage userEmail={user.email} />;
};

export default App;
