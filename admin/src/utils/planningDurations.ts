import type { Mission, AgentAssignment, Vacation } from '../types/models';

/**
 * Helper to calculate start and end dates handling cross-day shifts
 * @param date Date string YYYY-MM-DD
 * @param startStr Time string HH:mm
 * @param endStr Time string HH:mm
 */
export const getEventRange = (date: string, startStr: string, endStr: string): { start: Date; end: Date } => {
    const start = new Date(`${date}T${startStr}`);
    let end = new Date(`${date}T${endStr}`);

    // If end time is earlier than start time, it means it ends the next day
    if (end < start) {
        end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }
    return { start, end };
};

/**
 * Calculates the global period (min start, max end) of a mission based on all its vacations.
 */
export const calculateMissionPeriod = (mission: Mission): { start: Date | null; end: Date | null } => {
    if (!mission.agentAssignments || mission.agentAssignments.length === 0) {
        return { start: null, end: null };
    }

    const allVacations = mission.agentAssignments.flatMap((a: AgentAssignment) => a.vacations);
    if (allVacations.length === 0) {
        return { start: null, end: null };
    }

    const starts: number[] = [];
    const ends: number[] = [];

    allVacations.forEach((v: Vacation) => {
        const { start, end } = getEventRange(v.date, v.start, v.end);
        starts.push(start.getTime());
        ends.push(end.getTime());
    });

    return {
        start: new Date(Math.min(...starts)),
        end: new Date(Math.max(...ends))
    };
};

interface Duration {
    hours: number;
    minutes: number;
}

/**
 * Calculates total duration in hours and minutes for a specific agent in a mission.
 */
export const calculateAgentDurationInMission = (mission: Mission, agentId: string): Duration => {
    if (!mission.agentAssignments) return { hours: 0, minutes: 0 };

    const assignment = mission.agentAssignments.find(a => a.agentId === agentId);
    if (!assignment) return { hours: 0, minutes: 0 };

    const totalMinutes = assignment.vacations.reduce((acc: number, v: Vacation) => {
        const { start, end } = getEventRange(v.date, v.start, v.end);
        // Duration in minutes
        const duration = (end.getTime() - start.getTime()) / (1000 * 60);
        return acc + duration;
    }, 0);

    return {
        hours: Math.floor(totalMinutes / 60),
        minutes: totalMinutes % 60
    };
};

/**
 * Calculates the total duration of a mission (sum of all agents' vacations) in hours and minutes.
 */
export const calculateMissionDuration = (mission: Mission): Duration => {
    if (!mission.agentAssignments) return { hours: 0, minutes: 0 };

    let totalMinutesMission = 0;

    mission.agentAssignments.forEach((assignment: AgentAssignment) => {
        const agentMins = assignment.vacations.reduce((acc: number, v: Vacation) => {
            const { start, end } = getEventRange(v.date, v.start, v.end);
            const duration = (end.getTime() - start.getTime()) / (1000 * 60);
            return acc + duration;
        }, 0);
        totalMinutesMission += agentMins;
    });

    return {
        hours: Math.floor(totalMinutesMission / 60),
        minutes: totalMinutesMission % 60
    };
};
