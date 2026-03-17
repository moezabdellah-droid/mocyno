/**
 * Shared status maps + resolvers — testable as pure functions.
 * These are duplicated here from apps/clients/src/utils/statusMap.ts
 * to allow isolated testing within admin's vitest.
 */
import { describe, it, expect } from 'vitest';

// --- Inline logic under test (mirrors apps/clients/src/utils/statusMap.ts) ---
const REQUEST_STATUS: Record<string, { label: string; color: string; icon: string }> = {
    pending:     { label: 'En attente',  color: '#f59e0b', icon: '⏳' },
    in_progress: { label: 'En cours',    color: '#3b82f6', icon: '🔄' },
    resolved:    { label: 'Traité',      color: '#10b981', icon: '✅' },
    closed:      { label: 'Clôturé',     color: '#6b7280', icon: '🔒' },
};

function statusLabel(map: Record<string, { label: string }>, key?: string): string {
    if (!key) return 'Inconnu';
    return map[key]?.label || key;
}

function statusColor(map: Record<string, { color: string }>, key?: string): string {
    if (!key) return '#6b7280';
    return map[key]?.color || '#6b7280';
}

// --- Tests ---

describe('statusLabel', () => {
    it('resolves known keys', () => {
        expect(statusLabel(REQUEST_STATUS, 'pending')).toBe('En attente');
        expect(statusLabel(REQUEST_STATUS, 'resolved')).toBe('Traité');
    });

    it('returns raw key for unknown keys', () => {
        expect(statusLabel(REQUEST_STATUS, 'unknown_status')).toBe('unknown_status');
    });

    it('returns "Inconnu" for undefined key', () => {
        expect(statusLabel(REQUEST_STATUS, undefined)).toBe('Inconnu');
    });

    it('returns "Inconnu" for empty string', () => {
        expect(statusLabel(REQUEST_STATUS, '')).toBe('Inconnu');
    });
});

describe('statusColor', () => {
    it('resolves known keys', () => {
        expect(statusColor(REQUEST_STATUS, 'pending')).toBe('#f59e0b');
    });

    it('returns default gray for unknown keys', () => {
        expect(statusColor(REQUEST_STATUS, 'nope')).toBe('#6b7280');
    });

    it('returns default gray for undefined', () => {
        expect(statusColor(REQUEST_STATUS, undefined)).toBe('#6b7280');
    });
});
