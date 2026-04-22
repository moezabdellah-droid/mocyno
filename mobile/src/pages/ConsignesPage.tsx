import React, { useEffect, useState, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonBadge, IonModal, IonButton, IonIcon, IonButtons, IonBackButton, IonSpinner, IonToast, IonRefresher, IonRefresherContent, IonNote } from '@ionic/react';
import { book, close, alertCircleOutline } from 'ionicons/icons';
import { db, auth } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';

import type { Consigne } from '@mocyno/types';

const priorityConfig: Record<string, { color: string; label: string }> = {
    high: { color: 'danger', label: 'Urgent' },
    medium: { color: 'warning', label: 'Important' },
    low: { color: 'secondary', label: 'Info' },
};

const formatConsigneDate = (d: Date | string | undefined) => {
    if (!d) return '';
    try {
        const date = typeof d === 'string' ? new Date(d) : d;
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return '';
    }
};

const ConsignesPage: React.FC = () => {
    const [consignes, setConsignes] = useState<Consigne[]>([]);
    const [selectedConsigne, setSelectedConsigne] = useState<Consigne | null>(null);
    const [loading, setLoading] = useState(!!auth.currentUser);
    const [error, setError] = useState<string | null>(null);
    const [siteId, setSiteId] = useState<string | null>(null);

    const loadSiteId = useCallback(async () => {
        const user = auth.currentUser;
        if (!user) return null;
        try {
            const agentSnap = await getDoc(doc(db, 'agents', user.uid));
            return agentSnap.exists() ? agentSnap.data()?.siteId || null : null;
        } catch {
            return null;
        }
    }, []);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        let unsubscribe: (() => void) | undefined;

        const init = async () => {
            const agentSiteId = await loadSiteId();
            setSiteId(agentSiteId);

            if (!agentSiteId) {
                setError('Aucun site assigné. Contactez votre responsable.');
                setLoading(false);
                return;
            }

            const q = query(
                collection(db, 'consignes'),
                where('siteId', '==', agentSiteId),
                orderBy('createdAt', 'desc')
            );
            unsubscribe = onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Consigne[];
                setConsignes(data);
                setLoading(false);
            }, (err) => {
                console.error('ConsignesPage error:', err);
                setError('Impossible de charger les consignes.');
                setLoading(false);
            });
        };

        init();
        return () => { if (unsubscribe) unsubscribe(); };
    }, [loadSiteId]);

    const handleRefresh = (event: CustomEvent) => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            event.detail.complete();
        }, 800);
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonBackButton defaultHref="/home" />
                    </IonButtons>
                    <IonTitle>Consignes</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent>
                <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
                    <IonRefresherContent />
                </IonRefresher>

                {loading ? (
                    <div className="ion-padding ion-text-center" style={{ marginTop: '3rem' }}>
                        <IonSpinner name="crescent" />
                        <p>Chargement des consignes…</p>
                    </div>
                ) : error && !siteId ? (
                    <div className="ion-padding ion-text-center" style={{ marginTop: '3rem' }}>
                        <IonIcon icon={alertCircleOutline} style={{ fontSize: '3rem', color: 'var(--ion-color-warning)' }} />
                        <p>{error}</p>
                    </div>
                ) : consignes.length === 0 ? (
                    <div className="ion-padding ion-text-center" style={{ marginTop: '3rem' }}>
                        <IonIcon icon={book} style={{ fontSize: '3rem', color: 'var(--ion-color-medium)' }} />
                        <p>Aucune consigne pour votre site.</p>
                    </div>
                ) : (
                    <div className="ion-padding">
                        <IonNote style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--ion-color-medium)' }}>
                            {consignes.length} consigne{consignes.length > 1 ? 's' : ''} pour votre site
                        </IonNote>
                        {consignes.map(consigne => {
                            const cfg = priorityConfig[consigne.priority || 'low'] || priorityConfig.low;
                            return (
                                <IonCard key={consigne.id} button onClick={() => setSelectedConsigne(consigne)}>
                                    <IonCardHeader>
                                        <IonCardTitle style={{ fontSize: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>{consigne.title}</span>
                                            <IonBadge color={cfg.color}>{cfg.label}</IonBadge>
                                        </IonCardTitle>
                                    </IonCardHeader>
                                    <IonCardContent>
                                        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--ion-color-medium)' }}>
                                            {consigne.type && <span>{consigne.type}</span>}
                                            {consigne.createdAt && <span>{formatConsigneDate(consigne.createdAt)}</span>}
                                        </div>
                                    </IonCardContent>
                                </IonCard>
                            );
                        })}
                    </div>
                )}

                <IonModal isOpen={!!selectedConsigne} onDidDismiss={() => setSelectedConsigne(null)}>
                    <IonHeader>
                        <IonToolbar>
                            <IonTitle>{selectedConsigne?.title}</IonTitle>
                            <IonButton slot="end" fill="clear" onClick={() => setSelectedConsigne(null)}>
                                <IonIcon icon={close} />
                            </IonButton>
                        </IonToolbar>
                    </IonHeader>
                    <IonContent className="ion-padding">
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                            <IonBadge color={priorityConfig[selectedConsigne?.priority || 'low']?.color || 'secondary'}>
                                {priorityConfig[selectedConsigne?.priority || 'low']?.label || 'Info'}
                            </IonBadge>
                            {selectedConsigne?.type && <IonBadge color="medium">{selectedConsigne.type}</IonBadge>}
                            {selectedConsigne?.createdAt && (
                                <IonBadge color="light" style={{ color: 'var(--ion-color-dark)' }}>
                                    {formatConsigneDate(selectedConsigne.createdAt)}
                                </IonBadge>
                            )}
                        </div>
                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedConsigne?.content || '') }}
                             style={{ lineHeight: 1.6 }} />
                    </IonContent>
                </IonModal>

                <IonToast isOpen={!!error && !!siteId} message={error || ''} duration={4000} onDidDismiss={() => setError(null)} color="danger" />
            </IonContent>
        </IonPage>
    );
};

export default ConsignesPage;
