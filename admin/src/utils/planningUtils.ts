import moment from 'moment';
import type { Mission, PlanningEvent, Agent } from '../types/models';

export const calculateDuration = (start: moment.Moment, end: moment.Moment) => {
    return moment.duration(end.diff(start)).asHours();
};

export const getNightHours = (start: moment.Moment, end: moment.Moment) => {
    let hours = 0;
    const current = start.clone();

    // Iterate by minute for precision
    // Night is 21:00 to 06:00
    while (current.isBefore(end)) {
        const h = current.hour();
        if (h >= 21 || h < 6) {
            hours += 1 / 60;
        }
        current.add(1, 'minute');
    }
    return hours;
};

export const isPublicHoliday = (date: moment.Moment) => {
    const year = date.year();
    const formatted = date.format('YYYY-MM-DD');
    const holidays = [
        `${year}-01-01`, // Jour de l'an
        `${year}-05-01`, // Fête du travail
        `${year}-05-08`, // Victoire 1945
        `${year}-07-14`, // Fête nationale
        `${year}-08-15`, // Assomption
        `${year}-11-01`, // Toussaint
        `${year}-11-11`, // Armistice
        `${year}-12-25`, // Noël
    ];
    return holidays.includes(formatted);
};

export const calculateVacationStats = (start: moment.Moment, end: moment.Moment) => {
    let total = 0;
    let night = 0;
    let sunday = 0;
    let holiday = 0;

    const current = start.clone();

    // Iterate by minute for precision
    while (current.isBefore(end)) {
        total += 1 / 60;

        const h = current.hour();
        // Night: 21h - 06h
        if (h >= 21 || h < 6) {
            night += 1 / 60;
        }

        // Sunday
        if (current.day() === 0) {
            sunday += 1 / 60;
        }

        // Holiday
        if (isPublicHoliday(current)) {
            holiday += 1 / 60;
        }

        current.add(1, 'minute');
    }

    return { total, night, sunday, holiday };
};

export const calculateMissionStats = (missions: Mission[], events: PlanningEvent[] = [], agent: Agent, now: moment.Moment = moment()) => {
    let totalPlanned = 0;
    let totalDone = 0;
    let futureHours = 0;
    let nightHours = 0;
    let sundayHours = 0;
    let holidayHours = 0;

    // Helper to add stats from a duration
    const addStats = (start: moment.Moment, end: moment.Moment) => {
        const stats = calculateVacationStats(start, end);

        totalPlanned += stats.total;
        nightHours += stats.night;
        sundayHours += stats.sunday;
        holidayHours += stats.holiday;

        if (end.isAfter(now)) {
            futureHours += stats.total;
        } else {
            totalDone += stats.total;
        }
    };

    // 1. Process Missions
    missions.forEach((mission) => {
        if (!mission.agentAssignments) return;

        mission.agentAssignments.forEach((assignment) => {
            if (assignment.agentId !== agent.id) return;

            assignment.vacations.forEach((vacation) => {
                const start = moment(`${vacation.date}T${vacation.start}`);
                const end = moment(`${vacation.date}T${vacation.end}`);
                if (end.isBefore(start)) end.add(1, 'day');

                addStats(start, end);
            });
        });
    });

    // 2. Process Calendar Events
    events.forEach(event => {
        if (event.agentId !== agent.id) return;

        const start = moment(event.start);
        const end = moment(event.end);

        addStats(start, end);
    });

    return {
        agent,
        totalPlanned,
        totalDone,
        nightHours,
        sundayHours,
        holidayHours,
        futureHours
    };
};

export const calculatePayroll = (agent: Agent, events: PlanningEvent[], date: Date) => {
    return calculateMissionStats([], events, agent, moment(date));
};
