/**
 * R18 — Shared status mapping
 * Single source of truth for lifecycle statuses across the portal.
 */

/** Request statuses */
export const REQUEST_STATUS: Record<string, { label: string; color: string; icon: string }> = {
    pending:     { label: 'En attente',  color: '#f59e0b', icon: '⏳' },
    in_progress: { label: 'En cours',    color: '#3b82f6', icon: '🔄' },
    resolved:    { label: 'Traité',      color: '#10b981', icon: '✅' },
    closed:      { label: 'Clôturé',     color: '#6b7280', icon: '🔒' },
};

/** Report / incident statuses */
export const REPORT_STATUS: Record<string, { label: string; color: string; icon: string }> = {
    open:        { label: 'Ouvert',      color: '#ef4444', icon: '🔴' },
    in_progress: { label: 'En cours',    color: '#3b82f6', icon: '🔄' },
    resolved:    { label: 'Résolu',      color: '#10b981', icon: '✅' },
    closed:      { label: 'Clôturé',     color: '#6b7280', icon: '🔒' },
};

/** Client consigne validation statuses */
export const CONSIGNE_STATUS: Record<string, { label: string; color: string; icon: string }> = {
    pending:     { label: 'En attente de validation', color: '#f59e0b', icon: '⏳' },
    approved:    { label: 'Validée',                  color: '#10b981', icon: '✅' },
    rejected:    { label: 'Refusée',                  color: '#ef4444', icon: '❌' },
};

/** Generic label resolver */
export function statusLabel(map: Record<string, { label: string }>, key?: string): string {
    if (!key) return 'Inconnu';
    return map[key]?.label || key;
}

export function statusColor(map: Record<string, { color: string }>, key?: string): string {
    if (!key) return '#6b7280';
    return map[key]?.color || '#6b7280';
}
