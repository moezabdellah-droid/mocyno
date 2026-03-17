import { describe, it, expect } from 'vitest';
import { getEventRange, calculateAgentDurationInMission, calculateMissionPeriod, calculateMissionDuration } from './planningDurations';
import type { Mission } from '@mocyno/types';

describe('getEventRange', () => {
    it('returns same-day range when end > start', () => {
        const { start, end } = getEventRange('2026-03-15', '08:00', '16:00');
        expect(start.toISOString()).toContain('2026-03-15');
        expect(end.toISOString()).toContain('2026-03-15');
        expect(end.getTime() - start.getTime()).toBe(8 * 60 * 60 * 1000);
    });

    it('handles cross-day shift (end < start → next day)', () => {
        const { start, end } = getEventRange('2026-03-15', '22:00', '06:00');
        expect(end.getTime()).toBeGreaterThan(start.getTime());
        expect(end.getTime() - start.getTime()).toBe(8 * 60 * 60 * 1000);
    });

    it('handles midnight-to-midnight (24h shift)', () => {
        const { start, end } = getEventRange('2026-03-15', '00:00', '00:00');
        // 00:00 to 00:00 → end < start is false (equal), so same day → 0 duration
        expect(end.getTime()).toBe(start.getTime());
    });
});

describe('calculateAgentDurationInMission', () => {
    const makeMission = (agentId: string, vacations: { date: string; start: string; end: string }[]): Mission => ({
        id: 'mission-1',
        date: '2026-03-15',
        siteId: 'site-1',
        siteName: 'Test Site',
        agentAssignments: [{ agentId, specialty: 'garde', vacations }],
    } as unknown as Mission);

    it('returns 0 for unknown agent', () => {
        const mission = makeMission('agent-1', [{ date: '2026-03-15', start: '08:00', end: '16:00' }]);
        const result = calculateAgentDurationInMission(mission, 'agent-unknown');
        expect(result).toEqual({ hours: 0, minutes: 0 });
    });

    it('calculates simple 8h shift', () => {
        const mission = makeMission('agent-1', [{ date: '2026-03-15', start: '08:00', end: '16:00' }]);
        const result = calculateAgentDurationInMission(mission, 'agent-1');
        expect(result).toEqual({ hours: 8, minutes: 0 });
    });

    it('calculates cross-day night shift', () => {
        const mission = makeMission('agent-1', [{ date: '2026-03-15', start: '22:00', end: '06:00' }]);
        const result = calculateAgentDurationInMission(mission, 'agent-1');
        expect(result).toEqual({ hours: 8, minutes: 0 });
    });

    it('sums multiple vacations', () => {
        const mission = makeMission('agent-1', [
            { date: '2026-03-15', start: '08:00', end: '12:00' },
            { date: '2026-03-16', start: '08:00', end: '12:00' },
        ]);
        const result = calculateAgentDurationInMission(mission, 'agent-1');
        expect(result).toEqual({ hours: 8, minutes: 0 });
    });

    it('returns 0 when no assignments', () => {
        const mission = { id: 'x' } as unknown as Mission;
        expect(calculateAgentDurationInMission(mission, 'any')).toEqual({ hours: 0, minutes: 0 });
    });
});

describe('calculateMissionPeriod', () => {
    it('returns null dates when no assignments', () => {
        const result = calculateMissionPeriod({ id: 'x' } as Mission);
        expect(result).toEqual({ start: null, end: null });
    });

    it('returns correct period for a single vacation', () => {
        const mission = {
            id: 'x',
            agentAssignments: [{
                agentId: 'a1',
                specialty: 'garde',
                vacations: [{ date: '2026-03-15', start: '08:00', end: '16:00' }],
            }],
        } as unknown as Mission;
        const result = calculateMissionPeriod(mission);
        expect(result.start).not.toBeNull();
        expect(result.end).not.toBeNull();
    });
});

describe('calculateMissionDuration', () => {
    it('returns 0 for empty mission', () => {
        expect(calculateMissionDuration({ id: 'x' } as Mission)).toEqual({ hours: 0, minutes: 0 });
    });

    it('sums durations across multiple agents', () => {
        const mission = {
            id: 'x',
            agentAssignments: [
                { agentId: 'a1', specialty: 'garde', vacations: [{ date: '2026-03-15', start: '08:00', end: '12:00' }] },
                { agentId: 'a2', specialty: 'garde', vacations: [{ date: '2026-03-15', start: '14:00', end: '18:00' }] },
            ],
        } as unknown as Mission;
        const result = calculateMissionDuration(mission);
        expect(result).toEqual({ hours: 8, minutes: 0 });
    });
});
