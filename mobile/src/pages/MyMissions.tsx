import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonBadge, IonIcon } from '@ionic/react';
import { calendarOutline, timeOutline, locationOutline, clipboardOutline } from 'ionicons/icons';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';

import type { Mission, AgentAssignment, Vacation } from '../types/shared';

interface ExtendedMission extends Mission {
    currentUserAssignment?: AgentAssignment;
}

const MyMissions: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [missions, setMissions] = useState<ExtendedMission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) setLoading(false);
        });
        return unsubscribeAuth;
    }, []);

    useEffect(() => {
        if (!user) return;

        // Query missions where current agent is assigned
        const q = query(
            collection(db, 'planning'),
            where('assignedAgentIds', 'array-contains', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const missionsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Mission[];

            // Client-side sort by date
            const processedMissions = missionsData.map(mission => {
                const assignment = mission.agentAssignments?.find((a: AgentAssignment) => a.agentId === user.uid);
                return {
                    ...mission,
                    currentUserAssignment: assignment
                };
            }).filter(m => m.currentUserAssignment) // Ensure assignment exists
                .sort((a, b) => {
                    const dateA = a.currentUserAssignment?.vacations?.[0]?.date || '9999-99-99';
                    const dateB = b.currentUserAssignment?.vacations?.[0]?.date || '9999-99-99';
                    return dateA.localeCompare(dateB);
                });

            setMissions(processedMissions);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching missions:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long'
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Mes Missions</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent fullscreen>
                <IonHeader collapse="condense">
                    <IonToolbar>
                        <IonTitle size="large">Mes Missions</IonTitle>
                    </IonToolbar>
                </IonHeader>

                {loading ? (
                    <div className="ion-padding text-center">Chargement...</div>
                ) : missions.length === 0 ? (
                    <div className="ion-padding text-center">
                        <p>Aucune mission planifiée.</p>
                    </div>
                ) : (
                    <div className="ion-padding">
                        {missions.map(mission => {
                            const assignment = mission.currentUserAssignment;
                            if (!assignment) return null;

                            return (
                                <IonCard key={mission.id} className="mission-card">
                                    <IonCardHeader>
                                        <IonCardSubtitle>
                                            <IonIcon icon={locationOutline} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                                            {mission.siteName}
                                        </IonCardSubtitle>
                                        <IonCardTitle className="ion-flex ion-justify-content-between ion-align-items-center">
                                            <span>{assignment.specialty}</span>
                                            <IonBadge color="primary">Planifié</IonBadge>
                                        </IonCardTitle>
                                    </IonCardHeader>

                                    <IonCardContent>
                                        <IonList lines="none">
                                            {assignment.vacations?.map((vacation: Vacation, idx: number) => (
                                                <IonItem key={idx}>
                                                    <IonIcon slot="start" icon={calendarOutline} />
                                                    <IonLabel className="ion-text-wrap">
                                                        <h2>{formatDate(vacation.date)}</h2>
                                                        <p>
                                                            <IonIcon icon={timeOutline} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                                                            {vacation.start} - {vacation.end}
                                                        </p>
                                                    </IonLabel>
                                                </IonItem>
                                            ))}
                                        </IonList>

                                        {mission.notes && (
                                            <div className="ion-margin-top ion-padding-top" style={{ borderTop: '1px solid #eee' }}>
                                                <p style={{ display: 'flex', alignItems: 'center', color: '#666' }}>
                                                    <IonIcon icon={clipboardOutline} style={{ marginRight: 5 }} />
                                                    <strong>Consignes :</strong>
                                                </p>
                                                <p>{mission.notes}</p>
                                            </div>
                                        )}
                                    </IonCardContent>
                                </IonCard>
                            );
                        })}
                    </div>
                )}
            </IonContent>
        </IonPage>
    );
};

export default MyMissions;
