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

    const fallbackTriggered = useRef(false);

    // Reset trigger if ID changes
    const id = params?.id;
    useEffect(() => {
        fallbackTriggered.current = false;
    }, [resource, id]);

    useEffect(() => {
        const shouldFallback = error || (!isLoading && !data);

        if (shouldFallback && !fallbackData && !fallbackTriggered.current) {
            fallbackTriggered.current = true;

            dataProvider.getOne(resource, params)
                .then(({ data: resultData }) => {
                    setFallbackData(resultData as RecordType);
                })
                .catch(err => {
                    console.error(`[useRobustGetOne] Fallback failed for ${resource}/${id}`, err);
                    notify('Erreur chargement donnée (Fallback)', { type: 'warning' });
                });
        }
    }, [error, data, isLoading, resource, id, fallbackData, notify, params]);

    const effectiveData = data || fallbackData;

    return {
        data: effectiveData as RecordType,
        isLoading: isLoading && !effectiveData,
        error: error
    };
};
