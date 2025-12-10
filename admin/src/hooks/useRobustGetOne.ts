
import { useGetOne, useNotify } from 'react-admin';
import type { RaRecord } from 'react-admin';
import { useEffect, useState, useRef } from 'react';
import dataProvider from '../providers/dataProvider';

export interface RobustGetOneResult<RecordType extends RaRecord = any> {
    data?: RecordType;
    isLoading: boolean;
    error?: unknown;
}

export const useRobustGetOne = <RecordType extends RaRecord = any>(
    resource: string,
    params: { id: string; meta?: any }
): RobustGetOneResult<RecordType> => {
    // Cast to verify constraint or use any for hook
    const { data, isLoading, error } = useGetOne<RecordType>(resource, params as any);
    const [fallbackData, setFallbackData] = useState<RecordType | undefined>(undefined);
    const notify = useNotify();

    const fallbackTriggered = useRef(false);

    // Reset trigger if ID changes
    const id = params?.id;
    useEffect(() => {
        fallbackTriggered.current = false;
    }, [resource, id]);

    useEffect(() => {
        // Trigger fallback if error exists OR (not loading AND (no data OR empty object?))
        // React 19 / getOne: if data is undefined/null
        const shouldFallback = error || (!isLoading && !data);

        if (shouldFallback && !fallbackData && !fallbackTriggered.current) {
            fallbackTriggered.current = true;

            dataProvider.getOne(resource, params as any)
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
