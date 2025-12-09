import { useState, useCallback } from 'react';
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
import { Calendar, Views, momentLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';

const DnDCalendar = withDragAndDrop(Calendar);
import type { AgentAssignment, Vacation } from '../types/models';

const localizer = momentLocalizer(moment);

import moment from 'moment';
// @ts-expect-error - moment locale files don't have TypeScript declarations

// Custom formats for 24h time
const formats = {
    timeGutterFormat: 'HH:mm',
    eventTimeRangeFormat: ({ start, end }: unknown, culture?: string, local?: unknown) =>
        `${local.format(start, 'HH:mm', culture)} - ${local.format(end, 'HH:mm', culture)}`,
    agendaTimeRangeFormat: ({ start, end }: unknown, culture?: string, local?: unknown) =>
        `${local.format(start, 'HH:mm', culture)} - ${local.format(end, 'HH:mm', culture)}`,
    dayHeaderFormat: 'dddd DD MMMM'
};

const Planning = () => {
    const { data: events, isLoading } = useGetList('planning');
    const { data: sites } = useGetList('sites');
    const { data: agents } = useGetList('agents');
    const [create] = useCreate();
    const [update] = useUpdate();
    const notify = useNotify();

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

    // Helper to calculate start and end dates handling cross-day shifts
    const getEventRange = (date: string, startStr: string, endStr: string) => {
        const start = new Date(`${date}T${startStr}`);
        let end = new Date(`${date}T${endStr}`);

        // If end time is earlier than start time, it means it ends the next day
        if (end < start) {
            end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
        }
        return { start, end };
    };

    // Transform missions to calendar events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calendarEvents = (events || []).flatMap((mission: any) => {
        if (!mission.agentAssignments) return [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return mission.agentAssignments.flatMap((assignment: any, assignmentIdx: number) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return assignment.vacations.map((v: any, vacIdx: number) => {
                const { start, end } = getEventRange(v.date, v.start, v.end);
                return {
                    id: `${mission.id}-${assignmentIdx}-${vacIdx}`,
                    missionId: mission.id,
                    start,
                    end,
                    title: `${mission.siteName} - ${assignment.agentName} (${assignment.specialty})`,
                    resource: { mission, assignment, vacation: v }
                };
            });
        });
    });

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

    const handleSelectSlot = useCallback((slotInfo: unknown) => {
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

    const handleEditClick = (mission: unknown) => {
        setEditMode(true);
        setSelectedMissionId(mission.id);
        setMissionData({
            siteId: mission.siteId,
            notes: mission.notes || ''
        });
        const assignmentsCopy = mission.agentAssignments.map((a: unknown) => ({
            ...a,
            vacations: a.vacations.map((v: unknown) => ({ ...v }))
        }));
        setAgentAssignments(assignmentsCopy);
        setOpenDialog(true);
    };

    const handleSelectEvent = (event: unknown) => {
        handleEditClick(event.resource.mission);
    };

    const handleRowClick = (_id: unknown, _resource: unknown, record: unknown): false => {
        handleEditClick(record);
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
            const agent = agents?.find((a: unknown) => a.id === value);
            updated[assignmentIdx] = {
                ...updated[assignmentIdx],
                agentId: value,
                agentName: agent ? `${agent.firstName} ${agent.lastName}` : ''
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
            const site = sites?.find((s: unknown) => s.id === missionData.siteId);
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

                    const hasConflict = events?.some((mission: unknown) => {
                        if (editMode && mission.id === selectedMissionId) return false;

                        if (!mission.agentAssignments) return false;
                        return mission.agentAssignments.some((a: unknown) => {
                            if (a.agentId !== assignment.agentId) return false;
                            return a.vacations.some((v: unknown) => {
                                const { start: eventStart, end: eventEnd } = getEventRange(v.date, v.start, v.end);
                                return (vacationStart < eventEnd && vacationEnd > eventStart);
                            });
                        });
                    });

                    if (hasConflict) {
                        notify(`Conflit détecté pour ${assignment.agentName} le ${vacation.date}`, { type: 'warning' });
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
                    previousData: events?.find((e: unknown) => e.id === selectedMissionId)
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
            notify(`Erreur: ${error.message}`, { type: 'error' });
        }
    };

    const getAgentsForAssignment = (specialty: string | null) => {
        if (!missionData.siteId || !sites || !agents) return [];
        const site = sites.find((s: unknown) => s.id === missionData.siteId);

        let potentialAgents = agents;

        if (site?.requiredSpecialties?.length > 0) {
            potentialAgents = potentialAgents.filter((agent: unknown) =>
                agent.specialties?.some((s: string) => site.requiredSpecialties.includes(s))
            );
        }

        if (specialty) {
            return potentialAgents.filter((agent: unknown) =>
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
        const site = sites.find((s: unknown) => s.id === missionData.siteId);

        if (site?.requiredSpecialties?.length > 0) {
            return allSpecialties.filter(s => site.requiredSpecialties.includes(s.id));
        }

        return allSpecialties;
    };

    if (isLoading) return <Loading />;

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
                        <List actions={false} title=" ">
                            <Datagrid bulkActionButtons={false} rowClick={handleRowClick}>
                                <RaTextField source="siteName" label="Site" />

                                <FunctionField
                                    label="Période"
                                    render={(record: unknown) => {
                                        if (!record.agentAssignments) return '-';
                                        const allVacations = record.agentAssignments.flatMap((a: unknown) => a.vacations);
                                        if (allVacations.length === 0) return '-';

                                        const starts: number[] = [];
                                        const ends: number[] = [];

                                        allVacations.forEach((v: unknown) => {
                                            const { start, end } = getEventRange(v.date, v.start, v.end);
                                            starts.push(start.getTime());
                                            ends.push(end.getTime());
                                        });

                                        const minStart = new Date(Math.min(...starts));
                                        const maxEnd = new Date(Math.max(...ends));

                                        return (
                                            <Box>
                                                <Typography variant="body2" component="div">
                                                    Du {minStart.toLocaleDateString()} {minStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Typography>
                                                <Typography variant="body2" component="div">
                                                    Au {maxEnd.toLocaleDateString()} {maxEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Typography>
                                            </Box>
                                        );
                                    }}
                                />

                                <FunctionField
                                    label="Agents & Heures"
                                    render={(record: unknown) => {
                                        return (
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                {record.agentAssignments?.map((assignment: unknown, idx: number) => {
                                                    const totalMinutes = assignment.vacations.reduce((acc: number, v: unknown) => {
                                                        const { start, end } = getEventRange(v.date, v.start, v.end);
                                                        const duration = (end.getTime() - start.getTime()) / (1000 * 60);
                                                        return acc + duration;
                                                    }, 0);
                                                    const hours = Math.floor(totalMinutes / 60);
                                                    const mins = totalMinutes % 60;
                                                    const timeStr = mins > 0 ? `${hours}h${mins}` : `${hours}h`;

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
                                    render={(record: unknown) => {
                                        if (!record.agentAssignments) return '-';
                                        let totalMinutesMission = 0;

                                        record.agentAssignments.forEach((assignment: unknown) => {
                                            const agentMins = assignment.vacations.reduce((acc: number, v: unknown) => {
                                                const { start, end } = getEventRange(v.date, v.start, v.end);
                                                const duration = (end.getTime() - start.getTime()) / (1000 * 60);
                                                return acc + duration;
                                            }, 0);
                                            totalMinutesMission += agentMins;
                                        });

                                        const hours = Math.floor(totalMinutesMission / 60);
                                        const mins = totalMinutesMission % 60;

                                        return (
                                            <Typography variant="body1" fontWeight="bold">
                                                {mins > 0 ? `${hours}h${mins}` : `${hours}h`}
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
                        {(sites || []).map((site: unknown) => (
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
                                        {getAgentsForAssignment(assignment.specialty).map((agent: unknown) => (
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
