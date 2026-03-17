import React, { useState } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonInput, IonTextarea, IonButton, IonIcon, IonItem, IonLabel, IonLoading, IonSelect, IonSelectOption, IonButtons, IonBackButton, IonToast } from '@ionic/react';
import { camera, send } from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { db, storage } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useHistory } from 'react-router-dom';
import { useAgentMeta } from '../hooks/useAgentMeta';

const REPORT_TYPES = [
    { value: 'MAIN_COURANTE', label: 'Main courante' },
    { value: 'INCIDENT', label: 'Incident' },
    { value: 'OBSERVATION', label: 'Observation' },
];

const ReportsPage: React.FC = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [reportType, setReportType] = useState<string>('MAIN_COURANTE');
    const [photo, setPhoto] = useState<string | undefined>(undefined);
    const [photoBase64, setPhotoBase64] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; color: string } | null>(null);
    const history = useHistory();
    const agentMeta = useAgentMeta();

    const takePhoto = async () => {
        try {
            const image = await Camera.getPhoto({
                quality: 50,
                allowEditing: false,
                resultType: CameraResultType.Base64,
                source: CameraSource.Camera,
                width: 800
            });
            setPhoto(`data:image/jpeg;base64,${image.base64String}`);
            setPhotoBase64(image.base64String);
        } catch (error) {
            console.error('Camera error:', error);
        }
    };

    const submitReport = async () => {
        if (!title.trim() || !description.trim()) {
            setToast({ message: 'Veuillez remplir le titre et la description.', color: 'warning' });
            return;
        }
        if (!reportType) {
            setToast({ message: 'Veuillez sélectionner un type de rapport.', color: 'warning' });
            return;
        }

        setLoading(true);
        try {
            if (!agentMeta.authorId) return;

            let photoUrl: string | null = null;
            let photoPath: string | null = null;

            if (photoBase64) {
                try {
                    const filename = `${Date.now()}.jpg`;
                    const storagePath = `report_photos/${agentMeta.authorId}/${filename}`;
                    const storageRef = ref(storage, storagePath);
                    const snapshot = await uploadString(storageRef, photoBase64, 'base64', {
                        contentType: 'image/jpeg'
                    });
                    photoUrl = await getDownloadURL(snapshot.ref);
                    photoPath = storagePath;
                } catch (uploadError) {
                    console.error('Storage upload error:', uploadError);
                    setToast({ message: "Erreur lors de l'upload de la photo. Réessayez.", color: 'danger' });
                    setLoading(false);
                    return;
                }
            }

            await addDoc(collection(db, 'events'), {
                type: reportType,
                title: title.trim(),
                description: description.trim(),
                photo: photoUrl,
                photoPath: photoPath,
                authorId: agentMeta.authorId,
                authorEmail: agentMeta.authorEmail,
                agentName: agentMeta.agentName,
                siteId: agentMeta.siteId,
                siteName: agentMeta.siteName,
                timestamp: serverTimestamp(),
                status: 'OPEN'
            });

            setToast({ message: '✅ Rapport envoyé avec succès.', color: 'success' });
            setTimeout(() => history.goBack(), 1200);
        } catch (error) {
            console.error('Error submitting report:', error);
            setToast({ message: "Erreur lors de l'envoi du rapport.", color: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonBackButton defaultHref="/home" />
                    </IonButtons>
                    <IonTitle>Nouveau Rapport</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
                <IonItem>
                    <IonLabel>Type</IonLabel>
                    <IonSelect value={reportType} onIonChange={e => setReportType(e.detail.value)} interface="popover">
                        {REPORT_TYPES.map(t => (
                            <IonSelectOption key={t.value} value={t.value}>{t.label}</IonSelectOption>
                        ))}
                    </IonSelect>
                </IonItem>
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
                        <p style={{ color: 'var(--ion-color-medium)' }}>Aucune photo jointe</p>
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

                <IonLoading isOpen={loading} message="Envoi en cours…" />
                <IonToast
                    isOpen={!!toast}
                    message={toast?.message || ''}
                    duration={4000}
                    onDidDismiss={() => setToast(null)}
                    color={toast?.color || 'primary'}
                />
            </IonContent>
        </IonPage>
    );
};

export default ReportsPage;
