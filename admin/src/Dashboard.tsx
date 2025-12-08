import { useMemo } from 'react';
import { Card, CardContent, CardHeader, Grid as Grid2, Typography, Box, CircularProgress, Paper } from '@mui/material';
import { useGetList, Title } from 'react-admin';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GroupIcon from '@mui/icons-material/Group';
import BusinessIcon from '@mui/icons-material/Business';
import moment from 'moment';
// @ts-expect-error - moment locale files don't have TypeScript declarations
import 'moment/dist/locale/fr';
import { calculateMissionStats } from './utils/planningUtils';
import { Mission } from '@mocyno/types';

moment.locale('fr');

const Dashboard = () => {
    const { data: planning, isLoading } = useGetList('planning');

    const stats = useMemo(() => {
        if (!planning) return { doneHours: 0, futureHours: 0, agentsCount: 0, sitesCount: 0 };
        return calculateMissionStats(planning as Mission[]);
    }, [planning]);

    if (isLoading) {
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

            <Grid2 container spacing={3}>
                <Grid2 xs={12} sm={6} md={3}>
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
                </Grid2>

                <Grid2 xs={12} sm={6} md={3}>
                    <Paper elevation={3} sx={{ p: 3, display: 'flex', alignItems: 'center', height: '100%', borderLeft: '5px solid #1976d2' }}>
                        <AccessTimeIcon sx={{ fontSize: 50, color: '#1976d2', mr: 2 }} />
                        <Box>
                            <Typography variant="h4" fontWeight="bold">
                                {stats.futureHours.toFixed(0)}h
                            </Typography>
                            <Typography variant="subtitle1" color="textSecondary">
                                Heures Planifiées (Futur)
                            </Typography>
                        </Box>
                    </Paper>
                </Grid2>

                <Grid2 xs={12} sm={6} md={3}>
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
                </Grid2>

                <Grid2 xs={12} sm={6} md={3}>
                    <Paper elevation={3} sx={{ p: 3, display: 'flex', alignItems: 'center', height: '100%', borderLeft: '5px solid #ed6c02' }}>
                        <BusinessIcon sx={{ fontSize: 50, color: '#ed6c02', mr: 2 }} />
                        <Box>
                            <Typography variant="h4" fontWeight="bold">
                                {stats.sitesCount}
                            </Typography>
                            <Typography variant="subtitle1" color="textSecondary">
                                Sites Programmés
                            </Typography>
                        </Box>
                    </Paper>
                </Grid2>
            </Grid2>
        </Box>
    );
};

export default Dashboard;
