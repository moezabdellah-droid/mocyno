import { useGetOne, useNotify, useDataProvider } from 'react-admin';
import type { RaRecord, GetOneParams } from 'react-admin';
import { useEffect, useState, useRef } from 'react';

export interface RobustGetOneResult<RecordType extends RaRecord = RaRecord> {
    data?: RecordType;
    isLoading: boolean;
    error?: unknown;
}

export const useRobustGetOne = <RecordType extends RaRecord = RaRecord>(
    resource: string,
    params: GetOneParams
): RobustGetOneResult<RecordType> => {
    // Cast to verify constraint or use any for hook
    const { data, isLoading, error } = useGetOne<RecordType>(resource, params);
    const [fallbackData, setFallbackData] = useState<RecordType | undefined>(undefined);
    const notify = useNotify();
    const dataProvider = useDataProvider();

    // Debug logging for dataProvider
    useEffect(() => {
        if (dataProvider && !fallbackTriggered.current) { // Log once
            console.log('[useRobustGetOne] dataProvider instance:', dataProvider);
            if (typeof dataProvider.getOne === 'function') {
                // console.log('[useRobustGetOne] dataProvider.getOne source:', dataProvider.getOne.toString());
            } else {
                console.error('[useRobustGetOne] CRITICAL: dataProvider.getOne is NOT a function!', dataProvider.getOne);
            }
        }
    }, [dataProvider]);

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

            console.log(`[useRobustGetOne] Triggering fallback for ${resource}/${id}`);

            dataProvider.getOne(resource, params)
                .then(({ data: resultData }) => {
                    console.log(`[useRobustGetOne] Fallback success:`, resultData);
                    setFallbackData(resultData as RecordType);
                })
                .catch(err => {
                    console.error(`[useRobustGetOne] Fallback failed for ${resource}/${id}`, err);
                    notify('Erreur chargement donnée (Fallback)', { type: 'warning' });
                });
        }
    }, [error, data, isLoading, resource, id, fallbackData, notify, params, dataProvider]);

    const effectiveData = data || fallbackData;

    return {
        data: effectiveData as RecordType,
        isLoading: isLoading && !effectiveData,
        error: error
    };
};
