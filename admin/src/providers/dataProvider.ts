import type {
    DataProvider,
    GetListParams,
    GetListResult,
    GetOneParams,
    GetOneResult,
    GetManyParams,
    GetManyResult,
    GetManyReferenceParams,
    GetManyReferenceResult,
    CreateParams,
    CreateResult,
    UpdateParams,
    UpdateResult,
    UpdateManyParams,
    UpdateManyResult,
    DeleteParams,
    DeleteResult,
    DeleteManyParams,
    DeleteManyResult,
    RaRecord
} from 'react-admin';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    documentId,
    getCountFromServer,
    type QueryConstraint,
    type DocumentSnapshot
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase.config';

interface FileUpload {
    rawFile: File;
    src?: string;
    title?: string;
}

const convertFileToUrl = async (file: string | FileUpload): Promise<string> => {
    if (typeof file === 'string') return file;
    if (!file || !file.rawFile) return '';

    const storageRef = ref(storage, `agents/photos/${file.rawFile.name}`);
    await uploadBytes(storageRef, file.rawFile);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
};

/**
 * Recursive cleanup of payload to remove undefined values.
 * Firestore throws errors on undefined (but accepts null).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sanitizePayload = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(sanitizePayload);
    }
    if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newObj: any = {};
        Object.keys(obj).forEach(key => {
            const val = obj[key];
            if (val !== undefined) {
                newObj[key] = sanitizePayload(val);
            }
        });
        return newObj;
    }
    return obj;
};

// Resource alias: react-admin resource name → Firestore collection name
// NOTE: A21 — removed 'clients: agents' alias so 'clients' reads the real clients/ collection
const resourceAlias: Record<string, string> = {};
const resolveResource = (resource: string) => resourceAlias[resource] || resource;

// ─── A24 — Allowlist des filtres et tris serveur par ressource ───────────────
// Seuls ces champs déclenchent un where() Firestore.
// Tout autre champ est silencieusement ignoré (évite les index fantômes).
const ALLOWED_FILTERS: Record<string, string[]> = {
    reports:           ['status', 'source', 'severity', 'type', 'clientId'],
    consignes:         ['targetId', 'siteId', 'source', 'status'],
    clientRequests:    ['clientId', 'status'],
    documents:         ['clientId'],
    documentDownloads: ['clientId', 'callerRole'],
    events:            ['type', 'status'],
    agents:            ['status', 'contractNature'],
    auditLogs:         ['action', 'targetType'],
    // P1 : companyName retiré (TextInput libre), status seul conservé (SelectInput borné)
    clients:           ['status'],
};

// Ordre canonique des filtres : convention interne pour la lisibilité.
// Ne force pas le matching Firestore, mais garantit un comportement stable.
const FILTER_ORDER: Record<string, string[]> = {
    reports:           ['clientId', 'source', 'status', 'severity', 'type'],
    consignes:         ['targetId', 'siteId', 'source', 'status'],
    clientRequests:    ['clientId', 'status'],
    events:            ['type', 'status'],
    agents:            ['status', 'contractNature'],
    documentDownloads: ['clientId', 'callerRole'],
    auditLogs:         ['action', 'targetType'],
    clients:           ['status'],
};

// Seuls ces champs sont autorisés comme champ de tri serveur.
// Tout autre tri (ex: clic sur colonne 'title') est ignoré silencieusement.
const ALLOWED_SORTS: Record<string, string[]> = {
    reports:           ['createdAt'],
    consignes:         ['createdAt'],
    clientRequests:    ['createdAt'],
    events:            ['timestamp'],
    agents:            ['lastName'],
    documents:         ['createdAt'],
    documentDownloads: ['downloadedAt'],
    auditLogs:         ['createdAt'],
    // clients : tri RH canonique sur provisionedAt (date d'onboarding)
    clients:           ['provisionedAt'],
};

/**
 * Retourne true uniquement si la valeur est exploitable comme contrainte Firestore.
 * Rejette : undefined, null, chaîne vide ou blanche, tableau vide.
 */
