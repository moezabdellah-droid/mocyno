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

    const fallbackTriggered = useRef(false);

    // Reset fallback trigger if params change (using stringify for deep compare)
    const paramsStr = JSON.stringify(params);
    useEffect(() => {
        fallbackTriggered.current = false;
    }, [resource, paramsStr]);

    useEffect(() => {
        // Trigger fallback if error exists OR (not loading AND (no data OR empty data))
        // React 19 issue: Hook might return empty array silently. We double-check with direct provider.
        const shouldFallback = error || (!isLoading && (!data || data.length === 0));
        const hasFallbackData = fallbackData.length > 0;

        if (shouldFallback && !hasFallbackData && !fallbackTriggered.current) {
            fallbackTriggered.current = true;

            dataProvider.getList(resource, params)
                .then(({ data: resultData }) => {
                    setFallbackData(resultData as RecordType[]);
                })
                .catch(err => {
                    console.error(`[useRobustGetList] Fallback failed for ${resource}`, err);
                    notify('Erreur chargement données (Fallback)', { type: 'warning' });
                });
        }
    }, [error, data, isLoading, resource, paramsStr, fallbackData.length, notify]);

    const effectiveData = (data && data.length > 0) ? data : fallbackData;
    const total = (data && data.length > 0) ? data.length : fallbackData.length;

    return {
        data: effectiveData,
        isLoading: isLoading && effectiveData.length === 0,
        total: total,
        error: error
    };
};
