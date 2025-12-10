import { useGetOne, useNotify } from 'react-admin';
import { useEffect, useState, useRef } from 'react';
import dataProvider from '../providers/dataProvider';

export interface RobustGetOneResult<RecordType = any> {
    data?: RecordType;
    isLoading: boolean;
    error?: any;
}

export const useRobustGetOne = <RecordType = any>(
    resource: string,
    params: any
): RobustGetOneResult<RecordType> => {
    const { data, isLoading, error } = useGetOne<RecordType>(resource, params);
    const [fallbackData, setFallbackData] = useState<RecordType | undefined>(undefined);
    const notify = useNotify();

    // Use useRef for tracking
    const fallbackTriggered = useRef(false);

    useEffect(() => {
        if ((error || (data === undefined && !isLoading)) && !fallbackData && !fallbackTriggered.current) {
            fallbackTriggered.current = true;

            dataProvider.getOne(resource, params)
                .then(({ data }) => {
                    setFallbackData(data as RecordType);
                })
                .catch(err => {
                    console.error(`[useRobustGetOne] Fallback failed for ${resource}/${params.id}`, err);
                    notify('Erreur chargement donnée', { type: 'error' });
                });
        }
    }, [error, data, isLoading, resource, params.id, fallbackData, notify]);

    // Ensure we return RecordType (or undefined if loading), forcing cast if needed or ensuring logic
    const effectiveData = data || fallbackData;

    return {
        data: effectiveData as RecordType,
        isLoading: isLoading && !effectiveData,
        error: error
    };
};
