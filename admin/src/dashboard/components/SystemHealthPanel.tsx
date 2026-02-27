import * as React from 'react';
import {
    Box, Typography, Button, CircularProgress, Alert, Divider, Chip
} from '@mui/material';
import { useGetList, useGetOne, useRefresh } from 'react-admin';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

type HealthPanelProps = {
    buildId: string;
    locationSearch: string;
};

/**
 * SystemHealthPanel — affiché uniquement quand defaults == null.
 * Montre l'état réel de Firestore (planning, shifts, stats_meta)
 * et offre 2 boutons admin: Rebuild All Shifts + Init stats_meta.
 */
export function SystemHealthPanel({ buildId, locationSearch }: HealthPanelProps) {
    const [rebuilding, setRebuilding] = React.useState(false);
    const [initingMeta, setInitingMeta] = React.useState(false);
    const [result, setResult] = React.useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const refresh = useRefresh();

    // Health probes
    const planningProbe = useGetList('planning', {
        pagination: { page: 1, perPage: 1 }, sort: { field: 'id', order: 'ASC' }, filter: {},
    });
    const shiftsProbe = useGetList('shifts', {
        pagination: { page: 1, perPage: 1 }, sort: { field: 'dayKey', order: 'DESC' }, filter: {},
    });
    const metaProbe = useGetOne<any>('stats_meta', { id: 'current' });

    // Probes counts (reliable check: at least 1 doc)
    const planningCount = planningProbe.data?.length ?? 0;
    const shiftsCount = shiftsProbe.data?.length ?? 0;

    // Use getApp() for robust projectId retrieval
    const projectId = getApp().options.projectId ?? 'unknown';

    // Helper for readable errors
    const errToString = (e: any) => e ? (e.message ?? e.code ?? JSON.stringify(e)) : null;

    const health = {
        firebaseProjectId: projectId,
        functionsRegion: 'europe-west1',
        functions: {
            rebuild: 'adminRebuildShiftsFromPlanning',
            initMeta: 'adminInitStatsMeta',
        },
        build: buildId,
        url: locationSearch,
        planning: {
            isLoading: planningProbe.isLoading,
            error: errToString(planningProbe.error),
            count: planningCount,
            firstId: planningProbe.data?.[0]?.id ?? null,
        },
        shifts: {
            isLoading: shiftsProbe.isLoading,
            error: errToString(shiftsProbe.error),
            count: shiftsCount,
            latestDayKey: shiftsProbe.data?.[0]?.dayKey ?? null,
        },
        stats_meta: {
            isLoading: metaProbe.isLoading,
            error: errToString(metaProbe.error),
            latestDayKey: (metaProbe.data as any)?.latestDayKey ?? null,
            latestMonthKey: (metaProbe.data as any)?.latestMonthKey ?? null,
        },
    };

    async function handleRebuildShifts() {
        setRebuilding(true);
        setResult(null);
        try {
            const fns = getFunctions(getApp(), 'europe-west1');
            const fn = httpsCallable(fns, health.functions.rebuild);
            const res: any = await fn({});
            setResult({ type: 'success', msg: `✅ ${res.data.shiftsUpserted} shifts créés. latestDayKey=${res.data.latestDayKey} — Dashboard rafraîchi.` });
            refresh();
            setTimeout(() => refresh(), 250);
        } catch (e: any) {
            const code = e?.code ?? 'unknown';
            const msg = e?.message ?? String(e);
            const details = e?.details ? JSON.stringify(e.details) : '';
            const stack = e?.stack ? `\n${e.stack}` : '';
            setResult({ type: 'error', msg: `❌ [${code}] ${msg} ${details}${stack}` });
        } finally {
            setRebuilding(false);
        }
    }

    async function handleInitStatsMeta() {
        setInitingMeta(true);
        setResult(null);
        try {
            const fns = getFunctions(getApp(), 'europe-west1');
            const fn = httpsCallable(fns, health.functions.initMeta);
            const res: any = await fn({});
            setResult({ type: 'success', msg: `✅ stats_meta/current: latestDayKey=${res.data.latestDayKey} — Dashboard rafraîchi.` });
            refresh();
            setTimeout(() => refresh(), 250);
        } catch (e: any) {
            const code = e?.code ?? 'unknown';
            const msg = e?.message ?? String(e);
            const details = e?.details ? JSON.stringify(e.details) : '';
            const stack = e?.stack ? `\n${e.stack}` : '';
            setResult({ type: 'error', msg: `❌ [${code}] ${msg} ${details}${stack}` });
        } finally {
            setInitingMeta(false);
        }
    }

    return (
        <Box sx={{ p: 3, maxWidth: 900 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>Dashboard defaults introuvables</strong> — aucune donnée de date disponible dans ce projet Firebase.
                Utilisez les boutons ci-dessous pour initialiser les données.
            </Alert>

            {/* Diagnostic JSON */}
            <Box
                component="pre"
                sx={{
                    whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12,
                    bgcolor: '#1a1a2e', color: '#e2e2e2', p: 2, borderRadius: 1,
                    border: '1px solid #333', mb: 2,
                }}
            >
                {JSON.stringify(health, null, 2)}
            </Box>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
                <Chip
                    label={`planning: ${health.planning.count} docs`}
                    color={health.planning.count > 0 ? 'success' : 'warning'}
                    size="small"
                />
                <Chip
                    label={`shifts: ${health.shifts.count} docs`}
                    color={health.shifts.count > 0 ? 'success' : 'error'}
                    size="small"
                />
                <Chip
                    label={`stats_meta: ${health.stats_meta.latestDayKey ?? 'absent'}`}
                    color={health.stats_meta.latestDayKey ? 'success' : 'error'}
                    size="small"
                />
                <Chip
                    label={`build: ${health.build}`}
                    color="secondary"
                    variant="outlined"
                    size="small"
                />
                <Chip
                    label={`project: ${health.firebaseProjectId}`}
                    color="info"
                    size="small"
                />
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                💡 <strong>Étape 1</strong> : Rebuild shifts (génère tous les shifts depuis planning).&nbsp;
                <strong>Étape 2</strong> : Init stats_meta/current (calcule latestDayKey).&nbsp;
                Ensuite rechargez la page.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleRebuildShifts}
                    disabled={rebuilding || initingMeta || health.planning.count === 0}
                    startIcon={rebuilding ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {rebuilding ? 'Reconstruction…' : '1) Rebuild shifts depuis planning'}
                </Button>

                <Button
                    variant="outlined"
                    color="secondary"
                    onClick={handleInitStatsMeta}
                    disabled={rebuilding || initingMeta || health.shifts.count === 0}
                    startIcon={initingMeta ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {initingMeta ? 'Initialisation…' : '2) Init stats_meta/current'}
                </Button>
            </Box>

            {result && (
                <Alert severity={result.type === 'success' ? 'success' : 'error'} sx={{ mt: 2 }}>
                    {result.msg}
                    {result.type === 'success' && (
                        <span> — <strong>Si nécessaire</strong>, rechargez la page.</span>
                    )}
                </Alert>
            )}
        </Box>
    );
}
