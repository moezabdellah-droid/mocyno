import React, { useState, useEffect } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonLoading, IonText } from '@ionic/react';
import { scan, close } from 'ionicons/icons';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useHistory } from 'react-router-dom';
import { PtiService } from '../services/PtiService';

const ScanPage: React.FC = () => {
    const [isScanning, setIsScanning] = useState(false);
    const [loading, setLoading] = useState(false);
    const history = useHistory();

    const startScan = async () => {
        try {
            // Request permissions
            const status = await BarcodeScanner.requestPermissions();
            if (status.camera !== 'granted' && status.camera !== 'limited') {
                alert('Permission caméra refusée.');
                return;
            }

            // Start Scanner
            setIsScanning(true);
            // Hide webview to see camera (Capacitor specific)
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
            alert("Erreur/Annulation du scan.");
        } finally {
            stopScan();
        }
    };

    const stopScan = async () => {
        setIsScanning(false);
        document.body.classList.remove('scanner-active');
        // BarcodeScanner.stopScan(); // Not always needed depending on plugin update, but good practice
    };

    const handleScanResult = async (content: string) => {
        setLoading(true);
        try {
            const user = auth.currentUser;
            const position = await PtiService.getCurrentPosition();

            await addDoc(collection(db, 'events'), {
                type: 'RDL_CHECKPOINT',
                content: content, // The QR payload (e.g., "CP_HALL_ENTREE")
                authorId: user?.uid,
                authorEmail: user?.email,
                location: position ? { lat: position.coords.latitude, lng: position.coords.longitude } : null,
                timestamp: serverTimestamp(),
                status: 'VALIDATED'
            });

            alert(`Point Pointé : ${content}`);
            history.goBack();
        } catch (e) {
            console.error(e);
            alert("Erreur de sauvegarde.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        return () => {
            stopScan(); // Cleanup on unmount
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
                        <IonIcon icon={scan} style={{ fontSize: '6rem', color: '#var(--ion-color-primary)' }} />
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
