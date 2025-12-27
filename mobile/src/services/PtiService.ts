import { Geolocation } from '@capacitor/geolocation';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

export class PtiService {
    private static watchId: string | null = null;
    private static isServiceActive = false;

    // Start Background Tracking (Simulated Background)
    static async startService() {
        if (this.isServiceActive) return;

        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        // Request permissions
        const permission = await Geolocation.checkPermissions();
        if (permission.location !== 'granted') {
            await Geolocation.requestPermissions();
        }

        this.isServiceActive = true;

        // Persist State to Firestore
        try {
            await updateDoc(doc(db, 'agents', user.uid), {
                isServiceRunning: true,
                updatedAt: serverTimestamp()
            });
        } catch (e) {
            console.error("Failed to persist service state:", e);
        }

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

        const user = auth.currentUser;
        if (user) {
            // Persist State to Firestore
            try {
                await updateDoc(doc(db, 'agents', user.uid), {
                    isServiceRunning: false,
                    updatedAt: serverTimestamp()
                });
            } catch (e) {
                console.error("Failed to persist service state:", e);
            }
        }

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

        let location = null;
        try {
            // Updated options for robustness
            const position = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000 // Accept positions up to 30s old to avoid timeouts
            });
            location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
        } catch (error) {
            console.error("SOS Location Error (sending without location):", error);
            // Attempt to use valid last known position if available?
            // For now, proceed with null location so alert still goes out
        }

        try {
            await addDoc(collection(db, 'events'), {
                type: 'SOS',
                authorId: user.uid,
                authorEmail: user.email,
                location: location,
                timestamp: serverTimestamp(),
                status: 'OPEN',
                priority: 'CRITICAL'
            });

            console.log("SOS FIRESTORE DOC CREATED!");

            // SYSTEME SMS
            // Note: This relies on the device handling the sms: protocol.
            const phoneNumber = "+33666035116";
            const message = `SOS ALERT! Agent: ${user.email} - Location: ${location ? `${location.lat},${location.lng}` : 'Unknown'}`;
            window.location.href = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;

        } catch (error) {
            console.error("Error sending SOS:", error);
            throw error; // Re-throw so UI knows it failed
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
