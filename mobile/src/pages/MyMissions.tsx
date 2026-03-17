import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonBadge, IonIcon, IonButtons, IonBackButton, IonToast, IonSpinner, IonRefresher, IonRefresherContent, IonNote } from '@ionic/react';
import { calendarOutline, timeOutline, locationOutline, clipboardOutline } from 'ionicons/icons';
import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';

import type { Mission, AgentAssignment, Vacation } from '@mocyno/types';

interface ExtendedMission extends Mission {
    currentUserAssignment?: AgentAssignment;
}

/** Client-side: keep missions with at least one vacation date >= cutoff (7 days ago) */
function filterRecentMissions(missions: ExtendedMission[]): ExtendedMission[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().split('T')[0]; // YYYY-MM-DD
    return missions.filter(m => {
        const vacations = m.currentUserAssignment?.vacations;
        if (!vacations || vacations.length === 0) return false;
        return vacations.some((v: Vacation) => v.date >= cutoffStr);
    });
}

function categorizeMissions(missions: ExtendedMission[]) {
    const today = new Date().toISOString().split('T')[0];
    const upcoming: ExtendedMission[] = [];
    const today_missions: ExtendedMission[] = [];
    const recent: ExtendedMission[] = [];

    for (const m of missions) {
        const firstDate = m.currentUserAssignment?.vacations?.[0]?.date;
        if (!firstDate) continue;
        if (firstDate === today) today_missions.push(m);
        else if (firstDate > today) upcoming.push(m);
        else recent.push(m);
    }
    return { today: today_missions, upcoming, recent };
}

const MyMissions: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [missions, setMissions] = useState<ExtendedMission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) setLoading(false);
        });
        return unsubscribeAuth;
    }, []);

    const setupListener = useCallback(() => {
        if (!user) return undefined;

        const q = query(
            collection(db, 'planning'),
            where('assignedAgentIds', 'array-contains', user.uid)
        );

        return onSnapshot(q, (snapshot) => {
            const missionsData = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            })) as Mission[];

            const processed = missionsData
                .map(mission => {
                    const assignment = mission.agentAssignments?.find((a: AgentAssignment) => a.agentId === user.uid);
                    return { ...mission, currentUserAssignment: assignment };
                })
                .filter(m => m.currentUserAssignment)
                .sort((a, b) => {
                    const dateA = a.currentUserAssignment?.vacations?.[0]?.date || '9999-99-99';
                    const dateB = b.currentUserAssignment?.vacations?.[0]?.date || '9999-99-99';
                    return dateA.localeCompare(dateB);
                });

            setMissions(filterRecentMissions(processed));
            setLoading(false);
        }, (err) => {
            console.error("Error fetching missions:", err);
            setError('Impossible de charger les missions. Vérifiez votre connexion.');
            setLoading(false);
        });
    }, [user]);

    useEffect(() => {
        const unsubscribe = setupListener();
        return () => { if (unsubscribe) unsubscribe(); };
    }, [setupListener]);

    const handleRefresh = (event: CustomEvent) => {
        setLoading(true);
        // Re-trigger snapshot — onSnapshot auto-delivers fresh data
        setTimeout(() => {
            setLoading(false);
            event.detail.complete();
        }, 800);
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long'
            });
        } catch {
            return dateStr;
        }
    };

    const badgeColor = (dateStr: string) => {
        const today = new Date().toISOString().split('T')[0];
        if (dateStr === today) return 'success';
        if (dateStr > today) return 'primary';
        return 'medium';
    };

    const badgeLabel = (dateStr: string) => {
        const today = new Date().toISOString().split('T')[0];
        if (dateStr === today) return "Aujourd'hui";
        if (dateStr > today) return 'À venir';
        return 'Passée';
    };

    const { today: todayMissions, upcoming, recent } = categorizeMissions(missions);

    const renderMission = (mission: ExtendedMission) => {
        const assignment = mission.currentUserAssignment;
        if (!assignment) return null;
        const firstDate = assignment.vacations?.[0]?.date || '';

        return (
            <IonCard key={mission.id}>
                <IonCardHeader>
                    <IonCardSubtitle>
                        <IonIcon icon={locationOutline} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                        {mission.siteName}
                    </IonCardSubtitle>
                    <IonCardTitle style={{ fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{assignment.specialty}</span>
                        <IonBadge color={badgeColor(firstDate)}>{badgeLabel(firstDate)}</IonBadge>
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
                                        {vacation.start} – {vacation.end}
                                    </p>
                                </IonLabel>
                            </IonItem>
                        ))}
                    </IonList>
                    {mission.notes && (
                        <div className="ion-margin-top ion-padding-top" style={{ borderTop: '1px solid var(--ion-color-light)' }}>
                            <p style={{ display: 'flex', alignItems: 'center', color: 'var(--ion-color-medium)' }}>
                                <IonIcon icon={clipboardOutline} style={{ marginRight: 5 }} />
                                <strong>Consignes :</strong>
                            </p>
                            <p>{mission.notes}</p>
                        </div>
                    )}
                </IonCardContent>
            </IonCard>
        );
    };

    const renderSection = (title: string, items: ExtendedMission[]) => {
        if (items.length === 0) return null;
        return (
            <>
                <IonNote className="ion-padding-start ion-padding-top" style={{ display: 'block', fontWeight: 600, fontSize: '0.95rem', color: 'var(--ion-color-dark)' }}>
                    {title}
                </IonNote>
                {items.map(renderMission)}
            </>
        );
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonBackButton defaultHref="/home" />
                    </IonButtons>
                    <IonTitle>Mes Missions</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent fullscreen>
                <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
                    <IonRefresherContent />
                </IonRefresher>

                <IonHeader collapse="condense">
                    <IonToolbar>
                        <IonTitle size="large">Mes Missions</IonTitle>
                    </IonToolbar>
                </IonHeader>

                {loading ? (
                    <div className="ion-padding ion-text-center" style={{ marginTop: '3rem' }}>
                        <IonSpinner name="crescent" />
                        <p>Chargement des missions…</p>
                    </div>
                ) : missions.length === 0 ? (
                    <div className="ion-padding ion-text-center" style={{ marginTop: '3rem' }}>
                        <IonIcon icon={calendarOutline} style={{ fontSize: '3rem', color: 'var(--ion-color-medium)' }} />
                        <p>Aucune mission planifiée.</p>
                    </div>
                ) : (
                    <div className="ion-padding">
                        {renderSection("📌 Aujourd'hui", todayMissions)}
                        {renderSection("📅 À venir", upcoming)}
                        {renderSection("📋 Récentes", recent)}
                    </div>
                )}

                <IonToast isOpen={!!error} message={error || ''} duration={4000} onDidDismiss={() => setError(null)} color="danger" />
            </IonContent>
        </IonPage>
    );
};

export default MyMissions;
