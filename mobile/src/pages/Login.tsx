import React, { useState } from 'react';
import { IonPage, IonContent, IonInput, IonButton, IonItem, IonLabel, IonHeader, IonToolbar, IonTitle, IonLoading, IonToast } from '@ionic/react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useHistory } from 'react-router-dom';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const history = useHistory();

    const handleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            history.replace('/home');
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : 'Une erreur est survenue';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Mo'Cyno Agent Login</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
                <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
                    <IonItem>
                        <IonLabel position="floating">Email</IonLabel>
                        <IonInput value={email} onIonChange={e => setEmail(e.detail.value!)} type="email" required />
                    </IonItem>
                    <IonItem>
                        <IonLabel position="floating">Password</IonLabel>
                        <IonInput value={password} onIonChange={e => setPassword(e.detail.value!)} type="password" required />
                    </IonItem>
                    <IonButton expand="block" type="submit">
                        Login
                    </IonButton>
                </form>
                <IonLoading isOpen={loading} message={'Logging in...'} />
                <IonToast isOpen={!!error} message={error || ''} duration={2000} onDidDismiss={() => setError(null)} color="danger" />
            </IonContent>
        </IonPage>
    );
};

export default Login;
