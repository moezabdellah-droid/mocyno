import { useMemo, useState, useEffect } from 'react';
import {
    useGetList, useCreate, useUpdate, useNotify, Loading,
    List, Datagrid, TextField as RaTextField, FunctionField, DeleteButton, Title
} from 'react-admin';
import {
    Card, CardHeader, CardContent, Button, Box, Tabs, Tab,
    Typography, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem, IconButton
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { Calendar, Views, momentLocalizer, type DateLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import moment from 'moment';
import 'moment/locale/fr';

moment.locale('fr');
import type { AgentAssignment, Vacation, Mission, Site, Agent, CalendarSlotInfo, PlanningEvent } from '../types/models';
import {
    usePlanningEvents,
} from '../hooks/usePlanningEvents';
import {
    getEventRange,
    calculateMissionPeriod,
    calculateAgentDurationInMission,
    calculateMissionDuration
} from '../utils/planningDurations';

const DnDCalendar = withDragAndDrop<PlanningEvent>(Calendar);
const localizer = momentLocalizer(moment);

// Custom formats for 24h time
const formats = {
    timeGutterFormat: 'HH:mm',
    eventTimeRangeFormat: ({ start, end }: { start: Date, end: Date }, culture?: string, local?: DateLocalizer) =>
        `${local?.format(start, 'HH:mm', culture)} - ${local?.format(end, 'HH:mm', culture)} `,
    agendaTimeRangeFormat: ({ start, end }: { start: Date, end: Date }, culture?: string, local?: DateLocalizer) =>
        `${local?.format(start, 'HH:mm', culture)} - ${local?.format(end, 'HH:mm', culture)} `,
    dayHeaderFormat: 'dddd DD MMMM'
};

const Planning = () => {
    const { data: events, isLoading: isLoadingEvents } = useGetList<Mission>('planning', { pagination: { page: 1, perPage: 1000 } });
    const { data: sites } = useGetList<Site>('sites', { pagination: { page: 1, perPage: 1000 } });
    const { data: agents } = useGetList<Agent>('agents', { pagination: { page: 1, perPage: 1000 } });

    console.log('DEBUG: Planning Events Raw:', events);
    console.log('DEBUG: Agents List:', agents);

    const [create] = useCreate();
    const [update] = useUpdate();
    const notify = useNotify();

    // ERROR FLAGGING: useGetList seems to fail with React 19 in production.
    // FALLBACK: Manual fetch via dataProvider.
    const [manualEvents, setManualEvents] = useState<Mission[]>([]);
    const [manualAgents, setManualAgents] = useState<Agent[]>([]);

    useEffect(() => {
        // Direct fetch debug & fallback
        const fetchData = async () => {
            console.log('DEBUG: Starting Manual Fetch...');
            try {
                // Fetch Planning
                import('../providers/dataProvider').then(async ({ default: dp }) => {
                    const planningResult = await dp.getList('planning', { pagination: { page: 1, perPage: 1000 }, sort: { field: 'createdAt', order: 'DESC' }, filter: {} });
                    console.log('DEBUG: Manual Fetch Planning Result:', planningResult);
                    if (planningResult.data && planningResult.data.length > 0) {
                        setManualEvents(planningResult.data as Mission[]);
                    }

                    // Fetch Agents
                    const agentsResult = await dp.getList('agents', { pagination: { page: 1, perPage: 1000 }, sort: { field: 'lastName', order: 'ASC' }, filter: {} });
                    console.log('DEBUG: Manual Fetch Agents Result:', agentsResult);
                    if (agentsResult.data && agentsResult.data.length > 0) {
                        setManualAgents(agentsResult.data as Agent[]);
                    }
                });
            } catch (e) {
                console.error('DEBUG: Manual Fetch Error', e);
            }
        };
        fetchData();
    }, []);

    // Use Manual data if Hook data is empty (Fallback strategy)
    const effectiveEvents = events && events.length > 0 ? events : manualEvents;
    const effectiveAgents = agents && agents.length > 0 ? agents : manualAgents;

    const { events: calendarEvents } = usePlanningEvents(effectiveEvents);
    console.log('DEBUG: Calendar Events Formatted:', calendarEvents);

    // Dialog State
    const [openDialog, setOpenDialog] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);

    // Form Data
    const [missionData, setMissionData] = useState({
        siteId: '',
        notes: ''
    });
    const [agentAssignments, setAgentAssignments] = useState<AgentAssignment[]>([{
        agentId: '',
        agentName: '',
        specialty: '',
        vacations: [{
            date: moment().format('YYYY-MM-DD'),
            start: '08:00',
            end: '16:00'
        }]
    }]);

    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const onEventResize = useCallback(
        () => {
            notify('Modification via drag non implémentée pour le nouveau modèle', { type: 'info' });
        },
        [notify]
    );

    const onEventDrop = useCallback(
        () => {
            notify('Modification via drag non implémentée pour le nouveau modèle', { type: 'info' });
        },
        [notify]
    );

    const resetForm = () => {
        setMissionData({
            siteId: '',
            notes: ''
        });
        setAgentAssignments([{
            agentId: '',
            agentName: '',
            specialty: '',
            vacations: [{
                date: moment().format('YYYY-MM-DD'),
                start: '08:00',
                end: '16:00'
            }]
        }]);
        setEditMode(false);
        setSelectedMissionId(null);
    };

    const handleSelectSlot = useCallback((slotInfo: CalendarSlotInfo) => {
        resetForm();
        setAgentAssignments([{
            agentId: '',
            agentName: '',
            specialty: '',
            vacations: [{
                date: moment(slotInfo.start).format('YYYY-MM-DD'),
                start: moment(slotInfo.start).format('HH:mm'),
                end: moment(slotInfo.end).format('HH:mm')
            }]
        }]);
        setOpenDialog(true);
    }, []);

    const handleEditClick = (mission: Mission) => {
        setEditMode(true);
        setSelectedMissionId(mission.id);
        setMissionData({
            siteId: mission.siteId,
            notes: mission.notes || ''
        });
        const assignmentsCopy = mission.agentAssignments.map((a: AgentAssignment) => ({
            ...a,
            vacations: a.vacations.map((v: Vacation) => ({ ...v }))
        }));
        setAgentAssignments(assignmentsCopy);
        setOpenDialog(true);
    };

    const handleSelectEvent = (event: PlanningEvent) => {
        if (event && event.resource && event.resource.mission) {
            handleEditClick(event.resource.mission);
        }
    };

    const handleRowClick = (_id: unknown, _resource: unknown, record: unknown): false => {
        handleEditClick(record as Mission);
        return false;
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        resetForm();
    };

    const handleAddAgent = () => {
        const lastAssignment = agentAssignments[agentAssignments.length - 1];
        setAgentAssignments([...agentAssignments, {
            agentId: '',
            agentName: '',
            specialty: '',
            vacations: lastAssignment.vacations.map(v => ({ ...v }))
        }]);
    };

    const handleRemoveAgent = (index: number) => {
        if (agentAssignments.length > 1) {
            setAgentAssignments(agentAssignments.filter((_, i) => i !== index));
        }
    };

    const handleAgentChange = (assignmentIdx: number, field: string, value: string) => {
        const updated = [...agentAssignments];
        if (field === 'agentId') {
            const agent = agents?.find((a: Agent) => a.id === value);
            updated[assignmentIdx] = {
                ...updated[assignmentIdx],
                agentId: value,
                agentName: agent ? `${agent.firstName} ${agent.lastName} ` : ''
            };
        } else {
            updated[assignmentIdx] = { ...updated[assignmentIdx], [field]: value };
        }
        setAgentAssignments(updated);
    };

    const handleAddVacation = (assignmentIdx: number) => {
        const updated = [...agentAssignments];
        const lastVacation = updated[assignmentIdx].vacations[updated[assignmentIdx].vacations.length - 1];
        const nextDate = moment(lastVacation.date).add(1, 'day').format('YYYY-MM-DD');
        updated[assignmentIdx].vacations.push({
            date: nextDate,
            start: lastVacation.start,
            end: lastVacation.end
        });
        setAgentAssignments(updated);
    };

    const handleRemoveVacation = (assignmentIdx: number, vacationIdx: number) => {
        const updated = [...agentAssignments];
        if (updated[assignmentIdx].vacations.length > 1) {
            updated[assignmentIdx].vacations = updated[assignmentIdx].vacations.filter((_, i) => i !== vacationIdx);
            setAgentAssignments(updated);
        }
    };

    const handleVacationChange = (assignmentIdx: number, vacationIdx: number, field: keyof Vacation, value: string) => {
        const updated = [...agentAssignments];
        updated[assignmentIdx].vacations[vacationIdx] = {
            ...updated[assignmentIdx].vacations[vacationIdx],
            [field]: value
        };
        setAgentAssignments(updated);
    };

    const handleSaveMission = async () => {
        try {
            const site = sites?.find((s: Site) => s.id === missionData.siteId);
            if (!site) {
                notify('Site introuvable', { type: 'error' });
                return;
            }

            for (const assignment of agentAssignments) {
                if (!assignment.agentId || !assignment.specialty) {
                    notify('Tous les agents doivent être sélectionnés avec une spécialité', { type: 'error' });
                    return;
                }
            }

            for (const assignment of agentAssignments) {
                for (const vacation of assignment.vacations) {
                    const { start: vacationStart, end: vacationEnd } = getEventRange(vacation.date, vacation.start, vacation.end);

                    const hasConflict = events?.some((mission: Mission) => {
                        if (editMode && mission.id === selectedMissionId) return false;

                        if (!mission.agentAssignments) return false;
                        return mission.agentAssignments.some((a: AgentAssignment) => {
                            if (a.agentId !== assignment.agentId) return false;
                            return a.vacations.some((v: Vacation) => {
                                const { start: eventStart, end: eventEnd } = getEventRange(v.date, v.start, v.end);
                                return (vacationStart < eventEnd && vacationEnd > eventStart);
                            });
                        });
                    });

                    if (hasConflict) {
                        notify(`Conflit détecté pour ${assignment.agentName} le ${vacation.date} `, { type: 'warning' });
                        return;
                    }
                }
            }

            const payloadData = {
                siteId: missionData.siteId,
                siteName: site.name,
                agentAssignments: agentAssignments,
                assignedAgentIds: agentAssignments.map(a => a.agentId),
                notes: missionData.notes || '',
                updatedAt: new Date()
            };

            if (editMode && selectedMissionId) {
                await update('planning', {
                    id: selectedMissionId,
                    data: payloadData,
                    previousData: events?.find((e: Mission) => e.id === selectedMissionId)
                });
                notify('Mission mise à jour avec succès !');
            } else {
                await create('planning', {
                    data: {
                        ...payloadData,
                        status: 'scheduled',
                        createdAt: new Date()
                    }
                });
                notify('Mission créée avec succès !');
            }

            handleCloseDialog();
        } catch (error: unknown) {
            notify(`Erreur: ${(error as Error).message} `, { type: 'error' });
        }
    };

    const getAgentsForAssignment = (specialty: string | null) => {
        if (!missionData.siteId || !sites || !agents) return [];
        const site = sites.find((s: Site) => s.id === missionData.siteId);

        let potentialAgents = agents;

        if (site && site.requiredSpecialties && site.requiredSpecialties.length > 0) {
            potentialAgents = potentialAgents.filter((agent: Agent) =>
                agent.specialties?.some((s: string) => site.requiredSpecialties!.includes(s))
            );
        }

        if (specialty) {
            return potentialAgents.filter((agent: Agent) =>
                agent.specialties?.includes(specialty)
            );
        }

        return potentialAgents;
    };

    const getApplicableSpecialties = () => {
        const allSpecialties = [
            { id: 'ADS', name: 'Agent de Sécurité (ADS)' },
            { id: 'SSIAP1', name: 'SSIAP 1' },
            { id: 'SSIAP2', name: 'SSIAP 2' },
            { id: 'CYNO', name: 'Agent Cynophile' },
            { id: 'RONDIER', name: 'Rondier' },
            { id: 'VIDEO', name: 'Opérateur Vidéo' },
        ];

        if (!missionData.siteId || !sites) return allSpecialties;
        const site = sites.find((s: Site) => s.id === missionData.siteId);

        if (site && site.requiredSpecialties && site.requiredSpecialties.length > 0) {
            return allSpecialties.filter(s => site.requiredSpecialties!.includes(s.id));
        }

        return allSpecialties;
    };

    if (isLoadingEvents) return <Loading />;

    return (
        <Card>
            <Title title="Planning Mo'Cyno" />
            <CardHeader
                title="Gestion des Missions"
                action={
                    <Button variant="contained" color="primary" onClick={() => { resetForm(); setOpenDialog(true); }}>
                        Créer une Mission
                    </Button>
                }
            />
            <CardContent>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                    <Tabs value={tabValue} onChange={handleTabChange} aria-label="planning views">
                        <Tab label="Vue Calendrier" />
                        <Tab label="Liste des Missions" />
                    </Tabs>
                </Box>

                <div role="tabpanel" hidden={tabValue !== 0}>
                    {tabValue === 0 && (
                        <div style={{ height: '80vh' }}>
                            <DnDCalendar
                                defaultView={Views.WEEK}
                                events={calendarEvents}
                                localizer={localizer}
                                formats={formats}
                                onEventDrop={onEventDrop}
                                onEventResize={onEventResize}
                                onSelectSlot={handleSelectSlot}
                                onSelectEvent={handleSelectEvent}
                                selectable
                                resizable
                                style={{ height: '100%' }}
                                messages={{
                                    next: "Suivant",
                                    previous: "Précédent",
                                    today: "Aujourd'hui",
                                    month: "Mois",
                                    week: "Semaine",
                                    day: "Jour"
                                }}
                            />
                        </div>
                    )}
                </div>

                <div role="tabpanel" hidden={tabValue !== 1}>
                    {tabValue === 1 && (
                        <List resource="planning" actions={false} title=" ">
                            <Datagrid bulkActionButtons={false} rowClick={handleRowClick}>
                                <RaTextField source="siteName" label="Site" />

                                <FunctionField
                                    label="Période"
                                    render={(record: Mission) => {
                                        const { start, end } = calculateMissionPeriod(record);
                                        if (!start || !end) return '-';

                                        return (
                                            <Box>
                                                <Typography variant="body2" component="div">
                                                    Du {start.toLocaleDateString()} {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Typography>
                                                <Typography variant="body2" component="div">
                                                    Au {end.toLocaleDateString()} {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Typography>
                                            </Box>
                                        );
                                    }}
                                />

                                <FunctionField
                                    label="Agents & Heures"
                                    render={(record: Mission) => {
                                        return (
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                {record.agentAssignments?.map((assignment: AgentAssignment, idx: number) => {
                                                    const { hours, minutes } = calculateAgentDurationInMission(record, assignment.agentId);
                                                    const timeStr = minutes > 0 ? `${hours}h${minutes} ` : `${hours} h`;

                                                    return (
                                                        <Typography key={idx} variant="body2" noWrap>
                                                            • <strong>{assignment.agentName}</strong>: {timeStr}
                                                        </Typography>
                                                    );
                                                })}
                                            </Box>
                                        );
                                    }}
                                />

                                <FunctionField
                                    label="Total Mission"
                                    render={(record: Mission) => {
                                        const { hours, minutes } = calculateMissionDuration(record);

                                        return (
                                            <Typography variant="body1" fontWeight="bold">
                                                {minutes > 0 ? `${hours}h${minutes} ` : `${hours} h`}
                                            </Typography>
                                        );
                                    }}
                                />

                                <RaTextField source="notes" label="Notes" />
                                <DeleteButton />
                            </Datagrid>
                        </List>
                    )}
                </div>

            </CardContent>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
                <DialogTitle>{editMode ? 'Modifier la Mission' : 'Créer une Mission Multi-Agents'}</DialogTitle>
                <DialogContent>
                    <TextField
                        select
                        label="Site"
                        value={missionData.siteId}
                        onChange={(e) => {
                            setMissionData({ ...missionData, siteId: e.target.value });
                            if (!editMode) {
                                setAgentAssignments([{
                                    agentId: '',
                                    agentName: '',
                                    specialty: '',
                                    vacations: [{
                                        date: moment().format('YYYY-MM-DD'),
                                        start: '08:00',
                                        end: '16:00'
                                    }]
                                }]);
                            }
                        }}
                        fullWidth
                        margin="normal"
                        required
                    >
                        {(sites || []).map((site: Site) => (
                            <MenuItem key={site.id} value={site.id}>
                                {site.name}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Box sx={{ mt: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Agents Affectés
                            <IconButton color="primary" onClick={handleAddAgent} size="small" sx={{ ml: 1 }}>
                                <PersonAddIcon />
                            </IconButton>
                        </Typography>

                        {agentAssignments.map((assignment, assignmentIdx) => (
                            <Box key={assignmentIdx} sx={{ mb: 3, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="subtitle1">Agent {assignmentIdx + 1}</Typography>
                                    {agentAssignments.length > 1 && (
                                        <IconButton color="error" onClick={() => handleRemoveAgent(assignmentIdx)} size="small">
                                            <DeleteIcon />
                                        </IconButton>
                                    )}
                                </Box>

                                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                    <TextField
                                        select
                                        label="Spécialité"
                                        value={assignment.specialty}
                                        onChange={(e) => handleAgentChange(assignmentIdx, 'specialty', e.target.value)}
                                        fullWidth
                                        required
                                        disabled={!missionData.siteId}
                                    >
                                        {getApplicableSpecialties().map(s => (
                                            <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                                        ))}
                                    </TextField>

                                    <TextField
                                        select
                                        label="Agent"
                                        value={assignment.agentId}
                                        onChange={(e) => handleAgentChange(assignmentIdx, 'agentId', e.target.value)}
                                        fullWidth
                                        required
                                        disabled={!missionData.siteId}
                                    >
                                        {getAgentsForAssignment(assignment.specialty).map((agent: Agent) => (
                                            <MenuItem key={agent.id} value={agent.id}>
                                                {agent.firstName} {agent.lastName} ({agent.specialties?.join(', ') || 'N/A'})
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Box>

                                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                                    Vacations
                                    <IconButton color="primary" onClick={() => handleAddVacation(assignmentIdx)} size="small">
                                        <AddIcon />
                                    </IconButton>
                                </Typography>

                                {assignment.vacations.map((vacation, vacationIdx) => (
                                    <Box key={vacationIdx} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                                        <TextField
                                            label="Date"
                                            type="date"
                                            value={vacation.date}
                                            onChange={(e) => handleVacationChange(assignmentIdx, vacationIdx, 'date', e.target.value)}
                                            InputLabelProps={{ shrink: true }}
                                            size="small"
                                            required
                                        />
                                        <TextField
                                            label="Début"
                                            type="time"
                                            value={vacation.start}
                                            onChange={(e) => handleVacationChange(assignmentIdx, vacationIdx, 'start', e.target.value)}
                                            InputLabelProps={{ shrink: true }}
                                            size="small"
                                            required
                                        />
                                        <TextField
                                            label="Fin"
                                            type="time"
                                            value={vacation.end}
                                            onChange={(e) => handleVacationChange(assignmentIdx, vacationIdx, 'end', e.target.value)}
                                            InputLabelProps={{ shrink: true }}
                                            size="small"
                                            required
                                        />
                                        {assignment.vacations.length > 1 && (
                                            <IconButton
                                                color="error"
                                                onClick={() => handleRemoveVacation(assignmentIdx, vacationIdx)}
                                                size="small"
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        )}
                                    </Box>
                                ))}
                            </Box>
                        ))}
                    </Box>

                    <TextField
                        label="Notes / Instructions Générales"
                        value={missionData.notes}
                        onChange={(e) => setMissionData({ ...missionData, notes: e.target.value })}
                        fullWidth
                        margin="normal"
                        multiline
                        rows={3}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Annuler</Button>
                    <Button onClick={handleSaveMission} variant="contained" color="primary">
                        {editMode ? 'Mettre à jour' : 'Créer Mission'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Card>
    );
};

export default Planning;
