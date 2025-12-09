
import { useMemo, useState, useEffect } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import { Grid } from '@mui/material';
import { Title } from 'react-admin';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GroupIcon from '@mui/icons-material/Group';
import BusinessIcon from '@mui/icons-material/Business';
import moment from 'moment';
// @ts-expect-error - moment locale files don't have TypeScript declarations
import 'moment/dist/locale/fr';
import { calculateVacationStats } from './utils/planningUtils';
import type { Mission, AgentAssignment, Vacation } from './types/models';
import dataProvider from './dataProvider';

moment.locale('fr');

const Dashboard = () => {
    const [planning, setPlanning] = useState<Mission[] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Direct call to dataProvider to bypass potential hook issues
                const { data } = await dataProvider.getList('planning', {
                    pagination: { page: 1, perPage: 1000 },
                    sort: { field: 'createdAt', order: 'DESC' },
                    filter: {}
                });
                setPlanning(data as Mission[]);
            } catch (error) {
                console.error('Error fetching planning:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const stats = useMemo(() => {
        if (!planning) return {
            doneHours: 0,
            futureHours: 0,
            agentsCount: 0,
            sitesCount: 0,
            totalMissions: 0,
            ongoingMissions: 0,
            upcomingMissions: 0
        };

        let doneHours = 0;
        let futureHours = 0;
        const uniqueAgents = new Set<string>();
        const uniqueSites = new Set<string>();
        const now = moment();

        let activeMissionsCount = 0;
        let futureMissionsCount = 0;

        planning.forEach(mission => {
            let isMissionActive = false;
            let isMissionFuture = false;
            let missionStartTime: moment.Moment | null = null;
            let missionEndTime: moment.Moment | null = null;

            if (mission.agentAssignments) {
                mission.agentAssignments.forEach((assignment: AgentAssignment) => {
                    if (assignment.agentId) uniqueAgents.add(assignment.agentId);

                    assignment.vacations.forEach((vacation: Vacation) => {
                        const start = moment(`${vacation.date}T${vacation.start}`);
                        const end = moment(`${vacation.date}T${vacation.end}`);
                        if (end.isBefore(start)) end.add(1, 'day');

                        // Track mission timeframe
                        if (!missionStartTime || start.isBefore(missionStartTime)) missionStartTime = start;
                        if (!missionEndTime || end.isAfter(missionEndTime)) missionEndTime = end;

                        const vStats = calculateVacationStats(start, end);

                        if (end.isBefore(now)) {
                            doneHours += vStats.total;
                        } else {
                            futureHours += vStats.total;
                        }
                    });
                });
            }

            // Determine Mission Status based on computed start/end times
            if (missionStartTime && missionEndTime) {
                if (now.isBetween(missionStartTime, missionEndTime)) {
                    isMissionActive = true;
                    activeMissionsCount++;
                } else if (now.isBefore(missionStartTime)) {
                    isMissionFuture = true;
                    futureMissionsCount++;
                }
            }

            // Only count sites that have active or future missions for the "Sites programmés" KPI
            if (mission.siteId && (isMissionActive || isMissionFuture)) {
                uniqueSites.add(mission.siteId);
            }
        });

        return {
            doneHours,
            futureHours,
            agentsCount: uniqueAgents.size,
            sitesCount: uniqueSites.size,
            totalMissions: planning.length,
            ongoingMissions: activeMissionsCount,
            upcomingMissions: futureMissionsCount
        };
    }, [planning]);

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

            <Card sx={{ mb: 3 }}>
                <CardHeader title="Bienvenue sur Mo'Cyno Admin" />
                <CardContent>
                    <Typography color="textSecondary">
                        Voici un aperçu de l'activité de votre agence.
                    </Typography>
                </CardContent>
            </Card>

            <Grid container spacing={3} sx={{ mb: 3 }}>
                {/* Row 1: Mission Stats */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Paper elevation={3} sx={{ p: 3, display: 'flex', alignItems: 'center', height: '100%', borderLeft: '5px solid #9c27b0' }}>
                        <Typography variant="h3" sx={{ mr: 2 }}>📋</Typography>
                        <Box>
                            <Typography variant="h4" fontWeight="bold">
                                {stats.totalMissions}
                            </Typography>
                            <Typography variant="subtitle1" color="textSecondary">
                                Missions Totales
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Paper elevation={3} sx={{ p: 3, display: 'flex', alignItems: 'center', height: '100%', borderLeft: '5px solid #ff9800' }}>
                        <Typography variant="h3" sx={{ mr: 2 }}>🔥</Typography>
                        <Box>
                            <Typography variant="h4" fontWeight="bold">
                                {stats.ongoingMissions}
                            </Typography>
                            <Typography variant="subtitle1" color="textSecondary">
                                Missions En Cours
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Paper elevation={3} sx={{ p: 3, display: 'flex', alignItems: 'center', height: '100%', borderLeft: '5px solid #03a9f4' }}>
                        <Typography variant="h3" sx={{ mr: 2 }}>📅</Typography>
                        <Box>
                            <Typography variant="h4" fontWeight="bold">
                                {stats.upcomingMissions}
                            </Typography>
                            <Typography variant="subtitle1" color="textSecondary">
                                Missions À Venir
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* Row 2: General Stats */}
            <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper elevation={3} sx={{ p: 3, display: 'flex', alignItems: 'center', height: '100%', borderLeft: '5px solid #2e7d32' }}>
                        <CheckCircleIcon sx={{ fontSize: 50, color: '#2e7d32', mr: 2 }} />
                        <Box>
                            <Typography variant="h4" fontWeight="bold">
                                {stats.doneHours.toFixed(0)}h
                            </Typography>
                            <Typography variant="subtitle1" color="textSecondary">
                                Heures Effectuées
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper elevation={3} sx={{ p: 3, display: 'flex', alignItems: 'center', height: '100%', borderLeft: '5px solid #1976d2' }}>
                        <AccessTimeIcon sx={{ fontSize: 50, color: '#1976d2', mr: 2 }} />
                        <Box>
                            <Typography variant="h4" fontWeight="bold">
                                {stats.futureHours.toFixed(0)}h
                            </Typography>
                            <Typography variant="subtitle1" color="textSecondary">
                                Heures Planifiées
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper elevation={3} sx={{ p: 3, display: 'flex', alignItems: 'center', height: '100%', borderLeft: '5px solid #0288d1' }}>
                        <GroupIcon sx={{ fontSize: 50, color: '#0288d1', mr: 2 }} />
                        <Box>
                            <Typography variant="h4" fontWeight="bold">
                                {stats.agentsCount}
                            </Typography>
                            <Typography variant="subtitle1" color="textSecondary">
                                Agents Mobilisés
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper elevation={3} sx={{ p: 3, display: 'flex', alignItems: 'center', height: '100%', borderLeft: '5px solid #ed6c02' }}>
                        <BusinessIcon sx={{ fontSize: 50, color: '#ed6c02', mr: 2 }} />
                        <Box>
                            <Typography variant="h4" fontWeight="bold">
                                {stats.sitesCount}
                            </Typography>
                            <Typography variant="subtitle1" color="textSecondary">
                                Sites Actifs/Futurs
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Dashboard;
