
import { useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import { Grid } from '@mui/material';
import { Title, useGetList, Loading, useNotify } from 'react-admin';
import DownloadIcon from '@mui/icons-material/Download';
import NightlightRoundIcon from '@mui/icons-material/NightlightRound';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import StarIcon from '@mui/icons-material/Star';
import EmailIcon from '@mui/icons-material/Email';
import { getFunctions, httpsCallable } from 'firebase/functions';
import moment from 'moment';
import type { Agent, Mission, AgentAssignment, Vacation, PayrollStats } from '../types/models';
import { calculateVacationStats } from '../utils/planningUtils';

const Payroll = () => {
    const { data: planning, isLoading: loadingPlanning } = useGetList('planning', { pagination: { page: 1, perPage: 1000 } });
    const { data: agents, isLoading: loadingAgents } = useGetList('agents', { pagination: { page: 1, perPage: 1000 } });
    const notify = useNotify();
    const [sendingEmail, setSendingEmail] = useState<string | null>(null);

    const handleSendPlanning = async (agentId: string) => {
        setSendingEmail(agentId);
        try {
            const functions = getFunctions(undefined, 'europe-west1');
            const sendSummary = httpsCallable(functions, 'sendAgentPlanningSummary');
            const result = await sendSummary({ agentId });

            notify((result.data as { message?: string }).message || 'Planning renvoyé avec succès', { type: 'success' });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
            console.error("Error sending planning:", error);
            notify(`Erreur: ${errorMessage}`, { type: 'error' });
        } finally {
            setSendingEmail(null);
        }
    };

    const stats = useMemo(() => {
        if (!agents || !planning) return [];

        const agentStats: Record<string, PayrollStats> = {};

        // Initialize agents
        agents.filter((a: Agent) => a.role !== 'admin').forEach((agent: Agent) => {
            agentStats[agent.id] = {
                agent,
                totalPlanned: 0,
                totalDone: 0,
                nightHours: 0,
                sundayHours: 0,
                holidayHours: 0,
                futureHours: 0
            };
        });

        const now = moment();

        planning.forEach((mission: Mission) => {
            if (!mission.agentAssignments) return;

            mission.agentAssignments.forEach((assignment: AgentAssignment) => {
                const agentId = assignment.agentId;
                if (!agentStats[agentId]) return;

                assignment.vacations.forEach((vacation: Vacation) => {
                    const start = moment(`${vacation.date}T${vacation.start}`);
                    const end = moment(`${vacation.date}T${vacation.end}`);

                    // Handle overnight shifts (end is next day)
                    if (end.isBefore(start)) {
                        end.add(1, 'day');
                    }

                    const isDone = end.isBefore(now);

                    // Use shared utility for rigorous calculation
                    const vacationStats = calculateVacationStats(start, end);

                    // For totalDone/Planned, we can use the stats.total from shared util
                    if (isDone) {
                        agentStats[agentId].totalDone += vacationStats.total;
                    } else {
                        agentStats[agentId].futureHours += vacationStats.total;
                    }
                    agentStats[agentId].totalPlanned += vacationStats.total;

                    // Details from shared util
                    agentStats[agentId].nightHours += vacationStats.night;
                    agentStats[agentId].sundayHours += vacationStats.sunday;
                    agentStats[agentId].holidayHours += vacationStats.holiday;
                });
            });
        });

        return Object.values(agentStats);
    }, [agents, planning]);

    if (loadingAgents || loadingPlanning) return <Loading />;

    return (
        <Box>
            <Title title="RH & Paie" />

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" sx={{ color: '#1a1a1a', fontWeight: 'bold' }}>
                    Suivi des Heures Agents
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={() => alert("csv export todo")}
                    sx={{ backgroundColor: '#CD1A20' }}
                >
                    Export Global CSV
                </Button>
            </Box>

            <Grid container spacing={3}>
                {stats.map(({ agent, totalDone, futureHours, nightHours, sundayHours, holidayHours }: PayrollStats) => (
                    <Grid size={{ xs: 12, md: 6, lg: 4 }} key={agent.id}>
                        <Paper elevation={2} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
                            <Box display="flex" alignItems="center" mb={2}>
                                <Avatar sx={{ bgcolor: '#CD1A20', mr: 2 }}>
                                    {agent.firstName?.[0]}{agent.lastName?.[0]}
                                </Avatar>
                                <Box>
                                    <Typography variant="h6">
                                        {agent.firstName} {agent.lastName}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        {agent.email}
                                    </Typography>
                                </Box>
                                <Chip
                                    label={agent.status === 'active' ? 'Actif' : 'Inactif'}
                                    color={agent.status === 'active' ? 'success' : 'default'}
                                    size="small"
                                    sx={{ ml: 'auto' }}
                                />
                            </Box>

                            <Divider sx={{ my: 2 }} />

                            <Grid container spacing={2}>
                                { /* Total & Done */}
                                <Grid size={6}>
                                    <Box sx={{ p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1, textAlign: 'center' }}>
                                        <Typography variant="caption" color="textSecondary">Effectuées</Typography>
                                        <Typography variant="h5" color="success.main" fontWeight="bold">
                                            {totalDone.toFixed(1)}h
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid size={6}>
                                    <Box sx={{ p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1, textAlign: 'center' }}>
                                        <Typography variant="caption" color="textSecondary">Planifiées (Futur)</Typography>
                                        <Typography variant="h5" color="primary.main" fontWeight="bold">
                                            {futureHours.toFixed(1)}h
                                        </Typography>
                                    </Box>
                                </Grid>

                                { /* Details */}
                                <Grid size={12}>
                                    <Typography variant="subtitle2" sx={{ mt: 1, mb: 1, fontWeight: 'bold' }}>
                                        Majorations & Détails
                                    </Typography>
                                </Grid>

                                <Grid size={4}>
                                    <Box display="flex" flexDirection="column" alignItems="center">
                                        <NightlightRoundIcon color="action" fontSize="small" />
                                        <Typography variant="caption" mt={0.5}>Nuit</Typography>
                                        <Typography fontWeight="bold">{nightHours.toFixed(1)}h</Typography>
                                    </Box>
                                </Grid>
                                <Grid size={4}>
                                    <Box display="flex" flexDirection="column" alignItems="center">
                                        <CalendarTodayIcon color="action" fontSize="small" />
                                        <Typography variant="caption" mt={0.5}>Dimanche</Typography>
                                        <Typography fontWeight="bold">{sundayHours.toFixed(1)}h</Typography>
                                    </Box>
                                </Grid>
                                <Grid size={4}>
                                    <Box display="flex" flexDirection="column" alignItems="center">
                                        <StarIcon color="action" fontSize="small" />
                                        <Typography variant="caption" mt={0.5}>Férié</Typography>
                                        <Typography fontWeight="bold">{holidayHours.toFixed(1)}h</Typography>
                                    </Box>
                                </Grid>

                                <Grid size={12} sx={{ mt: 2 }}>
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        color="primary"
                                        startIcon={sendingEmail === agent.id ? <CircularProgress size={20} /> : <EmailIcon />}
                                        onClick={() => handleSendPlanning(agent.id)}
                                        disabled={!!sendingEmail}
                                    >
                                        {sendingEmail === agent.id ? "Envoi..." : "Renvoyer Planning"}
                                    </Button>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default Payroll;
