/**
 * R13 — Logger opérationnel du portail client.
 * Logs structurés, sans données sensibles, identifiables facilement.
 */

const PREFIX = '[MoCyno/Client]';

function formatError(err: unknown): string {
    if (err instanceof Error) {
        const code = (err as { code?: string }).code;
        return code ? `${code}: ${err.message}` : err.message;
    }
    return String(err);
}

export const logger = {
    /** Erreur critique — affichée en console.error */
    error(context: string, err: unknown): void {
        console.error(`${PREFIX} ${context}:`, formatError(err));
    },

    /** Avertissement opérationnel — console.warn */
    warn(context: string, message: string): void {
        console.warn(`${PREFIX} ${context}: ${message}`);
    },

    /** Info structurée — uniquement en dev */
    info(context: string, message: string): void {
        if (import.meta.env.DEV) {
            console.log(`${PREFIX} ${context}: ${message}`);
        }
    },
};

/**
 * Classifie une erreur Firestore/Auth en message utilisateur lisible.
 */
export function classifyError(err: unknown): string {
    const code = (err as { code?: string })?.code || '';
    const msg = err instanceof Error ? err.message : String(err);

    // Network
    if (code === 'auth/network-request-failed' || msg.includes('network') || msg.includes('Failed to fetch')) {
        return 'Problème de connexion réseau. Vérifiez votre accès internet et réessayez.';
    }
    // Permissions
    if (code === 'permission-denied' || code.includes('permission') || msg.includes('Missing or insufficient permissions')) {
        return 'Accès refusé. Vous n\'avez pas les permissions nécessaires.';
    }
    // Index missing
    if (msg.includes('requires an index') || msg.includes('requires a composite index')) {
        return 'Service temporairement indisponible. L\'équipe technique a été notifiée.';
    }
    // Not found
    if (code === 'not-found' || code === 'functions/not-found') {
        return 'Ressource introuvable. Contactez votre administrateur.';
    }
    // Unauthenticated
    if (code === 'unauthenticated' || code === 'auth/requires-recent-login') {
        return 'Votre session a expiré. Veuillez vous reconnecter.';
    }
    // Rate limiting
    if (code === 'resource-exhausted' || code === 'auth/too-many-requests') {
        return 'Trop de requêtes. Veuillez patienter quelques instants.';
    }
    // Default
    return 'Une erreur est survenue. Si le problème persiste, contactez le support.';
}

/**
 * Normalise une valeur Firestore en Date JS.
 * Accepte : Timestamp, { seconds }, string, number, Date.
 */
export function toJsDate(value: unknown): Date | null {
    if (!value) return null;
    if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
        return (value as { toDate: () => Date }).toDate();
    }
    if (typeof value === 'object' && value !== null && 'seconds' in value) {
        return new Date((value as { seconds: number }).seconds * 1000);
    }
    const d = new Date(value as string | number);
    return isNaN(d.getTime()) ? null : d;
}

export function formatDate(value: unknown): string {
    const d = toJsDate(value);
    if (!d) return '—';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatTime(value: unknown): string {
    const d = toJsDate(value);
    if (!d) return '—';
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