const isValidFilterValue = (value: unknown): boolean => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
};
// ─────────────────────────────────────────────────────────────────────────────

// Build filter+sort constraints WITHOUT pagination limit (for counting)
const buildFilterQuery = (resource: string, params: GetListParams) => {
    const resolved = resolveResource(resource);
    const resourceKey = resolved;
    const { filter, sort } = params;
    const { field, order } = sort || { field: 'id', order: 'ASC' };

    const constraints: QueryConstraint[] = [];

    if (filter) {
        const allowedKeys = ALLOWED_FILTERS[resourceKey] ?? [];
        const canonicalOrder = FILTER_ORDER[resourceKey] ?? allowedKeys;

        // Tri canonique des clés avant construction des contraintes
        const sortedKeys = Object.keys(filter).sort((a, b) => {
            const ia = canonicalOrder.indexOf(a);
            const ib = canonicalOrder.indexOf(b);
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        });

        sortedKeys.forEach(key => {
            // Rejeter les champs non autorisés pour cette ressource
            if (allowedKeys.length > 0 && !allowedKeys.includes(key)) return;

            const value = filter[key];

            if (typeof value === 'object' && value !== null && ('$gte' in value || '$lte' in value)) {
                if (!key.includes('.')) {
                    const rangeValue = value as { $gte?: unknown; $lte?: unknown };
                    if (isValidFilterValue(rangeValue.$gte)) constraints.push(where(key, '>=', rangeValue.$gte));
                    if (isValidFilterValue(rangeValue.$lte)) constraints.push(where(key, '<=', rangeValue.$lte));
                }
            } else if (Array.isArray(value)) {
                if (isValidFilterValue(value)) constraints.push(where(key, 'in', value.slice(0, 10)));
            } else if (isValidFilterValue(value) && typeof value !== 'object') {
                constraints.push(where(key, '==', value));
            }
        });
    }

    // Tri serveur : ignoré si le champ n'est pas dans l'allowlist de la ressource
    const allowedSorts = ALLOWED_SORTS[resourceKey] ?? [];
    if (field && field !== 'id' && (allowedSorts.length === 0 || allowedSorts.includes(field))) {
        constraints.push(orderBy(field, order.toLowerCase() as 'asc' | 'desc'));
    }

    return query(collection(db, resolved), ...constraints);
};

// ─── A22 — Cursor-based pagination ──────────────────────────────────────────
// Cache last document snapshot per resource+sort+filter+page for cursor pagination
interface CursorEntry {
    key: string;           // serialized sort+filter
    pages: Map<number, DocumentSnapshot>;
}

const cursorCache = new Map<string, CursorEntry>();

const getCursorKey = (params: GetListParams): string => {
    const { sort, filter } = params;
    return JSON.stringify({ sort, filter });
};

// Build paginated query with cursor support
const buildPaginatedQuery = (resource: string, params: GetListParams, cursor?: DocumentSnapshot) => {
    const { pagination } = params;
    const { perPage } = pagination || { page: 1, perPage: 10 };
    const baseQuery = buildFilterQuery(resource, params);
    const paginationConstraints: QueryConstraint[] = [];
    if (cursor) {
        paginationConstraints.push(startAfter(cursor));
    }
    if (perPage) {
        paginationConstraints.push(limit(perPage));
    }
    return query(baseQuery, ...paginationConstraints);
};
// ─────────────────────────────────────────────────────────────────────────────

