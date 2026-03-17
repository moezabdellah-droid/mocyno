import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonBadge, IonModal, IonButton, IonIcon, IonButtons, IonBackButton, IonSpinner, IonToast } from '@ionic/react';
import { book, close } from 'ionicons/icons';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

import type { Consigne } from '@mocyno/types';

const ConsignesPage: React.FC = () => {
    const [consignes, setConsignes] = useState<Consigne[]>([]);
    const [selectedConsigne, setSelectedConsigne] = useState<Consigne | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const q = query(collection(db, 'consignes'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Consigne[];
            setConsignes(data);
            setLoading(false);
        }, (err) => {
            console.error('ConsignesPage error:', err);
            setError('Impossible de charger les consignes.');
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonBackButton defaultHref="/home" />
                    </IonButtons>
                    <IonTitle>Consignes & Instructions</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent>
                {loading ? (
                    <div className="ion-padding ion-text-center" style={{ marginTop: '3rem' }}>
                        <IonSpinner name="crescent" />
                        <p>Chargement des consignes…</p>
                    </div>
                ) : consignes.length === 0 ? (
                    <div className="ion-padding ion-text-center" style={{ marginTop: '3rem' }}>
                        <IonIcon icon={book} style={{ fontSize: '3rem', color: 'var(--ion-color-medium)' }} />
                        <p>Aucune consigne pour le moment.</p>
                    </div>
                ) : (
                    <IonList>
                        {consignes.map(consigne => (
                            <IonItem key={consigne.id} button onClick={() => setSelectedConsigne(consigne)}>
                                <IonIcon icon={book} slot="start" color="primary" />
                                <IonLabel>
                                    <h2>{consigne.title}</h2>
                                    <p>{consigne.type}</p>
                                </IonLabel>
                                <IonBadge color="secondary" slot="end">Info</IonBadge>
                            </IonItem>
                        ))}
                    </IonList>
                )}

                <IonModal isOpen={!!selectedConsigne} onDidDismiss={() => setSelectedConsigne(null)}>
                    <IonHeader>
                        <IonToolbar>
                            <IonTitle>{selectedConsigne?.title}</IonTitle>
                            <IonButton slot="end" fill="clear" onClick={() => setSelectedConsigne(null)}>
                                <IonIcon icon={close} />
                            </IonButton>
                        </IonToolbar>
                    </IonHeader>
                    <IonContent className="ion-padding">
                        <IonBadge color="primary">{selectedConsigne?.type}</IonBadge>
                        <div style={{ marginTop: '20px' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedConsigne?.content || '') }} />
                    </IonContent>
                </IonModal>

                <IonToast isOpen={!!error} message={error || ''} duration={3000} onDidDismiss={() => setError(null)} color="danger" />
            </IonContent>
        </IonPage>
    );
};

export default ConsignesPage;
