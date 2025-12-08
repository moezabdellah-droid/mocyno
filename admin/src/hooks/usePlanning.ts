import { useGetList } from 'react-admin';
import { useMemo } from 'react';
const { data: missions, isLoading: loadingMissions } = useGetList('planning');
const { data: agents, isLoading: loadingAgents } = useGetList('agents');
const { data: sites, isLoading: loadingSites } = useGetList('sites');

const events = useMemo(() => {
    if (!missions || !agents || !sites) return [];

    const calendarEvents: PlanningEvent[] = [];

    (missions as Mission[]).forEach((mission: Mission) => {
        if (!mission.agentAssignments) return;

        const site = (sites as Site[]).find((s: Site) => s.id === mission.siteId);

        mission.agentAssignments.forEach((assignment: AgentAssignment, assignmentIdx: number) => {
            const agent = (agents as Agent[]).find((a: Agent) => a.id === assignment.agentId);

            assignment.vacations.forEach((vacation: Vacation, vacationIdx: number) => {
                const start = moment(`${vacation.date}T${vacation.start}`);
                const end = moment(`${vacation.date}T${vacation.end}`);

                // Handle overnight shifts
                if (end.isBefore(start)) {
                    end.add(1, 'day');
                }

                calendarEvents.push({
                    id: `${mission.id}-${assignmentIdx}-${vacationIdx}`,
                    title: site?.name || 'Site inconnu',
                    start: start.toDate(),
                    end: end.toDate(),
                    agentId: assignment.agentId,
                    agentName: agent ? `${agent.firstName} ${agent.lastName}` : assignment.agentName,
                    missionId: mission.id,
                    siteId: mission.siteId,
                    siteName: site?.name || '',
                    assignmentIdx,
                    vacationIdx,
                    color: agent?.status === 'active' ? '#1976d2' : '#9e9e9e',
                    allDay: false
                });
            });
        });
    });

    return calendarEvents;
}, [missions, agents, sites]);

const schedules = useMemo(() => {
    if (!agents || !events) return [];

    return (agents as Agent[])
        .filter((agent: Agent) => agent.role !== 'admin')
        .map((agent: Agent) => {
            const agentEvents = events.filter((e: PlanningEvent) => e.agentId === agent.id);
            const totalHours = agentEvents.reduce((sum: number, event: PlanningEvent) => {
                const duration = moment(event.end).diff(moment(event.start), 'hours', true);
                return sum + duration;
            }, 0);

            return {
                agent,
                events: agentEvents,
                totalHours
            };
        });
}, [agents, events]);

return {
    events,
    schedules: schedules as AgentSchedule[],
    agents: (agents || []) as Agent[],
    missions: (missions || []) as Mission[],
    sites: (sites || []) as Site[],
    isLoading: loadingMissions || loadingAgents || loadingSites
};
};