const dataProvider: DataProvider = {
    getList: async <RecordType extends RaRecord = RaRecord>(
        resource: string,
        params: GetListParams
    ): Promise<GetListResult<RecordType>> => {
        try {
            const { pagination } = params;
            const { page, perPage: _perPage } = pagination || { page: 1, perPage: 10 };
            const cursorKey = getCursorKey(params);

            // Get or initialize cursor entry for this resource
            let entry = cursorCache.get(resource);
            if (!entry || entry.key !== cursorKey) {
                // Sort/filter changed → invalidate cache
                entry = { key: cursorKey, pages: new Map() };
                cursorCache.set(resource, entry);
            }

            // For page > 1, we need the cursor from the previous page
            let cursor: DocumentSnapshot | undefined;
            if (page > 1) {
                cursor = entry.pages.get(page - 1);
                if (!cursor) {
                    // Previous page cursor not available → fetch preceding pages to build cursors
                    for (let p = 1; p < page; p++) {
                        const prevCursor = p > 1 ? entry.pages.get(p - 1) : undefined;
                        const prevQuery = buildPaginatedQuery(resource, params, prevCursor);
                        const prevSnapshot = await getDocs(prevQuery);
                        if (prevSnapshot.docs.length > 0) {
                            entry.pages.set(p, prevSnapshot.docs[prevSnapshot.docs.length - 1]);
                        } else {
                            break; // No more data
                        }
                    }
                    cursor = entry.pages.get(page - 1);
                }
            }

            const paginatedQuery = buildPaginatedQuery(resource, params, cursor);
            const countQuery = buildFilterQuery(resource, params);

            const [querySnapshot, countSnapshot] = await Promise.all([
                getDocs(paginatedQuery),
                getCountFromServer(countQuery)
            ]);

            // Cache the last doc of THIS page for future page+1 navigation
            if (querySnapshot.docs.length > 0) {
                entry.pages.set(page, querySnapshot.docs[querySnapshot.docs.length - 1]);
            }

            const data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as RecordType[];

            const total = countSnapshot.data().count;

            return { data, total };
        } catch (error) {
            console.error(`[DataProvider] getList ${resource} failed:`, error);
            throw error;
        }
    },

    getOne: async <RecordType extends RaRecord = RaRecord>(
        resource: string,
        params: GetOneParams
    ): Promise<GetOneResult<RecordType>> => {
        if (!params || !params.id) {
            console.error(`[DataProvider] getOne ERROR: Missing ID for ${resource}`);
            throw new Error(`[DataProvider] Missing ID for ${resource}`);
        }

        const idString = params.id.toString();

        console.log(`[DP getOne] start resource=${resource} id=${idString}`);

        try {
            const docRef = doc(db, resolveResource(resource), idString);
            const docSnap = await getDoc(docRef);

            console.log(`[DP getOne] snap resource=${resource} id=${idString} exists=${docSnap.exists()} rawData=${docSnap.exists() ? JSON.stringify(Object.keys(docSnap.data() ?? {})) : 'null'}`);

            if (docSnap.exists()) {
                const data = docSnap.data();
                if (!data) {
                    console.error(`[DataProvider] getOne ERROR: Document exists but data is empty! ${resource}/${idString}`);
                    throw new Error(`Document data is empty: ${resource}/${idString}`);
                }

                console.log(`[DP getOne] return resource=${resource} id=${idString} hasData=true keys=${Object.keys(data).join(',')}`);

                return {
                    data: {
                        id: docSnap.id,
                        ...data
                    } as RecordType
                };
            }

            console.log(`[DP getOne] not found resource=${resource} id=${idString}`);
            // React Admin expects a rejected promise for 404.
            throw new Error(`Document not found: ${resource}/${idString}`);
        } catch (error) {
            console.error(`[DataProvider] getOne EXCEPTION ${resource}/${idString}:`, error);
            throw error;
        }
    },


    getMany: async <RecordType extends RaRecord = RaRecord>(
        resource: string,
        params: GetManyParams
    ): Promise<GetManyResult<RecordType>> => {
        const { ids } = params;
        const data: RecordType[] = [];

        // Firestore 'in' limitation: max 10 values
        const chunkSize = 10;
        const chunks = [];
        for (let i = 0; i < ids.length; i += chunkSize) {
            chunks.push(ids.slice(i, i + chunkSize));
        }

        for (const chunk of chunks) {
            const q = query(
                collection(db, resolveResource(resource)),
                where(documentId(), 'in', chunk.map(id => id.toString()))
            );
            const snapshot = await getDocs(q);
            snapshot.docs.forEach(doc => {
                data.push({
                    id: doc.id,
                    ...doc.data()
                } as RecordType);
            });
        }

        return { data };
    },

    getManyReference: async <RecordType extends RaRecord = RaRecord>(
        resource: string,
        params: GetManyReferenceParams
    ): Promise<GetManyReferenceResult<RecordType>> => {
        const { target, id, filter } = params;

        // Combine the reference filter with existing filters
        const combinedParams = {
            ...params,
            filter: { ...filter, [target]: id }
        };

        // A22 — Use real count instead of hacked total
        const countQuery = buildFilterQuery(resource, combinedParams);
        const paginatedQuery = buildPaginatedQuery(resource, combinedParams);

        const [querySnapshot, countSnapshot] = await Promise.all([
            getDocs(paginatedQuery),
            getCountFromServer(countQuery)
        ]);

        const data = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as RecordType[];

        const total = countSnapshot.data().count;

        return { data, total };
    },

    create: async <RecordType extends RaRecord = RaRecord>(
        resource: string,
        params: CreateParams
    ): Promise<CreateResult<RecordType>> => {
        let newItem = { ...params.data };

        // Handle file upload for photoURL
        if (newItem.photoURL) {
            newItem.photoURL = await convertFileToUrl(newItem.photoURL);
        }

        // Recursive cleanup to remove undefined values
        newItem = sanitizePayload(newItem);

        try {
            const collectionRef = collection(db, resource);
            const docRef = await addDoc(collectionRef, newItem);

            // A22 — Invalidate cursor cache for this resource after create
            cursorCache.delete(resource);

            return {
                data: {
                    ...newItem,
                    id: docRef.id
                } as RecordType
            };
        } catch (e) {
            console.error('[DataProvider] Error adding document: ', e);
            throw e;
        }
    },

    update: async <RecordType extends RaRecord = RaRecord>(
        resource: string,
        params: UpdateParams
    ): Promise<UpdateResult<RecordType>> => {
        const { id: _id, ...rest } = params.data;

        // Handle file upload
        if (rest.photoURL && typeof rest.photoURL !== 'string') {
            rest.photoURL = await convertFileToUrl(rest.photoURL);
        }

        // Recursive cleanup to remove undefined values
        const data = sanitizePayload(rest);

        try {
            const docRef = doc(db, resource, params.id.toString());
            await updateDoc(docRef, data);

            return {
                data: { ...params.data, id: params.id } as RecordType
            };
        } catch (e) {
            console.error('[DataProvider] Error updating document: ', e);
            throw e;
        }
    },

    updateMany: async (
        resource: string,
        params: UpdateManyParams
    ): Promise<UpdateManyResult> => {
        for (const id of params.ids) {
            const docRef = doc(db, resource, id.toString());
            await updateDoc(docRef, params.data);
        }
        return { data: params.ids };
    },

    delete: async <RecordType extends RaRecord = RaRecord>(
        resource: string,
        params: DeleteParams
    ): Promise<DeleteResult<RecordType>> => {
        const docRef = doc(db, resource, params.id.toString());
        await deleteDoc(docRef);

        // A22 — Invalidate cursor cache after delete
        cursorCache.delete(resource);

        return { data: params.previousData as RecordType };
    },

    deleteMany: async (
        resource: string,
        params: DeleteManyParams
    ): Promise<DeleteManyResult> => {
        for (const id of params.ids) {
            const docRef = doc(db, resource, id.toString());
            await deleteDoc(docRef);
        }

        // A22 — Invalidate cursor cache after deleteMany
        cursorCache.delete(resource);

        return { data: params.ids };
    }
};

export default dataProvider;
