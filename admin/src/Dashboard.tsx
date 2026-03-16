
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
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import { Grid } from '@mui/material';
import { Title } from 'react-admin';
import moment from 'moment';
// @ts-expect-error - moment locale files don't have TypeScript declarations
import 'moment/dist/locale/fr';
import { calculateVacationStats } from './utils/planningUtils';
import type { Mission, AgentAssignment, Vacation } from '@mocyno/types';
import dataProvider from './providers/dataProvider';

moment.locale('fr');

// ─── Types ───────────────────────────────────────────────────────────────────
interface SupportItem {
    id: string;
    title?: string;
    status?: string;
    source?: string;
    severity?: string;
    priority?: string;
    siteName?: string;
    clientId?: string;
    createdAt?: { seconds?: number } | string;
    name?: string;
    type?: string;
}

// ─── KPI Card Component ─────────────────────────────────────────────────────
const KpiCard = ({ value, label, icon, color, to }: {
    value: string | number; label: string; icon: string; color: string; to: string;
}) => (
    <Grid size={{ xs: 6, sm: 4, md: 3 }}>
        <Link to={to} style={{ textDecoration: 'none' }}>
            <Paper elevation={2} sx={{ p: 2, display: 'flex', alignItems: 'center', height: '100%', borderLeft: `4px solid ${color}`, '&:hover': { elevation: 6, transform: 'translateY(-1px)' }, transition: 'all 0.2s' }}>
                <Typography variant="h4" sx={{ mr: 1.5 }}>{icon}</Typography>
                <Box>
                    <Typography variant="h5" fontWeight="bold">{value}</Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>{label}</Typography>
                </Box>
            </Paper>
        </Link>
    </Grid>
);

// ─── Activity Item ───────────────────────────────────────────────────────────
const formatDate = (d: SupportItem['createdAt']): string => {
    if (!d) return '';
    if (typeof d === 'string') return moment(d).fromNow();
    if (d.seconds) return moment(d.seconds * 1000).fromNow();
    return '';
};

// ─── Period options ──────────────────────────────────────────────────────────
type Period = '7d' | '30d' | '90d' | 'all';
const PERIODS: { value: Period; label: string }[] = [
    { value: '7d', label: '7 jours' },
    { value: '30d', label: '30 jours' },
    { value: '90d', label: '90 jours' },
    { value: 'all', label: 'Tout' },
];

const periodToDays = (p: Period): number | null => {
    if (p === '7d') return 7;
    if (p === '30d') return 30;
    if (p === '90d') return 90;
    return null;
};

const isInPeriod = (createdAt: SupportItem['createdAt'], days: number | null): boolean => {
    if (!days) return true;
    const cutoff = moment().subtract(days, 'days');
    if (!createdAt) return false;
    if (typeof createdAt === 'string') return moment(createdAt).isAfter(cutoff);
    if (createdAt.seconds) return moment(createdAt.seconds * 1000).isAfter(cutoff);
    return false;
};

