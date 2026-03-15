/**
 * R19 — Client file upload utility
 * Uploads to clientUploads/{clientId}/{filename} path in Firebase Storage.
 */
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

export interface UploadResult {
    url: string;
    path: string;
    fileName: string;
}

const MAX_SIZE_MB = 5;

export async function uploadClientFile(
    clientId: string,
    file: File,
    prefix?: string
): Promise<UploadResult> {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        throw new Error(`Fichier trop volumineux (max ${MAX_SIZE_MB} Mo).`);
    }
    const safeName = `${prefix || 'file'}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storagePath = `clientUploads/${clientId}/${safeName}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return { url, path: storagePath, fileName: file.name };
}
