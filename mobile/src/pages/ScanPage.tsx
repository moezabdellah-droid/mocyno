import React, { useState, useEffect } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonLoading, IonText, IonButtons, IonBackButton, IonToast } from '@ionic/react';
import { scan, close } from 'ionicons/icons';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { useHistory } from 'react-router-dom';
import { PtiService } from '../services/PtiService';

interface AgentMeta {
    firstName?: string;
    lastName?: string;
    siteId?: string;
    siteName?: string;
}

const ScanPage: React.FC = () => {
    const [isScanning, setIsScanning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [agentMeta, setAgentMeta] = useState<AgentMeta>({});
    const [toast, setToast] = useState<{ message: string; color: string } | null>(null);
    const history = useHistory();

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

    const startScan = async () => {
        try {
            const status = await BarcodeScanner.requestPermissions();
            if (status.camera !== 'granted' && status.camera !== 'limited') {
                setToast({ message: 'Permission caméra refusée. Activez-la dans les paramètres.', color: 'warning' });
                return;
            }

            setIsScanning(true);
            document.body.classList.add('scanner-active');

            const { barcodes } = await BarcodeScanner.scan({
                formats: [BarcodeFormat.QrCode, BarcodeFormat.DataMatrix],
            });

            if (barcodes.length > 0) {
                const content = barcodes[0].rawValue;
                await handleScanResult(content);
            }
        } catch (error) {
            console.error('Scan error:', error);
            setToast({ message: 'Scan annulé ou erreur.', color: 'medium' });
        } finally {
            stopScan();
        }
    };

    const stopScan = async () => {
        setIsScanning(false);
        document.body.classList.remove('scanner-active');
    };

    const handleScanResult = async (content: string) => {
        setLoading(true);
        try {
            const user = auth.currentUser;
            const position = await PtiService.getCurrentPosition();
            const agentName = [agentMeta.firstName, agentMeta.lastName].filter(Boolean).join(' ') || null;

            await addDoc(collection(db, 'events'), {
                type: 'RDL_CHECKPOINT',
                content,
                authorId: user?.uid,
                authorEmail: user?.email,
                agentName,
                siteId: agentMeta.siteId || null,
                siteName: agentMeta.siteName || null,
                location: position ? { lat: position.coords.latitude, lng: position.coords.longitude } : null,
                timestamp: serverTimestamp(),
                status: 'VALIDATED'
            });

            setToast({ message: `✅ Point validé : ${content}`, color: 'success' });
            setTimeout(() => history.goBack(), 1500);
        } catch (e) {
            console.error(e);
            setToast({ message: 'Erreur de sauvegarde du checkpoint.', color: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        return () => {
            stopScan();
        };
    }, []);

    return (
        <IonPage className={isScanning ? 'scanner-active' : ''}>
            <IonHeader>
                <IonToolbar color={isScanning ? "transparent" : "primary"}>
                    {!isScanning && (
                        <IonButtons slot="start">
                            <IonBackButton defaultHref="/home" />
                        </IonButtons>
                    )}
                    <IonTitle>Scan Ronde</IonTitle>
                    {isScanning && (
                        <IonButton slot="end" fill="clear" onClick={stopScan}>
                            <IonIcon icon={close} />
                        </IonButton>
                    )}
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding" style={{ '--background': isScanning ? 'transparent' : '' }}>
                {!isScanning && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <IonIcon icon={scan} style={{ fontSize: '6rem', color: 'var(--ion-color-primary)' }} />
                        <IonText>
                            <h3>Prêt à scanner</h3>
                            <p>Visez le QR Code du point de contrôle.</p>
                        </IonText>
                        <IonButton expand="block" shape="round" onClick={startScan} style={{ marginTop: '2rem', width: '80%' }}>
                            Lancer le Scanner
                        </IonButton>
                    </div>
                )}
                <IonLoading isOpen={loading} message="Validation du point…" />
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

export default ScanPage;
