import React, { useState } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonInput, IonTextarea, IonButton, IonIcon, IonItem, IonLabel, IonLoading } from '@ionic/react';
import { camera, send, chevronBack } from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useHistory } from 'react-router-dom';

const ReportsPage: React.FC = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [photo, setPhoto] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const history = useHistory();

    const takePhoto = async () => {
        try {
            const image = await Camera.getPhoto({
                quality: 50, // Reduced quality to keep size small (<1MB)
                allowEditing: false,
                resultType: CameraResultType.Base64,
                source: CameraSource.Camera,
                width: 800 // Resize to further reduce size
            });
            setPhoto(`data:image/jpeg;base64,${image.base64String}`);
        } catch (error) {
            console.error('Camera error:', error);
        }
    };

    const submitReport = async () => {
        if (!title || !description) {
            alert('Veuillez remplir le titre et la description.');
            return;
        }

        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) return;

            await addDoc(collection(db, 'events'), {
                type: 'MAIN_COURANTE',
                title,
                description,
                photo: photo || null, // In a real app, upload base64 to Storage and save URL
                authorId: user.uid,
                authorEmail: user.email,
                timestamp: serverTimestamp(),
                status: 'OPEN'
            });

            alert('Rapport envoyé avec succès !');
            history.goBack();
        } catch (error) {
            console.error('Error submitting report:', error);
            alert("Erreur lors de l'envoi.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonButton slot="start" fill="clear" onClick={() => history.goBack()}>
                        <IonIcon icon={chevronBack} />
                    </IonButton>
                    <IonTitle>Nouveau Rapport</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
                <IonItem>
                    <IonLabel position="floating">Titre de l'événement</IonLabel>
                    <IonInput value={title} onIonChange={e => setTitle(e.detail.value!)} />
                </IonItem>
                <IonItem>
                    <IonLabel position="floating">Description détaillée</IonLabel>
                    <IonTextarea rows={6} value={description} onIonChange={e => setDescription(e.detail.value!)} />
                </IonItem>

                <div style={{ margin: '20px 0', textAlign: 'center' }}>
                    {photo ? (
                        <img src={photo} alt="Preuve" style={{ maxWidth: '100%', borderRadius: '8px' }} />
                    ) : (
                        <p style={{ color: '#666' }}>Aucune photo jointe</p>
                    )}
                </div>

                <IonButton expand="block" fill="outline" onClick={takePhoto}>
                    <IonIcon slot="start" icon={camera} />
                    Prendre une Photo
                </IonButton>

                <IonButton expand="block" style={{ marginTop: '20px' }} onClick={submitReport}>
                    <IonIcon slot="start" icon={send} />
                    Envoyer Rapport
                </IonButton>

                <IonLoading isOpen={loading} message="Envoi en cours..." />
            </IonContent>
        </IonPage>
    );
};

export default ReportsPage;
