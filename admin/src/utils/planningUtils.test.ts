
import { describe, it, expect } from 'vitest';
import { calculatePayroll } from './planningUtils';
import type { Agent, PlanningEvent } from '../types/models';

const mockAgent: Agent = {
    id: 'agent-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    role: 'agent',
    status: 'active'
};

const createEvent = (start: string, end: string): PlanningEvent => ({
    id: 'evt-1',
    title: 'Mission',
    start: new Date(start),
    end: new Date(end),
    agentId: mockAgent.id,
    agentName: 'John Doe',
    missionId: 'mission-1',
    siteId: 'site-1',
    siteName: 'Site A',
    assignmentIdx: 0,
    vacationIdx: 0
});

describe('planningUtils', () => {
    it('should calculate standard hours correctly', () => {
        const events = [
            createEvent('2025-12-08T08:00:00', '2025-12-08T12:00:00') // 4 hours
        ];

        const stats = calculatePayroll(mockAgent, events, new Date('2025-12-08'));

        expect(stats.totalPlanned).toBeCloseTo(4);
        expect(stats.nightHours).toBeCloseTo(0);
    });

    it('should calculate night hours (21h-06h)', () => {
        const events = [
            createEvent('2025-12-08T20:00:00', '2025-12-09T06:00:00') // 10h total, 9h night (21h-06h)
        ];

        const stats = calculatePayroll(mockAgent, events, new Date('2025-12-08'));

        expect(stats.totalPlanned).toBeCloseTo(10);
        expect(stats.nightHours).toBeCloseTo(9);
    });

    it('should calculate sunday hours', () => {
        const sunday = '2025-12-07'; // Sunday
        const events = [
            createEvent(`${sunday}T08:00:00`, `${sunday}T18:00:00`) // 10h on Sunday
        ];

        const stats = calculatePayroll(mockAgent, events, new Date(sunday));

        expect(stats.sundayHours).toBeCloseTo(10);
    });

    it('should handle holiday hours', () => {
        const holiday = '2025-12-25'; // Christmas
        const events = [
            createEvent(`${holiday}T08:00:00`, `${holiday}T12:00:00`) // 4h on Holiday
        ];

        const stats = calculatePayroll(mockAgent, events, new Date(holiday));

        expect(stats.holidayHours).toBeCloseTo(4);
    });

    it('should accumulate total done hours', () => {
        const events = [
            createEvent('2025-12-01T08:00:00', '2025-12-01T12:00:00'), // 4h done (past)
            createEvent('2025-12-30T08:00:00', '2025-12-30T12:00:00')  // 4h future
        ];

        // Testing as if today is Dec 15th
        const today = new Date('2025-12-15');
        const stats = calculatePayroll(mockAgent, events, today);

        expect(stats.totalDone).toBeCloseTo(4);
        expect(stats.futureHours).toBeCloseTo(4);
    });
});
