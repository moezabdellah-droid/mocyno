import { Geolocation } from '@capacitor/geolocation';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

export class PtiService {
    private static watchId: string | null = null;
    private static isServiceActive = false;

    // Start Background Tracking (Simulated Background)
    static async startService() {
        if (this.isServiceActive) return;

        // Request permissions
        const permission = await Geolocation.checkPermissions();
        if (permission.location !== 'granted') {
            await Geolocation.requestPermissions();
        }

        this.isServiceActive = true;

        // Start tracking
        this.watchId = await Geolocation.watchPosition({
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }, (position) => {
            if (position) {
                this.updateLocation(position.coords.latitude, position.coords.longitude);
            }
        });

        // Log Service Start
        await this.logEvent('SERVICE_START');

        console.log("PTI Service Started");
    }

    static async stopService() {
        if (this.watchId) {
            await Geolocation.clearWatch({ id: this.watchId });
            this.watchId = null;
        }
        this.isServiceActive = false;

        // Log Service Stop
        await this.logEvent('SERVICE_STOP');

        console.log("PTI Service Stopped");
    }

    // Helper to log system events
    private static async logEvent(type: string) {
        const user = auth.currentUser;
        if (!user) return;
        const position = await this.getCurrentPosition();

        await addDoc(collection(db, 'events'), {
            type,
            authorId: user.uid,
            authorEmail: user.email,
            location: position ? { lat: position.coords.latitude, lng: position.coords.longitude } : null,
            timestamp: serverTimestamp(),
            status: 'CLOSED' // System events are closed by default
        });
    }

    // Send Location to Firestore
    private static async updateLocation(lat: number, lng: number) {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const agentRef = doc(db, 'agents', user.uid);
            await updateDoc(agentRef, {
                location: {
                    lat,
                    lng,
                    lastUpdated: serverTimestamp()
                },
                status: 'active'
            });
        } catch (error) {
            console.error("Error updating location:", error);
        }
    }

    // Trigger SOS Alert
    static async sendSOS() {
        const user = auth.currentUser;
        if (!user) return;

        try {
            // Get current location immediately
            const position = await Geolocation.getCurrentPosition();

            await addDoc(collection(db, 'events'), {
                type: 'SOS',
                authorId: user.uid,
                location: {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                },
                timestamp: serverTimestamp(),
                status: 'OPEN',
                priority: 'CRITICAL'
            });

            console.log("SOS SENT!");
        } catch (error) {
            console.error("Error sending SOS:", error);
        }
    }

    // Simulate Fall Detection (For demo purposes)
    static async simulateFall() {
        console.warn("FALL DETECTED!");
        await this.sendSOS();
    }

    static async getCurrentPosition() {
        try {
            return await Geolocation.getCurrentPosition();
        } catch (e) {
            console.error(e);
            return null;
        }
    }
}
