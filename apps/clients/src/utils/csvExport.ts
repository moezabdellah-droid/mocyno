/**
 * R16 — CSV export utility
 * Generates a CSV file from an array of objects and triggers a download.
 */

export function exportCSV(
    rows: Record<string, unknown>[],
    columns: { key: string; label: string }[],
    filename: string
): void {
    if (rows.length === 0) return;

    const sep = ';'; // French-compatible separator for Excel
    const header = columns.map(c => `"${c.label}"`).join(sep);
    const lines = rows.map(row =>
        columns.map(c => {
            const val = row[c.key];
            if (val === null || val === undefined) return '""';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        }).join(sep)
    );

    const bom = '\uFEFF'; // UTF-8 BOM for Excel
    const csv = bom + [header, ...lines].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/** Format a Firestore timestamp or ISO string to a readable date string */
export function csvDate(value: unknown): string {
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

export function csvDateTime(value: unknown): string {
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

export function todayISO(): string {
    return new Date().toISOString().slice(0, 10);
}
