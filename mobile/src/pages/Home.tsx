import React, { useState } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonFabButton, IonIcon, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonGrid, IonRow, IonCol } from '@ionic/react';
import { warning, power, body, logOut, book, camera, scan, calendarOutline } from 'ionicons/icons';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { PtiService } from '../services/PtiService';

const Home: React.FC = () => {
    const [isServiceRunning, setIsServiceRunning] = useState(false);

    const toggleService = async () => {
        if (isServiceRunning) {
            await PtiService.stopService();
            setIsServiceRunning(false);
        } else {
            await PtiService.startService();
            setIsServiceRunning(true);
        }
    };

    const handleSOS = async () => {
        await PtiService.sendSOS();
        alert("SOS ENVOYÉ ! Le PC Sécurité a été notifié.");
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar color="dark">
                    <IonTitle>Mo'Cyno Agent</IonTitle>
                    <IonButton slot="end" fill="clear" onClick={() => signOut(auth)}>
                        <IonIcon icon={logOut} />
                    </IonButton>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">

                {/* Status Card */}
                <IonCard color={isServiceRunning ? "success" : "medium"}>
                    <IonCardHeader>
                        <IonCardSubtitle>Status du Service</IonCardSubtitle>
                        <IonCardTitle>{isServiceRunning ? "EN SERVICE (ACTIF)" : "HORS SERVICE"}</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                        {isServiceRunning ? "Le tracking GPS est actif. PTI opérationnel." : "Veuillez prendre votre service pour activer le PTI."}
                    </IonCardContent>
                </IonCard>

                {/* SOS Button */}
                <div style={{ display: 'flex', justifyContent: 'center', margin: '3rem 0' }}>
                    <IonFabButton color="danger" style={{ width: '160px', height: '160px' }} onClick={handleSOS}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <IonIcon icon={warning} style={{ fontSize: '4.5rem' }} />
                            <span style={{ fontWeight: 'bold', fontSize: '1.2rem', marginTop: '5px' }}>SOS</span>
                        </div>
                    </IonFabButton>
                </div>

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
                        <IonCol>
                            <IonButton expand="block" fill="outline" shape="round" onClick={() => PtiService.simulateFall()}>
                                <IonIcon slot="start" icon={body} />
                                Simuler Chute
                            </IonButton>
                        </IonCol>
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
