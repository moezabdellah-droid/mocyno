import React, { useState } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonFabButton, IonIcon, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonGrid, IonRow, IonCol, IonSpinner, IonAlert } from '@ionic/react';
import { warning, power, body, logOut, book, camera, scan, calendarOutline } from 'ionicons/icons';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { PtiService } from '../services/PtiService';
import type { Agent } from '@mocyno/types';

const Home: React.FC = () => {
    const [isServiceRunning, setIsServiceRunning] = useState(false);
    const [agentInfo, setAgentInfo] = useState<Agent | null>(null);
    const [agentLoading, setAgentLoading] = useState(true);
    const [showSosConfirm, setShowSosConfirm] = useState(false);
    const [showSosSent, setShowSosSent] = useState(false);

    React.useEffect(() => {
        const user = auth.currentUser;
        if (!user) { setAgentLoading(false); return; }

        const unsubscribe = onSnapshot(doc(db, 'agents', user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as Agent;
                setAgentInfo(data);

                if (data.isServiceRunning !== undefined) {
                    setIsServiceRunning(data.isServiceRunning);
                    if (data.isServiceRunning) {
                        PtiService.resumeService().catch(console.error);
                    }
                }
            }
            setAgentLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const toggleService = async () => {
        if (isServiceRunning) {
            await PtiService.stopService();
        } else {
            await PtiService.startService();
        }
    };

    const handleSOS = async () => {
        await PtiService.sendSOS();
        setShowSosSent(true);
    };

    if (agentLoading) {
        return (
            <IonPage>
                <IonContent className="ion-padding ion-text-center" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ marginTop: '40%' }}>
                        <IonSpinner name="crescent" />
                        <p>Chargement…</p>
                    </div>
                </IonContent>
            </IonPage>
        );
    }

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar color="dark">
                    <IonTitle>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span>Mo'Cyno Agent</span>
                            {agentInfo && (
                                <span style={{ fontSize: '0.8rem', fontWeight: 'normal', opacity: 0.8 }}>
                                    {agentInfo.firstName} {agentInfo.lastName} ({agentInfo.matricule || 'Sans matricule'})
                                </span>
                            )}
                        </div>
                    </IonTitle>
                    <IonButton slot="end" fill="clear" onClick={() => signOut(auth)}>
                        <IonIcon icon={logOut} />
                    </IonButton>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">

                {/* Status Card */}
                <IonCard color={isServiceRunning ? "success" : "medium"}>
                    <IonCardHeader>
                        <IonCardSubtitle>Statut du Service</IonCardSubtitle>
                        <IonCardTitle>{isServiceRunning ? "EN SERVICE (ACTIF)" : "HORS SERVICE"}</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                        {isServiceRunning ? "Le tracking GPS est actif. PTI opérationnel." : "Veuillez prendre votre service pour activer le PTI."}
                    </IonCardContent>
                </IonCard>

                {/* Assigned Site */}
                {agentInfo?.siteName && (
                    <IonCard>
                        <IonCardContent>
                            <p style={{ margin: 0, fontSize: '0.9rem' }}>
                                <strong>Site assigné :</strong> {agentInfo.siteName}
                            </p>
                        </IonCardContent>
                    </IonCard>
                )}

                {/* SOS Button */}
                <div style={{ display: 'flex', justifyContent: 'center', margin: '3rem 0' }}>
                    <IonFabButton color="danger" style={{ width: '160px', height: '160px' }} onClick={() => setShowSosConfirm(true)}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <IonIcon icon={warning} style={{ fontSize: '4.5rem' }} />
                            <span style={{ fontWeight: 'bold', fontSize: '1.2rem', marginTop: '5px' }}>SOS</span>
                        </div>
                    </IonFabButton>
                </div>

                {/* SOS Confirmation Alert */}
                <IonAlert
                    isOpen={showSosConfirm}
                    onDidDismiss={() => setShowSosConfirm(false)}
                    header="Confirmer SOS"
                    message="Envoyer une alerte SOS au PC Sécurité ? Cette action est immédiate."
                    buttons={[
                        { text: 'Annuler', role: 'cancel' },
                        { text: 'Envoyer SOS', cssClass: 'danger', handler: handleSOS }
                    ]}
                />

                {/* SOS Sent Alert */}
                <IonAlert
                    isOpen={showSosSent}
                    onDidDismiss={() => setShowSosSent(false)}
                    header="SOS Envoyé"
                    message="Le PC Sécurité a été notifié. Restez en sécurité."
                    buttons={['OK']}
                />

                {/* Controls Grid */}
                <IonGrid>
                    <IonRow>
                        <IonCol>
                            <IonButton expand="block" size="large" shape="round" color={isServiceRunning ? "warning" : "primary"} onClick={toggleService}>
                                <IonIcon slot="start" icon={power} />
                                {isServiceRunning ? "Fin de Service" : "Prise de Service"}
                            </IonButton>
                        </IonCol>
                    </IonRow>
                    <IonRow>
                        {import.meta.env.DEV && (
                        <IonCol>
                            <IonButton expand="block" fill="outline" shape="round" onClick={() => PtiService.simulateFall()}>
                                <IonIcon slot="start" icon={body} />
                                Simuler Chute
                            </IonButton>
                        </IonCol>
                        )}
                        <IonCol>
                            <IonButton expand="block" fill="solid" color="dark" shape="round" routerLink="/scan">
                                <IonIcon slot="start" icon={scan} />
                                Scan Ronde
                            </IonButton>
                        </IonCol>
                    </IonRow>
                    <IonRow>
                        <IonCol>
                            <IonButton expand="block" fill="solid" color="secondary" shape="round" routerLink="/consignes">
                                <IonIcon slot="start" icon={book} />
                                Consignes
                            </IonButton>
                        </IonCol>
                        <IonCol>
                            <IonButton expand="block" fill="solid" color="tertiary" shape="round" routerLink="/reports">
                                <IonIcon slot="start" icon={camera} />
                                Rapport
                            </IonButton>
                        </IonCol>
                    </IonRow>
                    <IonRow>
                        <IonCol>
                            <IonButton expand="block" fill="solid" color="success" shape="round" routerLink="/planning">
                                <IonIcon slot="start" icon={calendarOutline} />
                                Planning
                            </IonButton>
                        </IonCol>
                    </IonRow>
                </IonGrid>

            </IonContent>
        </IonPage>
    );
};

export default Home;
