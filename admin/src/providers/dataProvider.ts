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
    documentId,
    type QueryConstraint
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, app } from '../firebase.config';

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
const sanitizePayload = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(sanitizePayload);
    }
    if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
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

// Helper for building Firestore queries from React Admin params
const buildQuery = (resource: string, params: GetListParams) => {
    const { filter, pagination, sort } = params;
    // Provide defaults to avoid "Property does not exist on type ... | undefined"
    const { perPage } = pagination || { page: 1, perPage: 10 };
    const { field, order } = sort || { field: 'id', order: 'ASC' };

    const constraints: QueryConstraint[] = [];

    // 1. FILTERING (WHERE)
    if (filter) {
        Object.keys(filter).forEach(key => {
            const value = filter[key];

            // Specific case: Date Filter (for Planning) - checks object structure
            if (typeof value === 'object' && value !== null && (value.$gte || value.$lte)) {
                // Note: Deep field filtering like 'agentAssignments.vacations.date' doesn't work well 
                // without specific data structures in Firestore. 
                // We skip it here to fallback to client-side or specific implementation, 
                // OR we implement it if the field is simpler.
                // For now, we only support simple field inequalities if key doesn't contain dots
                if (!key.includes('.')) {
                    if (value.$gte) constraints.push(where(key, '>=', value.$gte));
                    if (value.$lte) constraints.push(where(key, '<=', value.$lte));
                }
            }
            // Specific case: Array (e.g. 'ids')
            else if (Array.isArray(value)) {
                if (value.length > 0) {
                    constraints.push(where(key, 'in', value.slice(0, 10))); // Firestore 'in' limit is 10
                }
            }
            // Full text search hack (requires 'q' filter to be passed as such)
            // Not implemented for generic fields.

            // Standard Equality
            else if (value !== undefined && value !== null && typeof value !== 'object') {
                constraints.push(where(key, '==', value));
            }
        });
    }

    // 2. SORTING (ORDER BY)
    if (field && field !== 'id') {
        constraints.push(orderBy(field, order.toLowerCase() as 'asc' | 'desc'));
    }

    // 3. PAGINATION (LIMIT)
    // Basic implementation: reduce load size. 
    // Real cursor-based pagination would require 'startAfter'.
    if (perPage) {
        constraints.push(limit(perPage));
    }

    return query(collection(db, resource), ...constraints);
};

