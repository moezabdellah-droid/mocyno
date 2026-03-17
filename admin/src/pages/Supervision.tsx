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
import Button from '@mui/material/Button';
import { Grid } from '@mui/material';
import { Title } from 'react-admin';
import moment from 'moment';
// @ts-expect-error - moment locale files don't have TypeScript declarations
import 'moment/dist/locale/fr';
import type { Mission, AgentAssignment, Vacation } from '@mocyno/types';
import dataProvider from '../providers/dataProvider';

moment.locale('fr');

// ─── Priority levels ─────────────────────────────────────────────────────────
type AlertLevel = 'critical' | 'high' | 'moderate' | 'watch';

interface AlertItem {
    level: AlertLevel;
    icon: string;
    count: number;
    label: string;
    action: string;
    to: string;
    category: 'exploitation' | 'support' | 'compliance' | 'audit';
}

const LEVEL_CONFIG: Record<AlertLevel, { color: string; bg: string; label: string; order: number }> = {
    critical: { color: '#d32f2f', bg: '#fff5f5', label: 'Critique', order: 0 },
    high:     { color: '#ed6c02', bg: '#fff8e1', label: 'Élevé', order: 1 },
    moderate: { color: '#1976d2', bg: '#e8f4fd', label: 'Modéré', order: 2 },
    watch:    { color: '#7b1fa2', bg: '#faf5ff', label: 'Surveillance', order: 3 },
};

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

interface AutomationLogItem {
    id: string;
    type?: string;
    status?: string;
    totalIssues?: number;
    signals?: { type: string; count: number; level: string; detail: string }[];
    auditSummary?: { total: number; agentCreations: number; clientCreations: number; passwordChanges: number };
    runAt?: { seconds?: number } | string;
    version?: string;
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

const getTimestamp = (d: SupportItem['createdAt']): number => {
    if (!d) return 0;
    if (typeof d === 'string') return new Date(d).getTime();
    if (d.seconds) return d.seconds * 1000;
    return 0;
};

const actionLabels: Record<string, string> = {
    createAgent: 'Création agent',
    createClient: 'Création client',
    updateAgentPassword: 'Changement MDP',
    generateMatricule: 'Génération matricule',
};

// ─── Section Component ───────────────────────────────────────────────────────
const SupervisionSection = ({ title, icon, children, color = '#1976d2', actions }: {
    title: string; icon: string; children: React.ReactNode; color?: string;
    actions?: { label: string; to: string }[];
}) => (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>{icon}</span>
                <span style={{ borderBottom: `2px solid ${color}`, paddingBottom: 2 }}>{title}</span>
            </Typography>
            {actions && (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {actions.map((a, i) => (
                        <Link key={i} to={a.to} style={{ textDecoration: 'none' }}>
                            <Chip label={a.label} clickable size="small" variant="outlined" />
                        </Link>
                    ))}
                </Box>
            )}
        </Box>
        {children}
    </Paper>
);

// ─── Alert Row ───────────────────────────────────────────────────────────────
const AlertRow = ({ alert }: { alert: AlertItem }) => {
    const cfg = LEVEL_CONFIG[alert.level];
    return (
        <Link to={alert.to} style={{ textDecoration: 'none', display: 'block' }}>
            <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1, p: 1, mb: 0.5,
                borderRadius: 1, bgcolor: cfg.bg, border: `1px solid ${cfg.color}20`,
                '&:hover': { bgcolor: `${cfg.color}15` }
            }}>
                <Chip label={cfg.label} size="small" sx={{
                    bgcolor: cfg.color, color: 'white', fontSize: '0.65rem', height: 20, minWidth: 70
                }} />
                <Typography variant="body2" sx={{ flex: 1 }}>
                    {alert.icon} <strong>{alert.count}</strong> {alert.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">{alert.action} →</Typography>
            </Box>
        </Link>
    );
};

