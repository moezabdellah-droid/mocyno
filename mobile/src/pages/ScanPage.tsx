import React, { useState, useEffect } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonLoading, IonText } from '@ionic/react';
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
    const history = useHistory();

    // Load agent metadata
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
                alert('Permission caméra refusée.');
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
            alert("Erreur ou annulation du scan.");
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

            alert(`✅ Point validé : ${content}`);
            history.goBack();
        } catch (e) {
            console.error(e);
            alert("Erreur de sauvegarde du checkpoint.");
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
                <IonLoading isOpen={loading} message="Validation du point..." />
            </IonContent>
        </IonPage>
    );
};

export default ScanPage;
