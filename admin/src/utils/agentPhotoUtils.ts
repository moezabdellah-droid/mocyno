import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '../firebase.config';
import { imageUrlToPngBase64 } from './imageUtils';

/** Champs photo uniquement — compatible avec toutes les variantes du type Agent */
interface AgentPhotoFields {
    photoPath?: string | null;
    photoURL?:  string | null;
}

/**
 * Résout la photo agent en base64 PNG pour une utilisation dans les PDF.
 *
 * Ordre de priorité :
 *   1. photoPath (chemin Storage canonique → URL signée → base64 PNG)
 *   2. photoURL  (legacy → base64 PNG)
 *   3. null      (aucune photo : le PDF affichera un bloc vide)
 *
 * Chaque étape est en try/catch isolé pour tolérer les erreurs CORS,
 * les 403 Storage, les champs absents ou les URLs expirées.
 * Ne throw jamais — retourne null en cas d'échec total.
 */
export const resolveAgentPhotoBase64 = async (agent: AgentPhotoFields): Promise<string | null> => {
    // 1. Chemin canonique Storage
    if (agent.photoPath) {
        try {
            const url = await getDownloadURL(ref(storage, agent.photoPath));
            return await imageUrlToPngBase64(url);
        } catch (e) {
            console.warn('[resolveAgentPhotoBase64] photoPath failed, falling back:', e);
        }
    }

    // 2. URL legacy photoURL
    if (agent.photoURL) {
        try {
            return await imageUrlToPngBase64(agent.photoURL);
        } catch (e) {
            console.warn('[resolveAgentPhotoBase64] photoURL failed:', e);
        }
    }

    // 3. Aucune photo disponible
    return null;
};

/**
 * Résout l'URL de prévisualisation de la photo agent pour l'affichage UI.
 *
 * Ordre de priorité :
 *   1. photoPath → URL signée Firebase Storage
 *   2. photoURL  → URL directe legacy
 *   3. null
 *
 * Ne convertit PAS en base64 (usage UI uniquement, pas PDF).
 * Ne throw jamais.
 */
export const resolveAgentPhotoSrc = async (agent: AgentPhotoFields): Promise<string | null> => {
    if (agent.photoPath) {
        try {
            return await getDownloadURL(ref(storage, agent.photoPath));
        } catch { /* fallback */ }
    }
    return agent.photoURL ?? null;
};
