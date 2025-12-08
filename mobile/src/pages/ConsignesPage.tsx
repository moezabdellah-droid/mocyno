import React, { useEffect, useState } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonBadge, IonModal, IonButton, IonIcon } from '@ionic/react';
import { book, close } from 'ionicons/icons';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

const ConsignesPage: React.FC = () => {
    const [consignes, setConsignes] = useState<any[]>([]);
    const [selectedConsigne, setSelectedConsigne] = useState<any>(null);

    useEffect(() => {
        const q = query(collection(db, 'consignes'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setConsignes(data);
        });
        return unsubscribe;
    }, []);

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Consignes & Instructions</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent>
                <IonList>
                    {consignes.map(consigne => (
                        <IonItem key={consigne.id} button onClick={() => setSelectedConsigne(consigne)}>
                            <IonIcon icon={book} slot="start" color="primary" />
                            <IonLabel>
                                <h2>{consigne.title}</h2>
                                <p>{consigne.type}</p>
                            </IonLabel>
                            {/* Assuming new tag logic would be here */}
                            <IonBadge color="secondary" slot="end">Info</IonBadge>
                        </IonItem>
                    ))}
                </IonList>

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
                        <div style={{ marginTop: '20px' }} dangerouslySetInnerHTML={{ __html: selectedConsigne?.content }} />
                    </IonContent>
                </IonModal>
            </IonContent>
        </IonPage>
    );
};

export default ConsignesPage;
