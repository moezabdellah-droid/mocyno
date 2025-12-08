import type {
    DataProvider,
    GetOneParams,
    GetManyParams,
    CreateParams,
    UpdateParams,
    UpdateManyParams,
    DeleteParams,
    DeleteManyParams
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
import { db, storage } from './firebase';

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
    getList: async (resource: string) => {
        const querySnapshot = await getDocs(collection(db, resource));
        const data = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return {
            data: data as unknown,
            total: data.length,
        };
    },

    getOne: async (resource: string, params: GetOneParams) => {
        const docRef = doc(db, resource, params.id.toString());
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return {
                data: {
                    id: docSnap.id,
                    ...docSnap.data()
                }
            };
        }

        throw new Error(`Document not found: ${resource}/${params.id}`);
    },

    getMany: async (resource: string, params: GetManyParams) => {
        const querySnapshot = await getDocs(collection(db, resource));
        const data = querySnapshot.docs
            .filter(doc => params.ids.includes(doc.id))
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

        return { data };
    },

    getManyReference: async (resource: string) => {
        const querySnapshot = await getDocs(collection(db, resource));
        const data = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return {
            data,
            total: data.length
        };
    },

    create: async (resource: string, params: CreateParams) => {
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
            }
        };
    },

    update: async (resource: string, params: UpdateParams) => {
        const { ...rest } = params.data;

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
            data: params.data
        };
    },

    updateMany: async (resource: string, params: UpdateManyParams) => {
        for (const id of params.ids) {
            const docRef = doc(db, resource, id.toString());
            await updateDoc(docRef, params.data);
        }

        return {
            data: params.ids
        };
    },

    delete: async (resource: string, params: DeleteParams) => {
        const docRef = doc(db, resource, params.id.toString());
        await deleteDoc(docRef);

        return {
            data: params.previousData
        };
    },

    deleteMany: async (resource: string, params: DeleteManyParams) => {
        for (const id of params.ids) {
            const docRef = doc(db, resource, id.toString());
            await deleteDoc(docRef);
        }

        return {
            data: params.ids
        };
    }
} as unknown;

export default dataProvider;