// ─── Dashboard ───────────────────────────────────────────────────────────────
const Dashboard = () => {
    const [planning, setPlanning] = useState<Mission[] | null>(null);
    const [reports, setReports] = useState<SupportItem[]>([]);
    const [requests, setRequests] = useState<SupportItem[]>([]);
    const [consignes, setConsignes] = useState<SupportItem[]>([]);
    const [clients, setClients] = useState<SupportItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<Period>('30d');

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [planRes, repRes, reqRes, conRes, cliRes] = await Promise.all([
                    dataProvider.getList('planning', { pagination: { page: 1, perPage: 200 }, sort: { field: 'createdAt', order: 'DESC' }, filter: {} }),
                    dataProvider.getList('reports', { pagination: { page: 1, perPage: 50 }, sort: { field: 'createdAt', order: 'DESC' }, filter: {} }),
                    dataProvider.getList('clientRequests', { pagination: { page: 1, perPage: 50 }, sort: { field: 'createdAt', order: 'DESC' }, filter: {} }),
                    dataProvider.getList('consignes', { pagination: { page: 1, perPage: 50 }, sort: { field: 'createdAt', order: 'DESC' }, filter: {} }),
                    dataProvider.getList('clients', { pagination: { page: 1, perPage: 100 }, sort: { field: 'provisionedAt', order: 'DESC' }, filter: {} }),
                ]);
                setPlanning(planRes.data as Mission[]);
                setReports(repRes.data as SupportItem[]);
                setRequests(reqRes.data as SupportItem[]);
                setConsignes(conRes.data as SupportItem[]);
                setClients(cliRes.data as SupportItem[]);
            } catch (error) {
                console.error('[Dashboard] fetch error:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    // ─── Planning stats (FIX 1) ──────────────────────────────────────────────
    const planStats = useMemo(() => {
        if (!planning) return { totalMissions: 0, ongoingMissions: 0, upcomingMissions: 0, doneHours: 0, futureHours: 0, agentsCount: 0, sitesCount: 0 };
        let doneHours = 0, futureHours = 0;
        const uniqueAgents = new Set<string>();
        const uniqueSites = new Set<string>();
        const now = moment();
        let activeMissionsCount = 0, futureMissionsCount = 0;

        planning.forEach(mission => {
            let isMissionActive = false, isMissionFuture = false;
            let missionStartTime: moment.Moment | null = null, missionEndTime: moment.Moment | null = null;

            if (mission.agentAssignments) {
                mission.agentAssignments.forEach((assignment: AgentAssignment) => {
                    if (assignment.agentId) uniqueAgents.add(assignment.agentId);
                    assignment.vacations.forEach((vacation: Vacation) => {
                        const start = moment(`${vacation.date}T${vacation.start}`);
                        const end = moment(`${vacation.date}T${vacation.end}`);
                        if (end.isBefore(start)) end.add(1, 'day');
                        if (!missionStartTime || start.isBefore(missionStartTime)) missionStartTime = start;
                        if (!missionEndTime || end.isAfter(missionEndTime)) missionEndTime = end;
                        const vStats = calculateVacationStats(start, end);
                        if (end.isBefore(now)) doneHours += vStats.total;
                        else futureHours += vStats.total;
                    });
                });
            }
            if (missionStartTime && missionEndTime) {
                if (now.isBetween(missionStartTime, missionEndTime)) { isMissionActive = true; activeMissionsCount++; }
                else if (now.isBefore(missionStartTime)) { isMissionFuture = true; futureMissionsCount++; }
            }
            if (mission.siteId && (isMissionActive || isMissionFuture)) uniqueSites.add(mission.siteId);
        });

        return { totalMissions: planning.length, ongoingMissions: activeMissionsCount, upcomingMissions: futureMissionsCount, doneHours, futureHours, agentsCount: uniqueAgents.size, sitesCount: uniqueSites.size };
    }, [planning]);

    // ─── Support stats (FIX 2 + FIX 3) ──────────────────────────────────────
    const days = periodToDays(period);
    const supportStats = useMemo(() => {
        const filteredReports = reports.filter(r => isInPeriod(r.createdAt, days));
        const filteredRequests = requests.filter(r => isInPeriod(r.createdAt, days));
        const filteredConsignes = consignes.filter(c => isInPeriod(c.createdAt, days));
        return {
            openIncidents: filteredReports.filter(r => r.status === 'open').length,
            totalIncidents: filteredReports.length,
            criticalIncidents: filteredReports.filter(r => r.status === 'open' && (r.severity === 'critical' || r.severity === 'high')).length,
            pendingRequests: filteredRequests.filter(r => r.status === 'pending').length,
            inProgressRequests: filteredRequests.filter(r => r.status === 'in_progress').length,
            totalRequests: filteredRequests.length,
            urgentRequests: filteredRequests.filter(r => r.priority === 'urgent' && r.status !== 'closed').length,
            pendingConsignes: filteredConsignes.filter(c => c.source === 'client' && c.status === 'pending').length,
            totalConsignes: filteredConsignes.length,
            activeClients: clients.filter(c => (c as unknown as { portalAccess?: boolean }).portalAccess).length,
            totalClients: clients.length,
        };
    }, [reports, requests, consignes, clients, days]);

    // ─── Alerts — support + exploitation anomalies (A24 FIX 4 + A25 FIX 3) ────
    const alerts = useMemo(() => {
        const items: { label: string; badge: string; to: string; color: string }[] = [];

        // Exploitation anomalies (A25)
        if (planning) {
            const now = moment();
            const missionsNoAgent = planning.filter(m => {
                if (!m.agentAssignments || m.agentAssignments.length === 0) return true;
                return m.agentAssignments.every((a: AgentAssignment) => !a.agentId);
            });
            const activeFutureMissionsNoAgent = missionsNoAgent.filter(m => {
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
            if (activeFutureMissionsNoAgent.length > 0)
                items.push({ label: `${activeFutureMissionsNoAgent.length} mission(s) sans agent affecté`, badge: '⚠️', to: '/planning?view=list', color: '#e65100' });
        }

        // Support alerts
        if (supportStats.criticalIncidents > 0)
            items.push({ label: `${supportStats.criticalIncidents} incident(s) critique(s) ouvert(s)`, badge: '🔴', to: '/reports?filter=%7B%22status%22%3A%22open%22%7D', color: '#d32f2f' });
        if (supportStats.urgentRequests > 0)
            items.push({ label: `${supportStats.urgentRequests} demande(s) urgente(s)`, badge: '🟠', to: '/clientRequests?filter=%7B%22priority%22%3A%22urgent%22%7D', color: '#ed6c02' });
        if (supportStats.pendingConsignes > 0)
            items.push({ label: `${supportStats.pendingConsignes} consigne(s) client en attente`, badge: '🟡', to: '/consignes?filter=%7B%22source%22%3A%22client%22%2C%22status%22%3A%22pending%22%7D', color: '#f9a825' });
        if (supportStats.pendingRequests > 0)
            items.push({ label: `${supportStats.pendingRequests} demande(s) en attente de traitement`, badge: '📋', to: '/clientRequests?filter=%7B%22status%22%3A%22pending%22%7D', color: '#1976d2' });
        return items;
    }, [supportStats, planning]);

    // ─── Recent activity (FIX 4) ─────────────────────────────────────────────
    const recentActivity = useMemo(() => {
        const items: { label: string; date: string; badge: string; to: string }[] = [];
        reports.slice(0, 3).forEach(r => items.push({ label: `📌 Incident: ${r.title || '—'}`, date: formatDate(r.createdAt), badge: r.status === 'open' ? '🔴' : '🟢', to: `/reports/${r.id}/show` }));
        requests.slice(0, 3).forEach(r => items.push({ label: `📝 Demande: ${r.title || '—'}`, date: formatDate(r.createdAt), badge: r.status === 'pending' ? '🟡' : '🟢', to: `/clientRequests/${r.id}/show` }));
        consignes.filter(c => c.source === 'client').slice(0, 2).forEach(c => items.push({ label: `📋 Consigne client: ${c.title || '—'}`, date: formatDate(c.createdAt), badge: c.status === 'pending' ? '🟡' : '✅', to: `/consignes/${c.id}/show` }));
        return items.sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 8);
    }, [reports, requests, consignes]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Title title="Tableau de Bord" />

            {/* Header */}
            <Card sx={{ mb: 3 }}>
                <CardHeader
                    title="Mo'Cyno — Cockpit Admin"
                    subheader={`${moment().format('dddd D MMMM YYYY')} — v2.0.0-A24`}
                />
                <CardContent sx={{ pt: 0, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography color="text.secondary" sx={{ flexGrow: 1 }}>
                        Vue consolidée exploitation & support client.
                    </Typography>
                    <ToggleButtonGroup
                        value={period}
                        exclusive
                        onChange={(_, v) => { if (v) setPeriod(v); }}
                        size="small"
                    >
                        {PERIODS.map(p => (
                            <ToggleButton key={p.value} value={p.value}>{p.label}</ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                </CardContent>
            </Card>

            {/* ── Alerts ── */}
            {alerts.length > 0 && (
                <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: '#fff3e0', borderLeft: '4px solid #ed6c02' }}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>⚠️ À traiter</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {alerts.map((a, i) => (
                            <Link key={i} to={a.to} style={{ textDecoration: 'none' }}>
                                <Chip label={`${a.badge} ${a.label}`} clickable sx={{ bgcolor: 'white', border: `1px solid ${a.color}` }} />
                            </Link>
                        ))}
                    </Box>
                </Paper>
            )}

            {/* ── Section: Exploitation ── */}
            <Typography variant="h6" sx={{ mb: 1.5, mt: 1 }}>📊 Exploitation</Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <KpiCard value={planStats.totalMissions} label="Missions totales" icon="📋" color="#9c27b0" to="/planning?view=list" />
                <KpiCard value={planStats.ongoingMissions} label="En cours" icon="🔥" color="#ff9800" to="/planning?view=list" />
                <KpiCard value={planStats.upcomingMissions} label="À venir" icon="📅" color="#03a9f4" to="/planning?view=list" />
                <KpiCard value={`${planStats.doneHours.toFixed(0)}h`} label="Heures effectuées" icon="✅" color="#2e7d32" to="/planning?view=list" />
                <KpiCard value={`${planStats.futureHours.toFixed(0)}h`} label="Heures planifiées" icon="⏱" color="#1976d2" to="/planning?view=calendar" />
                <KpiCard value={planStats.agentsCount} label="Agents mobilisés" icon="👥" color="#0288d1" to="/agents" />
                <KpiCard value={planStats.sitesCount} label="Sites actifs" icon="🏢" color="#ed6c02" to="/sites" />
                <KpiCard value={`${supportStats.activeClients}/${supportStats.totalClients}`} label="Clients actifs" icon="🤝" color="#7b1fa2" to="/clients" />
            </Grid>

            {/* ── Section: Support & Clients ── */}
            <Typography variant="h6" sx={{ mb: 1.5 }}>🛎️ Support & Clients <Chip label={PERIODS.find(p => p.value === period)?.label || ''} size="small" sx={{ ml: 1 }} /></Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <KpiCard value={supportStats.openIncidents} label={`Incidents ouverts / ${supportStats.totalIncidents}`} icon="🔴" color="#d32f2f" to="/reports?filter=%7B%22status%22%3A%22open%22%7D" />
                <KpiCard value={supportStats.pendingRequests} label={`Demandes en attente / ${supportStats.totalRequests}`} icon="📝" color="#ff9800" to="/clientRequests?filter=%7B%22status%22%3A%22pending%22%7D" />
                <KpiCard value={supportStats.pendingConsignes} label="Consignes à valider" icon="📋" color="#f9a825" to="/consignes?filter=%7B%22source%22%3A%22client%22%2C%22status%22%3A%22pending%22%7D" />
                <KpiCard value={supportStats.inProgressRequests} label="Demandes en cours" icon="🟠" color="#1976d2" to="/clientRequests?filter=%7B%22status%22%3A%22in_progress%22%7D" />
            </Grid>

            {/* ── Section: Activité récente ── */}
            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 7 }}>
                    <Paper elevation={2} sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>🕐 Activité récente</Typography>
                        {recentActivity.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">Aucune activité récente.</Typography>
                        ) : (
                            <List dense disablePadding>
                                {recentActivity.map((item, i) => (
                                    <div key={i}>
                                        <ListItem component={Link} to={item.to} sx={{ textDecoration: 'none', color: 'inherit', '&:hover': { bgcolor: '#f5f5f5' } }}>
                                            <ListItemText
                                                primary={<span>{item.badge} {item.label}</span>}
                                                secondary={item.date}
                                            />
                                        </ListItem>
                                        {i < recentActivity.length - 1 && <Divider />}
                                    </div>
                                ))}
                            </List>
                        )}
                    </Paper>
                </Grid>

                {/* Raccourcis */}
                <Grid size={{ xs: 12, md: 5 }}>
                    <Paper elevation={2} sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>🔗 Raccourcis</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {[
                                { label: 'Créer une mission', to: '/planning', icon: '➕' },
                                { label: 'Voir les incidents', to: '/reports', icon: '🔴' },
                                { label: 'Voir les demandes', to: '/clientRequests', icon: '📝' },
                                { label: 'Gérer les consignes', to: '/consignes', icon: '📋' },
                                { label: 'Gérer les documents', to: '/documents', icon: '📄' },
                                { label: 'Nouveau client', to: '/clients/create', icon: '🤝' },
                            ].map((s, i) => (
                                <Link key={i} to={s.to} style={{ textDecoration: 'none' }}>
                                    <Chip label={`${s.icon} ${s.label}`} clickable variant="outlined" sx={{ width: '100%', justifyContent: 'flex-start', py: 1 }} />
                                </Link>
                            ))}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Dashboard;
