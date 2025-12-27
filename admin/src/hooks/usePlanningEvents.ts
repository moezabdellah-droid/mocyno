import { useMemo } from 'react';
import type { Mission, PlanningEvent, AgentAssignment, Vacation } from '../types/models';
import { getEventRange } from '../utils/planningDurations';

interface UsePlanningEventsResult {
    events: PlanningEvent[];
}

export const usePlanningEvents = (missions: Mission[] | undefined): UsePlanningEventsResult => {
    const events = useMemo(() => {
        if (!missions) return [];

        return missions.flatMap((mission: Mission) => {
            if (!mission.agentAssignments) return [];

            return mission.agentAssignments.flatMap((assignment: AgentAssignment, assignmentIdx: number) => {
                return assignment.vacations.map((v: Vacation, vacIdx: number) => {
                    const { start, end } = getEventRange(v.date, v.start, v.end);

                    const event: PlanningEvent = {
                        id: `${mission.id}-${assignmentIdx}-${vacIdx}`,
                        missionId: mission.id,
                        start,
                        end,
                        agentId: assignment.agentId,
                        agentName: assignment.agentName || 'Inconnu',
                        siteId: mission.siteId,
                        siteName: mission.siteName || 'Site Inconnu',
                        assignmentIdx,
                        vacationIdx: vacIdx,
                        title: `${mission.siteName} - ${assignment.agentName} (${assignment.specialty})`,
                        resource: { mission, assignment, vacation: v }
                    };
                    return event;
                });
            });
        });
    }, [missions]);

    return { events };
};
