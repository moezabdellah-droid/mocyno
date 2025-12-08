import moment from 'moment';
import type { Mission } from '../types/models';

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

export const calculateMissionStats = (missions: Mission[], now: moment.Moment = moment()) => {
    let totalHours = 0;
    let doneHours = 0;
    let futureHours = 0;
    const agentsSet = new Set<string>();
    const sitesSet = new Set<string>();

    missions.forEach((mission) => {
        if (!mission.agentAssignments) return;

        let isMissionActive = false;

        mission.agentAssignments.forEach((assignment) => {
            assignment.vacations.forEach((vacation) => {
                const start = moment(`${vacation.date}T${vacation.start}`);
                const end = moment(`${vacation.date}T${vacation.end}`);

                if (end.isBefore(start)) end.add(1, 'day');

                const stats = calculateVacationStats(start, end);
                const duration = stats.total;

                if (end.isAfter(now)) {
                    futureHours += duration;
                    agentsSet.add(assignment.agentId);
                    isMissionActive = true;
                } else {
                    doneHours += duration;
                }
                totalHours += duration;
            });
        });

        if (isMissionActive) {
            sitesSet.add(mission.siteId);
        }
    });
    let holidayHours = 0;
    let futureHours = 0;

    events.forEach(event => {
        if (event.agentId !== agent.id) return;

        const start = moment(event.start);
        const end = moment(event.end);

        // Stats for this specific event
        const stats = calculateVacationStats(start, end);

        totalPlanned += stats.total;
        nightHours += stats.night;
        sundayHours += stats.sunday;
        holidayHours += stats.holiday;

        // Done vs Future
        if (end.isAfter(now)) {
            futureHours += stats.total;
            // Partial done could be calculated here if needed, but for now strict separation
        } else {
            totalDone += stats.total;
        }
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
