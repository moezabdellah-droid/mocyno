import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import { Grid } from '@mui/material';
import { Title } from 'react-admin';
import moment from 'moment';
// @ts-expect-error - moment locale files don't have TypeScript declarations
import 'moment/dist/locale/fr';
import type { Mission, AgentAssignment, Vacation } from '@mocyno/types';
import dataProvider from '../providers/dataProvider';

moment.locale('fr');

// ─── Local types ─────────────────────────────────────────────────────────────
interface SupportItem {
    id: string;
    title?: string;
    status?: string;
    source?: string;
    severity?: string;
    priority?: string;
    siteName?: string;
    createdAt?: { seconds?: number } | string;
}

interface AgentItem {
    id: string;
    status?: string;
    firstName?: string;
    lastName?: string;
    professionalCardNumber?: string;
    matricule?: string;
    sstExpiresAt?: string;
}

interface ClientItem {
    id: string;
    companyName?: string;
    siteId?: string;
    siteIds?: string[];
    portalAccess?: boolean;
}

interface AuditLogItem {
    id: string;
    action?: string;
    actorUid?: string;
    actorRole?: string;
    targetType?: string;
    targetId?: string;
    summary?: string;
    createdAt?: { seconds?: number } | string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatTimestamp = (d: SupportItem['createdAt']): string => {
    if (!d) return '—';
    if (typeof d === 'string') return moment(d).format('DD/MM/YYYY HH:mm');
    if (d.seconds) return moment(d.seconds * 1000).format('DD/MM/YYYY HH:mm');
    return '—';
};

const formatRelative = (d: SupportItem['createdAt']): string => {
    if (!d) return '';
    if (typeof d === 'string') return moment(d).fromNow();
    if (d.seconds) return moment(d.seconds * 1000).fromNow();
    return '';
};

// Action label mapping for audit logs
const actionLabels: Record<string, string> = {
    createAgent: 'Création agent',
    createClient: 'Création client',
    updateAgentPassword: 'Changement MDP',
    generateMatricule: 'Génération matricule',
};

// ─── Section Component ───────────────────────────────────────────────────────
const SupervisionSection = ({ title, icon, children, color = '#1976d2' }: {
    title: string; icon: string; children: React.ReactNode; color?: string;
}) => (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>{icon}</span>
            <span style={{ borderBottom: `2px solid ${color}`, paddingBottom: 2 }}>{title}</span>
        </Typography>
        {children}
    </Paper>
);

// ─── Signal chip ─────────────────────────────────────────────────────────────
const SignalChip = ({ icon, count, label, to, color = '#1976d2' }: {
    icon: string; count: number; label: string; to: string; color?: string;
}) => (
    <Link to={to} style={{ textDecoration: 'none' }}>
        <Chip
            label={`${icon} ${count} ${label}`}
            clickable
            sx={{ bgcolor: 'white', border: `1px solid ${color}`, mr: 1, mb: 1 }}
        />
    </Link>
);

// ─── Supervision Page ────────────────────────────────────────────────────────
const Supervision = () => {
    const [planning, setPlanning] = useState<Mission[] | null>(null);
    const [reports, setReports] = useState<SupportItem[]>([]);
    const [requests, setRequests] = useState<SupportItem[]>([]);
    const [consignes, setConsignes] = useState<SupportItem[]>([]);
    const [clients, setClients] = useState<ClientItem[]>([]);
    const [agents, setAgents] = useState<AgentItem[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [planRes, repRes, reqRes, conRes, cliRes, agtRes, audRes] = await Promise.all([
                    dataProvider.getList('planning', { pagination: { page: 1, perPage: 200 }, sort: { field: 'createdAt', order: 'DESC' }, filter: {} }),
                    dataProvider.getList('reports', { pagination: { page: 1, perPage: 50 }, sort: { field: 'createdAt', order: 'DESC' }, filter: {} }),
                    dataProvider.getList('clientRequests', { pagination: { page: 1, perPage: 50 }, sort: { field: 'createdAt', order: 'DESC' }, filter: {} }),
                    dataProvider.getList('consignes', { pagination: { page: 1, perPage: 50 }, sort: { field: 'createdAt', order: 'DESC' }, filter: {} }),
                    dataProvider.getList('clients', { pagination: { page: 1, perPage: 100 }, sort: { field: 'provisionedAt', order: 'DESC' }, filter: {} }),
                    dataProvider.getList('agents', { pagination: { page: 1, perPage: 200 }, sort: { field: 'lastName', order: 'ASC' }, filter: {} }),
                    dataProvider.getList('auditLogs', { pagination: { page: 1, perPage: 10 }, sort: { field: 'createdAt', order: 'DESC' }, filter: {} }).catch(() => ({ data: [], total: 0 })),
                ]);
                setPlanning(planRes.data as Mission[]);
                setReports(repRes.data as SupportItem[]);
                setRequests(reqRes.data as SupportItem[]);
                setConsignes(conRes.data as SupportItem[]);
                setClients(cliRes.data as ClientItem[]);
                setAgents(agtRes.data as AgentItem[]);
                setAuditLogs(audRes.data as AuditLogItem[]);
            } catch (error) {
                console.error('[Supervision] fetch error:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    // ─── Exploitation signals ────────────────────────────────────────────────
    const exploitation = useMemo(() => {
        const now = moment();
        const items: { icon: string; count: number; label: string; to: string }[] = [];

        if (planning) {
            // Missions sans agent
            const missionsNoAgent = planning.filter(m => {
                if (!m.agentAssignments || m.agentAssignments.length === 0) return true;
                return m.agentAssignments.every((a: AgentAssignment) => !a.agentId);
            }).filter(m => {
                if (!m.agentAssignments || m.agentAssignments.length === 0) return true;
                let latestEnd = 0;
                m.agentAssignments.forEach((a: AgentAssignment) => {
                    a.vacations.forEach((v: Vacation) => {
                        const end = moment(`${v.date}T${v.end}`).valueOf();
                        if (end > latestEnd) latestEnd = end;
                    });
                });
                return latestEnd === 0 || latestEnd > now.valueOf();
            });
            if (missionsNoAgent.length > 0) {
                items.push({ icon: '⚠️', count: missionsNoAgent.length, label: 'mission(s) sans agent affecté', to: '/planning?view=list' });
            }

            // Missions en cours
            let ongoingCount = 0;
            planning.forEach(mission => {
                let missionStart: moment.Moment | null = null;
                let missionEnd: moment.Moment | null = null;
                if (mission.agentAssignments) {
                    mission.agentAssignments.forEach((a: AgentAssignment) => {
                        a.vacations.forEach((v: Vacation) => {
                            const start = moment(`${v.date}T${v.start}`);
                            const end = moment(`${v.date}T${v.end}`);
                            if (end.isBefore(start)) end.add(1, 'day');
                            if (!missionStart || start.isBefore(missionStart)) missionStart = start;
                            if (!missionEnd || end.isAfter(missionEnd)) missionEnd = end;
                        });
                    });
                }
                if (missionStart && missionEnd && now.isBetween(missionStart, missionEnd)) {
                    ongoingCount++;
                }
            });
            if (ongoingCount > 0) {
                items.push({ icon: '🔥', count: ongoingCount, label: 'mission(s) en cours', to: '/planning?view=list' });
            }
        }

        return items;
    }, [planning]);

    // ─── Support signals ─────────────────────────────────────────────────────
    const support = useMemo(() => {
        const items: { icon: string; count: number; label: string; to: string }[] = [];

        const openIncidents = reports.filter(r => r.status === 'open');
        if (openIncidents.length > 0) {
            items.push({ icon: '🔴', count: openIncidents.length, label: 'incident(s) ouvert(s)', to: '/reports?filter=%7B%22status%22%3A%22open%22%7D' });
        }

        const criticalIncidents = reports.filter(r => r.status === 'open' && (r.severity === 'critical' || r.severity === 'high'));
        if (criticalIncidents.length > 0) {
            items.push({ icon: '🔥', count: criticalIncidents.length, label: 'dont critique/élevé', to: '/reports?filter=%7B%22status%22%3A%22open%22%7D' });
        }

        const urgentRequests = requests.filter(r => r.priority === 'urgent' && r.status !== 'closed');
        if (urgentRequests.length > 0) {
            items.push({ icon: '🚨', count: urgentRequests.length, label: 'demande(s) urgente(s)', to: '/clientRequests?filter=%7B%22priority%22%3A%22urgent%22%7D' });
        }

        const pendingRequests = requests.filter(r => r.status === 'pending');
        if (pendingRequests.length > 0) {
            items.push({ icon: '📝', count: pendingRequests.length, label: 'demande(s) en attente', to: '/clientRequests?filter=%7B%22status%22%3A%22pending%22%7D' });
        }

        const pendingConsignes = consignes.filter(c => c.source === 'client' && c.status === 'pending');
        if (pendingConsignes.length > 0) {
            items.push({ icon: '📋', count: pendingConsignes.length, label: 'consigne(s) client en attente', to: '/consignes?filter=%7B%22source%22%3A%22client%22%2C%22status%22%3A%22pending%22%7D' });
        }

        return items;
    }, [reports, requests, consignes]);

    // ─── Compliance signals ──────────────────────────────────────────────────
    const complianceItems = useMemo(() => {
        const now = moment();
        const items: { icon: string; count: number; label: string; to: string }[] = [];

        const activeAgents = agents.filter(a => a.status === 'active');

        const noCard = activeAgents.filter(a => !a.professionalCardNumber);
        if (noCard.length > 0) {
            items.push({ icon: '🪪', count: noCard.length, label: 'agent(s) sans carte pro', to: '/agents?filter=%7B%22status%22%3A%22active%22%7D' });
        }

        const noMatricule = activeAgents.filter(a => !a.matricule);
        if (noMatricule.length > 0) {
            items.push({ icon: '🔢', count: noMatricule.length, label: 'agent(s) sans matricule', to: '/agents?filter=%7B%22status%22%3A%22active%22%7D' });
        }

        const expiredSST = activeAgents.filter(a => a.sstExpiresAt && moment(a.sstExpiresAt).isBefore(now));
        if (expiredSST.length > 0) {
            items.push({ icon: '🏥', count: expiredSST.length, label: 'agent(s) avec SST expirée', to: '/agents?filter=%7B%22status%22%3A%22active%22%7D' });
        }

        const clientsNoSite = clients.filter(c => !c.siteId && (!c.siteIds || c.siteIds.length === 0));
        if (clientsNoSite.length > 0) {
            items.push({ icon: '🔗', count: clientsNoSite.length, label: 'client(s) sans site rattaché', to: '/clients' });
        }

        return items;
    }, [agents, clients]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Title title="Supervision" />

            {/* Header */}
            <Card sx={{ mb: 3 }}>
                <CardHeader
                    title="🛡️ Supervision & Conformité"
                    subheader={`Vue consolidée au ${moment().format('dddd D MMMM YYYY à HH:mm')}`}
                />
                <CardContent sx={{ pt: 0 }}>
                    <Typography variant="body2" color="text.secondary">
                        Centralise les points de supervision exploitation, support, conformité et activité d'audit. Lecture seule — les actions se font dans les ressources respectives.
                    </Typography>
                </CardContent>
            </Card>

            <Grid container spacing={2}>
                {/* Left column — Exploitation + Support */}
                <Grid size={{ xs: 12, md: 7 }}>
                    {/* Exploitation */}
                    <SupervisionSection title="Exploitation" icon="📊" color="#ed6c02">
                        {exploitation.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">✅ Aucune alerte d'exploitation.</Typography>
                        ) : (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                                {exploitation.map((item, i) => (
                                    <SignalChip key={i} {...item} color="#ed6c02" />
                                ))}
                            </Box>
                        )}
                    </SupervisionSection>

                    {/* Support */}
                    <SupervisionSection title="Support client" icon="🛎️" color="#d32f2f">
                        {support.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">✅ Aucune alerte support.</Typography>
                        ) : (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                                {support.map((item, i) => (
                                    <SignalChip key={i} {...item} color="#d32f2f" />
                                ))}
                            </Box>
                        )}
                    </SupervisionSection>

                    {/* Conformité */}
                    <SupervisionSection title="Conformité opérationnelle" icon="📋" color="#7b1fa2">
                        {complianceItems.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">✅ Aucun écart de conformité détecté.</Typography>
                        ) : (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                                {complianceItems.map((item, i) => (
                                    <SignalChip key={i} {...item} color="#7b1fa2" />
                                ))}
                            </Box>
                        )}
                    </SupervisionSection>
                </Grid>

                {/* Right column — Audit trail */}
                <Grid size={{ xs: 12, md: 5 }}>
                    <SupervisionSection title="Activité d'audit récente" icon="🔍" color="#1565c0">
                        {auditLogs.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">Aucune entrée d'audit disponible.</Typography>
                        ) : (
                            <List dense disablePadding>
                                {auditLogs.slice(0, 10).map((log, i) => (
                                    <div key={log.id || i}>
                                        <ListItem sx={{ px: 0 }}>
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <Chip
                                                            label={actionLabels[log.action || ''] || log.action || '—'}
                                                            size="small"
                                                            sx={{ fontSize: '0.7rem', height: 20 }}
                                                        />
                                                        <Typography variant="body2" sx={{ flex: 1 }} noWrap>
                                                            {log.summary || '—'}
                                                        </Typography>
                                                    </Box>
                                                }
                                                secondary={
                                                    <Typography variant="caption" color="text.secondary">
                                                        {formatTimestamp(log.createdAt)} · {formatRelative(log.createdAt)} · par {log.actorRole || '?'}
                                                    </Typography>
                                                }
                                            />
                                        </ListItem>
                                        {i < Math.min(auditLogs.length, 10) - 1 && <Divider />}
                                    </div>
                                ))}
                            </List>
                        )}
                        <Box sx={{ mt: 1, textAlign: 'right' }}>
                            <Link to="/auditLogs" style={{ textDecoration: 'none' }}>
                                <Chip label="Voir tout le journal d'audit →" clickable variant="outlined" size="small" />
                            </Link>
                        </Box>
                    </SupervisionSection>

                    {/* Summary card */}
                    <Paper elevation={2} sx={{ p: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>📊 Résumé</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Typography variant="body2">
                                Exploitation : {exploitation.length === 0 ? '✅ OK' : `⚠️ ${exploitation.reduce((s, e) => s + e.count, 0)} point(s)`}
                            </Typography>
                            <Typography variant="body2">
                                Support : {support.length === 0 ? '✅ OK' : `⚠️ ${support.reduce((s, e) => s + e.count, 0)} point(s)`}
                            </Typography>
                            <Typography variant="body2">
                                Conformité : {complianceItems.length === 0 ? '✅ OK' : `⚠️ ${complianceItems.reduce((s, e) => s + e.count, 0)} écart(s)`}
                            </Typography>
                            <Divider sx={{ my: 0.5 }} />
                            <Typography variant="body2">
                                Dernière entrée audit : {auditLogs.length > 0 ? formatRelative(auditLogs[0].createdAt) : '—'}
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Supervision;
