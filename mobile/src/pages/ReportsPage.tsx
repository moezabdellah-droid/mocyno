import React, { useState, useEffect } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonInput, IonTextarea, IonButton, IonIcon, IonItem, IonLabel, IonLoading, IonSelect, IonSelectOption } from '@ionic/react';
import { camera, send, chevronBack } from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { db, auth, storage } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useHistory } from 'react-router-dom';

interface AgentMeta {
    firstName?: string;
    lastName?: string;
    siteId?: string;
    siteName?: string;
}

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
    const [agentMeta, setAgentMeta] = useState<AgentMeta>({});
    const history = useHistory();

    // Load agent metadata for enrichment
    useEffect(() => {
        const loadMeta = async () => {
            const user = auth.currentUser;
            if (!user) return;
            try {
                const agentSnap = await getDoc(doc(db, 'agents', user.uid));
                if (agentSnap.exists()) {
                    const d = agentSnap.data();
                    setAgentMeta({
                        firstName: d.firstName,
                        lastName: d.lastName,
                        siteId: d.siteId,
                        siteName: d.siteName,
                    });
                }
            } catch (e) {
                console.error('Failed to load agent metadata:', e);
            }
        };
        loadMeta();
    }, []);

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
            alert('Veuillez remplir le titre et la description.');
            return;
        }
        if (!reportType) {
            alert('Veuillez sélectionner un type de rapport.');
            return;
        }

        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) return;

            let photoUrl: string | null = null;
            let photoPath: string | null = null;

            if (photoBase64) {
                try {
                    const filename = `${Date.now()}.jpg`;
                    const storagePath = `report_photos/${user.uid}/${filename}`;
                    const storageRef = ref(storage, storagePath);
                    const snapshot = await uploadString(storageRef, photoBase64, 'base64', {
                        contentType: 'image/jpeg'
                    });
                    photoUrl = await getDownloadURL(snapshot.ref);
                    photoPath = storagePath;
                } catch (uploadError) {
                    console.error('Storage upload error:', uploadError);
                    alert("Erreur lors de l'upload de la photo. Veuillez réessayer.");
                    setLoading(false);
                    return;
                }
            }

            const agentName = [agentMeta.firstName, agentMeta.lastName].filter(Boolean).join(' ') || null;

            await addDoc(collection(db, 'events'), {
                type: reportType,
                title: title.trim(),
                description: description.trim(),
                photo: photoUrl,
                photoPath: photoPath,
                authorId: user.uid,
                authorEmail: user.email,
                agentName,
                siteId: agentMeta.siteId || null,
                siteName: agentMeta.siteName || null,
                timestamp: serverTimestamp(),
                status: 'OPEN'
            });

            alert('Rapport envoyé avec succès !');
            history.goBack();
        } catch (error) {
            console.error('Error submitting report:', error);
            alert("Erreur lors de l'envoi du rapport.");
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
