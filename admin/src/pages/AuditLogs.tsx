import {
    Datagrid, List, TextField, DateField, SelectInput,
    FunctionField, useListContext,
} from 'react-admin';
import { Alert, Box, Typography } from '@mui/material';

const actionChoices = [
    { id: 'createAgent', name: 'Création agent' },
    { id: 'createClient', name: 'Création client' },
    { id: 'updateAgentPassword', name: 'Changement MDP' },
    { id: 'generateMatricule', name: 'Génération matricule' },
];

const targetTypeChoices = [
    { id: 'agent', name: 'Agent' },
    { id: 'client', name: 'Client' },
];

// actorUid et targetId retirés des filtres serveur : TextInput exact-match libres,
// aucun index auditLogs/actorUid+createdAt ni targetId+createdAt déclaré.
// action et targetType conservés : SelectInputs bornés, index composites déclarés.
const filters = [
    <SelectInput key="action" source="action" label="Action" choices={actionChoices} alwaysOn />,
    <SelectInput key="targetType" source="targetType" label="Cible" choices={targetTypeChoices} />,
];

const actionLabel = (action: string | undefined): string => {
    const a = actionChoices.find(c => c.id === action);
    return a ? a.name : (action || '—');
};

/**
 * Affiche une vraie erreur Firestore ou un message "aucun log" propre.
 */
const AuditLogsEmptyOrError = () => {
    const { error, isPending } = useListContext();

    if (isPending) return null;

    if (error) {
        const message =
            error instanceof Error
                ? error.message
                : 'Erreur inconnue lors du chargement des logs.';

        return (
            <Box p={2}>
                <Alert severity="error">
                    <Typography variant="body1" fontWeight={600}>
                        Impossible de charger les logs d'audit.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        La requête Firestore a échoué. Vérifie les index composites de la collection <strong>auditLogs</strong>.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {message}
                    </Typography>
                </Alert>
            </Box>
        );
    }

    return (
        <Box p={2}>
            <Alert severity="info">
                Aucun log ne correspond aux filtres actuels.
            </Alert>
        </Box>
    );
};

/**
 * A27 — AuditLog resource (read-only)
 * Displays structured audit entries from the auditLogs collection.
 */
export const AuditLogList = () => (
    <List
        resource="auditLogs"
        filters={filters}
        sort={{ field: 'createdAt', order: 'DESC' }}
        perPage={25}
        empty={<AuditLogsEmptyOrError />}
        queryOptions={{ retry: false }}
    >
        <Datagrid bulkActionButtons={false}>
            <DateField source="createdAt" label="Date" showTime />
            <FunctionField label="Action" sortable={false} render={(r: { action?: string }) => actionLabel(r.action)} />
            <TextField source="actorUid" label="Auteur" sortable={false} />
            <TextField source="actorRole" label="Rôle" sortable={false} />
            <TextField source="targetType" label="Type cible" sortable={false} />
            <TextField source="targetId" label="ID cible" sortable={false} />
            <TextField source="summary" label="Résumé" sortable={false} />
        </Datagrid>
    </List>
);
