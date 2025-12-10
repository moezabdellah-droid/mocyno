import { useGetList, useNotify } from 'react-admin';
import { useEffect, useState, useRef } from 'react';
import dataProvider from '../providers/dataProvider';

export interface RobustGetListResult<RecordType = any> {
    data?: RecordType[];
    total?: number;
    isLoading: boolean;
    error?: any;
}

export const useRobustGetList = <RecordType = any>(
    resource: string,
    params: any
): RobustGetListResult<RecordType> => {
    const { data, isLoading, error } = useGetList<RecordType>(resource, params);
    const [fallbackData, setFallbackData] = useState<RecordType[]>([]);
    const notify = useNotify();

    // Use useRef to track if fallback has been triggered to avoid dependency loops and re-renders
    const fallbackTriggered = useRef(false);

    useEffect(() => {
        // Condition: Error detected OR (No data loaded and not strictly loading from hook??)
        // React 19 issue: isLoading might be false but data is undefined/empty when it shouldn't be.
        if ((error || (data === undefined && !isLoading)) && !fallbackData.length && !fallbackTriggered.current) {
            fallbackTriggered.current = true; // Mark as triggered immediately

            // Fallback : appel direct dataProvider
            dataProvider.getList(resource, params)
                .then(({ data }) => {
                    setFallbackData(data as RecordType[]);
                })
                .catch(err => {
                    console.error(`[useRobustGetList] Fallback failed for ${resource}`, err);
                    notify('Erreur chargement données', { type: 'error' });
                });
        }
    }, [error, data, isLoading, resource, JSON.stringify(params), fallbackData.length, notify]);

    const effectiveData = data?.length ? data : fallbackData;

    // Total calculation
    const total = data?.length || fallbackData.length;

    return {
        data: effectiveData,
        isLoading: isLoading && !effectiveData.length, // Only loading if we have NO data from either source
        total: total,
        error: error
    };
};
