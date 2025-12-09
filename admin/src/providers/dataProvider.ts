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
    deleteDoc
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

const dataProvider: DataProvider = {
    getList: async <RecordType extends RaRecord = RaRecord>(
        resource: string,
        _params: GetListParams
    ): Promise<GetListResult<RecordType>> => {
        console.log(`[DataProvider] getList called for resource: ${resource}`, _params);
        try {
            const querySnapshot = await getDocs(collection(db, resource));
            console.log(`[DataProvider] getList ${resource} found ${querySnapshot.size} docs`);
            const data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as RecordType[];

            return {
                data,
                total: data.length,
            };
        } catch (error) {
            console.error(`[DataProvider] getList ${resource} failed:`, error);
            throw error;
        }
    },

    getOne: async <RecordType extends RaRecord = RaRecord>(
        resource: string,
        params: GetOneParams
    ): Promise<GetOneResult<RecordType>> => {
        const docRef = doc(db, resource, params.id.toString());
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return {
                data: {
                    id: docSnap.id,
                    ...docSnap.data()
                } as RecordType
            };
        }

        throw new Error(`Document not found: ${resource}/${params.id}`);
    },

    getMany: async <RecordType extends RaRecord = RaRecord>(
        resource: string,
        params: GetManyParams
    ): Promise<GetManyResult<RecordType>> => {
        const querySnapshot = await getDocs(collection(db, resource));
        const data = querySnapshot.docs
            .filter(doc => params.ids.includes(doc.id))
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as RecordType[];

        return { data };
    },

    getManyReference: async <RecordType extends RaRecord = RaRecord>(
        resource: string,
        _params: GetManyReferenceParams
    ): Promise<GetManyReferenceResult<RecordType>> => {
        const querySnapshot = await getDocs(collection(db, resource));
        const data = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as RecordType[];

        return {
            data,
            total: data.length
        };
    },

    create: async <RecordType extends RaRecord = RaRecord>(
        resource: string,
        params: CreateParams
    ): Promise<CreateResult<RecordType>> => {
        const newItem = { ...params.data };

        // Handle file upload for photoURL
        if (newItem.photoURL) {
            newItem.photoURL = await convertFileToUrl(newItem.photoURL);
        }

        const docRef = await addDoc(collection(db, resource), newItem);

        return {
            data: {
                ...newItem,
                id: docRef.id
            } as RecordType
        };
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

        // Remove undefined values
        const data: Record<string, unknown> = {};
        Object.keys(rest).forEach(key => {
            if (rest[key] !== undefined) {
                data[key] = rest[key];
            }
        });

        const docRef = doc(db, resource, params.id.toString());
        await updateDoc(docRef, data);

        return {
            data: params.data as RecordType
        };
    },

    updateMany: async (
        resource: string,
        params: UpdateManyParams
    ): Promise<UpdateManyResult> => {
        for (const id of params.ids) {
            const docRef = doc(db, resource, id.toString());
            await updateDoc(docRef, params.data);
        }

        return {
            data: params.ids
        };
    },

    delete: async <RecordType extends RaRecord = RaRecord>(
        resource: string,
        params: DeleteParams
    ): Promise<DeleteResult<RecordType>> => {
        const docRef = doc(db, resource, params.id.toString());
        await deleteDoc(docRef);

        return {
            data: params.previousData as RecordType
        };
    },

    deleteMany: async (
        resource: string,
        params: DeleteManyParams
    ): Promise<DeleteManyResult> => {
        for (const id of params.ids) {
            const docRef = doc(db, resource, id.toString());
            await deleteDoc(docRef);
        }

        return {
            data: params.ids
        };
    }
};

export default dataProvider;