const dataProvider: DataProvider = {
    getList: async <RecordType extends RaRecord = RaRecord>(
        resource: string,
        params: GetListParams
    ): Promise<GetListResult<RecordType>> => {
        console.log(`[DataProvider] getList ${resource}`, params);
        try {
            const q = buildQuery(resource, params);
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as RecordType[];

            // Estimer le total (Hack)
            const currentPerPage = params.pagination?.perPage || 10;
            const total = data.length === currentPerPage ? data.length * 2 : data.length;

            const result = {
                data,
                total,
            };
            console.log(`[DataProvider] getList ${resource} result:`, result);
            return result;
        } catch (error) {
            console.error(`[DataProvider] getList ${resource} failed:`, error);
            throw error;
        }
    },

    getOne: async <RecordType extends RaRecord = RaRecord>(
        resource: string,
        params: GetOneParams
    ): Promise<GetOneResult<RecordType>> => {
        console.log(`%c[DataProvider] getOne ENTER ${resource}`, 'color: green; font-weight: bold;', params);

        if (!params || !params.id) {
            console.error(`[DataProvider] getOne ERROR: Missing ID for ${resource}`);
            throw new Error(`[DataProvider] Missing ID for ${resource}`);
        }

        const idString = params.id.toString();

        try {
            console.log(`[DataProvider] getOne fetching doc: ${resource}/${idString}`);
            const docRef = doc(db, resource, idString);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                if (!data) {
                    console.error(`[DataProvider] getOne ERROR: Document exists but data is empty! ${resource}/${idString}`);
                    throw new Error(`Document data is empty: ${resource}/${idString}`);
                }

                const result = {
                    data: {
                        id: docSnap.id,
                        ...data
                    } as RecordType
                };
                console.log(`[DataProvider] getOne SUCCESS ${resource}:`, result);
                return result;
            }

            console.warn(`[DataProvider] getOne WARNING: Not found ${resource}/${idString}`);
            // React Admin expects a rejected promise for 404, usually.
            // But some implementations return { data: null } which crashes it.
            // We MUST throw an error.
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
        console.log(`[DataProvider] getMany ${resource}`, params);
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
                collection(db, resource),
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

        const result = { data };
        console.log(`[DataProvider] getMany ${resource} result:`, result);
        return result;
    },

    getManyReference: async <RecordType extends RaRecord = RaRecord>(
        resource: string,
        params: GetManyReferenceParams
    ): Promise<GetManyReferenceResult<RecordType>> => {
        console.log(`[DataProvider] getManyReference ${resource}`, params);
        const { target, id, filter, pagination } = params;

        // Combine the reference filter with existing filters
        const combinedParams = {
            ...params,
            filter: { ...filter, [target]: id }
        };

        // Reuse buildQuery to handle pagination, sort, and the new filter
        const q = buildQuery(resource, combinedParams);
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as RecordType[];

        const currentPerPage = pagination?.perPage || 10;
        const total = data.length === currentPerPage ? data.length * 2 : data.length;

        const result = {
            data,
            total
        };
        console.log(`[DataProvider] getManyReference ${resource} result:`, result);
        return result;
    },

    create: async <RecordType extends RaRecord = RaRecord>(
        resource: string,
        params: CreateParams
    ): Promise<CreateResult<RecordType>> => {
        console.group(`[DataProvider] create ${resource}`);
        console.log('Firebase Config:', app.options); // Verify Project ID
        console.log('Params:', params);

        let newItem = { ...params.data };

        // Handle file upload for photoURL
        if (newItem.photoURL) {
            newItem.photoURL = await convertFileToUrl(newItem.photoURL);
        }

        // Recursive cleanup to remove undefined values
        newItem = sanitizePayload(newItem);
        console.log('Sanitized Payload:', newItem);

        try {
            const docRef = await addDoc(collection(db, resource), newItem);
            console.log('Document written with ID: ', docRef.id);

            const result = {
                data: {
                    ...newItem,
                    id: docRef.id
                } as RecordType
            };
            console.log('Result returned to React-Admin:', result);
            console.groupEnd();
            return result;
        } catch (e) {
            console.error('Error adding document: ', e);
            console.groupEnd();
            throw e;
        }
    },

    update: async <RecordType extends RaRecord = RaRecord>(
        resource: string,
        params: UpdateParams
    ): Promise<UpdateResult<RecordType>> => {
        console.group(`[DataProvider] update ${resource}`);
        console.log('Firebase Config:', app.options); // Verify Project ID
        console.log('Params:', params);

        const { id: _id, ...rest } = params.data;

        // Handle file upload
        if (rest.photoURL && typeof rest.photoURL !== 'string') {
            rest.photoURL = await convertFileToUrl(rest.photoURL);
        }

        // Recursive cleanup to remove undefined values
        const data = sanitizePayload(rest);
        console.log('Sanitized Payload (for update):', data);

        try {
            const docRef = doc(db, resource, params.id.toString());
            await updateDoc(docRef, data);
            console.log('Document updated successfully:', params.id);

            const result = {
                data: { ...params.data, id: params.id } as RecordType
            };
            console.log('Result returned to React-Admin:', result);
            console.groupEnd();
            return result;
        } catch (e) {
            console.error('Error updating document: ', e);
            console.groupEnd();
            throw e;
        }
    },

    updateMany: async (
        resource: string,
        params: UpdateManyParams
    ): Promise<UpdateManyResult> => {
        console.log(`[DataProvider] updateMany ${resource}`, params);
        for (const id of params.ids) {
            const docRef = doc(db, resource, id.toString());
            await updateDoc(docRef, params.data);
        }

        const result = {
            data: params.ids
        };
        console.log(`[DataProvider] updateMany ${resource} result:`, result);
        return result;
    },

    delete: async <RecordType extends RaRecord = RaRecord>(
        resource: string,
        params: DeleteParams
    ): Promise<DeleteResult<RecordType>> => {
        console.log(`[DataProvider] delete ${resource}`, params);
        const docRef = doc(db, resource, params.id.toString());
        await deleteDoc(docRef);

        const result = {
            data: params.previousData as RecordType
        };
        console.log(`[DataProvider] delete ${resource} result:`, result);
        return result;
    },

    deleteMany: async (
        resource: string,
        params: DeleteManyParams
    ): Promise<DeleteManyResult> => {
        console.log(`[DataProvider] deleteMany ${resource}`, params);
        for (const id of params.ids) {
            const docRef = doc(db, resource, id.toString());
            await deleteDoc(docRef);
        }

        const result = {
            data: params.ids
        };
        console.log(`[DataProvider] deleteMany ${resource} result:`, result);
        return result;
    }
};

export default dataProvider;