// ─── Supervision Page ────────────────────────────────────────────────────────
const Supervision = () => {
    const [planning, setPlanning] = useState<Mission[] | null>(null);
    const [reports, setReports] = useState<SupportItem[]>([]);
    const [requests, setRequests] = useState<SupportItem[]>([]);
    const [consignes, setConsignes] = useState<SupportItem[]>([]);
    const [clients, setClients] = useState<ClientItem[]>([]);
    const [agents, setAgents] = useState<AgentItem[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
    const [automationLogs, setAutomationLogs] = useState<AutomationLogItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [planRes, repRes, reqRes, conRes, cliRes, agtRes, audRes, autoRes] = await Promise.all([
                    dataProvider.getList('planning', { pagination: { page: 1, perPage: 200 }, sort: { field: 'createdAt', order: 'DESC' }, filter: {} }),
                    dataProvider.getList('reports', { pagination: { page: 1, perPage: 50 }, sort: { field: 'createdAt', order: 'DESC' }, filter: {} }),
                    dataProvider.getList('clientRequests', { pagination: { page: 1, perPage: 50 }, sort: { field: 'createdAt', order: 'DESC' }, filter: {} }),
                    dataProvider.getList('consignes', { pagination: { page: 1, perPage: 50 }, sort: { field: 'createdAt', order: 'DESC' }, filter: {} }),
                    dataProvider.getList('clients', { pagination: { page: 1, perPage: 100 }, sort: { field: 'provisionedAt', order: 'DESC' }, filter: {} }),
                    dataProvider.getList('agents', { pagination: { page: 1, perPage: 200 }, sort: { field: 'lastName', order: 'ASC' }, filter: {} }),
                    dataProvider.getList('auditLogs', { pagination: { page: 1, perPage: 25 }, sort: { field: 'createdAt', order: 'DESC' }, filter: {} }).catch(() => ({ data: [], total: 0 })),
                    dataProvider.getList('automationLogs', { pagination: { page: 1, perPage: 5 }, sort: { field: 'runAt', order: 'DESC' }, filter: {} }).catch(() => ({ data: [], total: 0 })),
                ]);
                setPlanning(planRes.data as Mission[]);
                setReports(repRes.data as SupportItem[]);
                setRequests(reqRes.data as SupportItem[]);
                setConsignes(conRes.data as SupportItem[]);
                setClients(cliRes.data as ClientItem[]);
                setAgents(agtRes.data as AgentItem[]);
                setAuditLogs(audRes.data as AuditLogItem[]);
                setAutomationLogs(autoRes.data as AutomationLogItem[]);
            } catch (error) {
                console.error('[Supervision] fetch error:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    // ─── Build all alerts with priority ──────────────────────────────────────
    const allAlerts = useMemo(() => {
        const now = moment();
        const alerts: AlertItem[] = [];

        // --- EXPLOITATION ---
        if (planning) {
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
                alerts.push({
                    level: 'high', icon: '⚠️', count: missionsNoAgent.length,
                    label: 'mission(s) active/future sans agent', action: 'Affecter',
                    to: '/planning?view=list', category: 'exploitation'
                });
            }

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
                alerts.push({
                    level: 'watch', icon: '🔥', count: ongoingCount,
                    label: 'mission(s) en cours', action: 'Voir',
                    to: '/planning?view=list', category: 'exploitation'
                });
            }
        }

        // --- SUPPORT ---
        const criticalIncidents = reports.filter(r => r.status === 'open' && (r.severity === 'critical' || r.severity === 'high'));
        if (criticalIncidents.length > 0) {
            alerts.push({
                level: 'critical', icon: '🔥', count: criticalIncidents.length,
                label: 'incident(s) critique/élevé ouvert(s)', action: 'Traiter',
                to: '/reports?filter=%7B%22status%22%3A%22open%22%7D', category: 'support'
            });
        }

        const openIncidents = reports.filter(r => r.status === 'open' && r.severity !== 'critical' && r.severity !== 'high');
        if (openIncidents.length > 0) {
            alerts.push({
                level: 'moderate', icon: '🔴', count: openIncidents.length,
                label: 'incident(s) ouvert(s)', action: 'Voir',
                to: '/reports?filter=%7B%22status%22%3A%22open%22%7D', category: 'support'
            });
        }

        const urgentRequests = requests.filter(r => r.priority === 'urgent' && r.status !== 'closed');
        if (urgentRequests.length > 0) {
            alerts.push({
                level: 'critical', icon: '🚨', count: urgentRequests.length,
                label: 'demande(s) client urgente(s) non traitée(s)', action: 'Traiter',
                to: '/clientRequests?filter=%7B%22priority%22%3A%22urgent%22%7D', category: 'support'
            });
        }

        const pendingRequests = requests.filter(r => r.status === 'pending');
        if (pendingRequests.length > 0) {
            alerts.push({
                level: 'moderate', icon: '📝', count: pendingRequests.length,
                label: 'demande(s) en attente de traitement', action: 'Répondre',
                to: '/clientRequests?filter=%7B%22status%22%3A%22pending%22%7D', category: 'support'
            });
        }

        const staleConsignes = consignes.filter(c => {
            if (c.source !== 'client' || c.status !== 'pending') return false;
            const ts = getTimestamp(c.createdAt);
            return ts > 0 && now.diff(moment(ts), 'days') > 3;
        });
        if (staleConsignes.length > 0) {
            alerts.push({
                level: 'high', icon: '📋', count: staleConsignes.length,
                label: 'consigne(s) client en attente > 3 jours', action: 'Traiter',
                to: '/consignes?filter=%7B%22source%22%3A%22client%22%2C%22status%22%3A%22pending%22%7D', category: 'support'
            });
        }

        const recentConsignes = consignes.filter(c => {
            if (c.source !== 'client' || c.status !== 'pending') return false;
            const ts = getTimestamp(c.createdAt);
            return ts > 0 && now.diff(moment(ts), 'days') <= 3;
        });
        if (recentConsignes.length > 0) {
            alerts.push({
                level: 'moderate', icon: '📋', count: recentConsignes.length,
                label: 'consigne(s) client en attente récente(s)', action: 'Voir',
                to: '/consignes?filter=%7B%22source%22%3A%22client%22%2C%22status%22%3A%22pending%22%7D', category: 'support'
            });
        }

        // --- COMPLIANCE ---
        const activeAgents = agents.filter(a => a.status === 'active');

        const noCard = activeAgents.filter(a => !a.professionalCardNumber);
        if (noCard.length > 0) {
            alerts.push({
                level: 'high', icon: '🪪', count: noCard.length,
                label: 'agent(s) actif(s) sans carte professionnelle', action: 'Compléter',
                to: '/agents?filter=%7B%22status%22%3A%22active%22%7D', category: 'compliance'
            });
        }

        const noMatricule = activeAgents.filter(a => !a.matricule);
        if (noMatricule.length > 0) {
            alerts.push({
                level: 'moderate', icon: '🔢', count: noMatricule.length,
                label: 'agent(s) actif(s) sans matricule', action: 'Générer',
                to: '/agents?filter=%7B%22status%22%3A%22active%22%7D', category: 'compliance'
            });
        }

        const expiredSST = activeAgents.filter(a => a.sstExpiresAt && moment(a.sstExpiresAt).isBefore(now));
        if (expiredSST.length > 0) {
            alerts.push({
                level: 'critical', icon: '🏥', count: expiredSST.length,
                label: 'agent(s) actif(s) avec SST expirée', action: 'Renouveler',
                to: '/agents?filter=%7B%22status%22%3A%22active%22%7D', category: 'compliance'
            });
        }

        const soonSST = activeAgents.filter(a => {
            if (!a.sstExpiresAt) return false;
            const exp = moment(a.sstExpiresAt);
            return exp.isAfter(now) && exp.diff(now, 'days') <= 30;
        });
        if (soonSST.length > 0) {
            alerts.push({
                level: 'watch', icon: '⏰', count: soonSST.length,
                label: 'agent(s) SST expire sous 30 jours', action: 'Anticiper',
                to: '/agents?filter=%7B%22status%22%3A%22active%22%7D', category: 'compliance'
            });
        }

        const clientsNoSite = clients.filter(c => !c.siteId && (!c.siteIds || c.siteIds.length === 0));
        if (clientsNoSite.length > 0) {
            alerts.push({
                level: 'moderate', icon: '🔗', count: clientsNoSite.length,
                label: 'client(s) sans site rattaché', action: 'Rattacher',
                to: '/clients', category: 'compliance'
            });
        }

        // Sort by priority
        return alerts.sort((a, b) => LEVEL_CONFIG[a.level].order - LEVEL_CONFIG[b.level].order);
    }, [planning, reports, requests, consignes, agents, clients]);

    // ─── Audit activity summary ──────────────────────────────────────────────
    const auditSummary = useMemo(() => {
        const now = moment();
        const last24h = auditLogs.filter(l => {
            const ts = getTimestamp(l.createdAt);
            return ts > 0 && now.diff(moment(ts), 'hours') <= 24;
        });
        const last7d = auditLogs.filter(l => {
            const ts = getTimestamp(l.createdAt);
            return ts > 0 && now.diff(moment(ts), 'days') <= 7;
        });

        const countByAction = (logs: AuditLogItem[], action: string) =>
            logs.filter(l => l.action === action).length;

        return {
            total24h: last24h.length,
            total7d: last7d.length,
            creates24h: countByAction(last24h, 'createAgent') + countByAction(last24h, 'createClient'),
            creates7d: countByAction(last7d, 'createAgent') + countByAction(last7d, 'createClient'),
            passwords24h: countByAction(last24h, 'updateAgentPassword'),
            passwords7d: countByAction(last7d, 'updateAgentPassword'),
        };
    }, [auditLogs]);

    // ─── Triage: À traiter / À surveiller / Revu ─────────────────────────────
    const urgentAlerts = allAlerts.filter(a => a.level === 'critical' || a.level === 'high');
    const moderateAlerts = allAlerts.filter(a => a.level === 'moderate');
    const watchAlerts = allAlerts.filter(a => a.level === 'watch');

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
                    title="🛡️ Supervision & Conformité Avancée"
                    subheader={`Vue consolidée au ${moment().format('dddd D MMMM YYYY à HH:mm')}`}
                />
                <CardContent sx={{ pt: 0, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip
                        label={`${urgentAlerts.length} à traiter`}
                        sx={{ bgcolor: urgentAlerts.length > 0 ? '#d32f2f' : '#4caf50', color: 'white', fontWeight: 'bold' }}
                    />
                    <Chip
                        label={`${moderateAlerts.length} à suivre`}
                        sx={{ bgcolor: moderateAlerts.length > 0 ? '#1976d2' : '#4caf50', color: 'white' }}
                    />
                    <Chip
                        label={`${watchAlerts.length} en surveillance`}
                        variant="outlined"
                    />
                    <Chip
                        label={`${auditSummary.total24h} action(s) audit 24h`}
                        variant="outlined"
                        sx={{ borderColor: '#1565c0' }}
                    />
                </CardContent>
            </Card>

            <Grid container spacing={2}>
                {/* Left column — Priority-sorted alerts */}
                <Grid size={{ xs: 12, md: 7 }}>
                    {/* À traiter maintenant */}
                    <SupervisionSection
                        title="À traiter maintenant"
                        icon="🚨"
                        color="#d32f2f"
                        actions={[
                            { label: 'Incidents →', to: '/reports' },
                            { label: 'Demandes →', to: '/clientRequests' },
                        ]}
                    >
                        {urgentAlerts.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 2, color: 'text.secondary' }}>
                                <Typography variant="body1" sx={{ fontSize: '1.5rem', mb: 0.5 }}>✅</Typography>
                                <Typography variant="body2">Aucune action urgente requise.</Typography>
                            </Box>
                        ) : (
                            <Box>{urgentAlerts.map((a, i) => <AlertRow key={i} alert={a} />)}</Box>
                        )}
                    </SupervisionSection>

                    {/* À suivre */}
                    <SupervisionSection
                        title="À suivre"
                        icon="📊"
                        color="#1976d2"
                        actions={[
                            { label: 'Consignes →', to: '/consignes' },
                            { label: 'Agents →', to: '/agents' },
                        ]}
                    >
                        {moderateAlerts.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 2, color: 'text.secondary' }}>
                                <Typography variant="body1" sx={{ fontSize: '1.5rem', mb: 0.5 }}>✅</Typography>
                                <Typography variant="body2">Aucun point de suivi.</Typography>
                            </Box>
                        ) : (
                            <Box>{moderateAlerts.map((a, i) => <AlertRow key={i} alert={a} />)}</Box>
                        )}
                    </SupervisionSection>

                    {/* Surveillance */}
                    <SupervisionSection
                        title="Surveillance"
                        icon="👁️"
                        color="#7b1fa2"
                        actions={[
                            { label: 'Planning →', to: '/planning' },
                            { label: 'Clients →', to: '/clients' },
                        ]}
                    >
                        {watchAlerts.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 2, color: 'text.secondary' }}>
                                <Typography variant="body1" sx={{ fontSize: '1.5rem', mb: 0.5 }}>✅</Typography>
                                <Typography variant="body2">Tout est sous contrôle.</Typography>
                            </Box>
                        ) : (
                            <Box>{watchAlerts.map((a, i) => <AlertRow key={i} alert={a} />)}</Box>
                        )}
                    </SupervisionSection>
                </Grid>

                {/* Right column — Audit + Summary */}
                <Grid size={{ xs: 12, md: 5 }}>
                    {/* Audit Activity Summary */}
                    <SupervisionSection
                        title="Activité sensible"
                        icon="🔐"
                        color="#1565c0"
                        actions={[{ label: 'Journal complet →', to: '/auditLogs' }]}
                    >
                        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                            <Paper variant="outlined" sx={{ p: 1.5, flex: 1, minWidth: 120, textAlign: 'center' }}>
                                <Typography variant="h5" fontWeight="bold">{auditSummary.total24h}</Typography>
                                <Typography variant="caption">actions 24h</Typography>
                            </Paper>
                            <Paper variant="outlined" sx={{ p: 1.5, flex: 1, minWidth: 120, textAlign: 'center' }}>
                                <Typography variant="h5" fontWeight="bold">{auditSummary.total7d}</Typography>
                                <Typography variant="caption">actions 7 jours</Typography>
                            </Paper>
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1.5 }}>
                            {auditSummary.creates7d > 0 && (
                                <Typography variant="body2">👤 {auditSummary.creates7d} création(s) agent/client (7j)</Typography>
                            )}
                            {auditSummary.passwords7d > 0 && (
                                <Typography variant="body2">🔑 {auditSummary.passwords7d} changement(s) MDP (7j)</Typography>
                            )}
                            {auditSummary.total7d === 0 && (
                                <Typography variant="body2" color="text.secondary">Aucune activité sensible récente.</Typography>
                            )}
                        </Box>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>Dernières entrées</Typography>
                        {auditLogs.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">Aucune entrée d'audit.</Typography>
                        ) : (
                            <List dense disablePadding>
                                {auditLogs.slice(0, 5).map((log, i) => (
                                    <div key={log.id || i}>
                                        <ListItem sx={{ px: 0 }}>
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <Chip
                                                            label={actionLabels[log.action || ''] || log.action || '—'}
                                                            size="small"
                                                            sx={{ fontSize: '0.65rem', height: 20 }}
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
                                        {i < Math.min(auditLogs.length, 5) - 1 && <Divider />}
                                    </div>
                                ))}
                            </List>
                        )}
                    </SupervisionSection>

                    {/* A36 — Automation visibility */}
                    <SupervisionSection title="Automatisations" icon="⚙️" color="#00796b">
                        {automationLogs.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">Aucun run d'automatisation enregistré.</Typography>
                        ) : (
                            <Box>
                                {(() => {
                                    const lastRun = automationLogs[0];
                                    const runTime = lastRun?.runAt ? formatTimestamp(lastRun.runAt as any) : '—';
                                    return (
                                        <Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <Chip
                                                    label={lastRun?.status === 'all_clear' ? '✅ OK' : lastRun?.status === 'issues_found' ? '⚠️ Signaux' : '❌ Erreur'}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: lastRun?.status === 'all_clear' ? '#e8f5e9' : lastRun?.status === 'issues_found' ? '#fff3e0' : '#ffebee',
                                                        color: lastRun?.status === 'all_clear' ? '#2e7d32' : lastRun?.status === 'issues_found' ? '#e65100' : '#c62828',
                                                        fontWeight: 'bold'
                                                    }}
                                                />
                                                <Typography variant="caption" color="text.secondary">
                                                    Dernier run : {runTime}
                                                </Typography>
                                            </Box>
                                            {lastRun?.signals && lastRun.signals.length > 0 && (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    {lastRun.signals.map((sig, i) => (
                                                        <Typography key={i} variant="body2" sx={{ fontSize: '0.8rem' }}>
                                                            {sig.level === 'critical' ? '🔴' : sig.level === 'high' ? '🟠' : '🔵'} {sig.count} {sig.detail}
                                                        </Typography>
                                                    ))}
                                                </Box>
                                            )}
                                            {lastRun?.auditSummary && (
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                                    Audit 24h : {lastRun.auditSummary.total} action(s)
                                                    {lastRun.auditSummary.agentCreations > 0 && ` · ${lastRun.auditSummary.agentCreations} création(s) agent`}
                                                    {lastRun.auditSummary.passwordChanges > 0 && ` · ${lastRun.auditSummary.passwordChanges} changement(s) MDP`}
                                                </Typography>
                                            )}
                                        </Box>
                                    );
                                })()}
                            </Box>
                        )}
                    </SupervisionSection>

                    {/* Summary card */}
                    <Paper elevation={2} sx={{ p: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>📊 Synthèse managériale</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Typography variant="body2" sx={{ color: urgentAlerts.length > 0 ? '#d32f2f' : '#4caf50', fontWeight: 'bold' }}>
                                {urgentAlerts.length === 0 ? '✅ Aucune action urgente' : `🚨 ${urgentAlerts.length} alerte(s) à traiter`}
                            </Typography>
                            <Typography variant="body2">
                                Exploitation : {allAlerts.filter(a => a.category === 'exploitation').length === 0
                                    ? '✅ OK'
                                    : `${allAlerts.filter(a => a.category === 'exploitation').reduce((s, e) => s + e.count, 0)} point(s)`}
                            </Typography>
                            <Typography variant="body2">
                                Support : {allAlerts.filter(a => a.category === 'support').length === 0
                                    ? '✅ OK'
                                    : `${allAlerts.filter(a => a.category === 'support').reduce((s, e) => s + e.count, 0)} point(s)`}
                            </Typography>
                            <Typography variant="body2">
                                Conformité : {allAlerts.filter(a => a.category === 'compliance').length === 0
                                    ? '✅ OK'
                                    : `${allAlerts.filter(a => a.category === 'compliance').reduce((s, e) => s + e.count, 0)} écart(s)`}
                            </Typography>
                            <Divider sx={{ my: 0.5 }} />
                            <Typography variant="body2">
                                Audit : {auditSummary.total24h} action(s) 24h · {auditSummary.total7d} action(s) 7j
                            </Typography>
                        </Box>
                        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Link to="/reports" style={{ textDecoration: 'none' }}>
                                <Button size="small" variant="outlined">Incidents</Button>
                            </Link>
                            <Link to="/clientRequests" style={{ textDecoration: 'none' }}>
                                <Button size="small" variant="outlined">Demandes</Button>
                            </Link>
                            <Link to="/agents" style={{ textDecoration: 'none' }}>
                                <Button size="small" variant="outlined">Agents</Button>
                            </Link>
                            <Link to="/auditLogs" style={{ textDecoration: 'none' }}>
                                <Button size="small" variant="outlined">Journal</Button>
                            </Link>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Supervision;
