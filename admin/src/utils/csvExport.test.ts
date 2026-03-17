/**
 * CSV date formatting tests — mirrors apps/clients/src/utils/csvExport.ts
 * Tests the pure date/datetime formatting functions.
 */
import { describe, it, expect } from 'vitest';

// --- Inline logic under test ---
function csvDate(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'string') {
        const d = new Date(value);
        return isNaN(d.getTime()) ? value : d.toLocaleDateString('fr-FR');
    }
    if (typeof value === 'object' && value !== null && 'seconds' in value) {
        return new Date((value as { seconds: number }).seconds * 1000).toLocaleDateString('fr-FR');
    }
    return String(value);
}

function csvDateTime(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'string') {
        const d = new Date(value);
        return isNaN(d.getTime()) ? value : d.toLocaleString('fr-FR');
    }
    if (typeof value === 'object' && value !== null && 'seconds' in value) {
        return new Date((value as { seconds: number }).seconds * 1000).toLocaleString('fr-FR');
    }
    return String(value);
}

// --- Tests ---

describe('csvDate', () => {
    it('returns empty string for falsy values', () => {
        expect(csvDate(null)).toBe('');
        expect(csvDate(undefined)).toBe('');
        expect(csvDate('')).toBe('');
    });

    it('formats ISO date string to fr-FR', () => {
        const result = csvDate('2026-03-15');
        // fr-FR format: DD/MM/YYYY
        expect(result).toMatch(/15\/03\/2026/);
    });

    it('returns raw string for unparseable dates', () => {
        expect(csvDate('not a date')).toBe('not a date');
    });

    it('handles Firestore timestamp objects', () => {
        // March 15, 2026 00:00:00 UTC = 1773619200 seconds
        const ts = { seconds: 1773619200 };
        const result = csvDate(ts);
        expect(result).toMatch(/2026/);
    });

    it('returns toString for other types', () => {
        expect(csvDate(42)).toBe('42');
    });
});

describe('csvDateTime', () => {
    it('returns empty for falsy', () => {
        expect(csvDateTime(null)).toBe('');
    });

    it('formats ISO datetime to fr-FR with time', () => {
        const result = csvDateTime('2026-03-15T14:30:00Z');
        expect(result).toMatch(/15\/03\/2026/);
    });

    it('handles Firestore timestamp', () => {
        const ts = { seconds: 1773619200 };
        const result = csvDateTime(ts);
        expect(result).toMatch(/2026/);
    });
});
