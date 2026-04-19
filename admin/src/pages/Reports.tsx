import {
    Datagrid,
    List,
    TextField,
    DateField,
    SelectInput,
    TextInput,
    FunctionField,
    Show,
    SimpleShowLayout,
    Edit,
    SimpleForm,
    ShowButton,
    EditButton,
    useRecordContext,
    useListContext,
} from 'react-admin';
import { Alert, Box, Typography } from '@mui/material';
import { AdminCommentThread } from '../components/AdminCommentThread';

const statusChoices = [
    { id: 'open', name: '🔴 Ouvert' },
    { id: 'in_progress', name: '🟠 En cours' },
    { id: 'resolved', name: '🟢 Résolu' },
    { id: 'closed', name: '⚫ Clôturé' },
];

const sourceChoices = [
    { id: 'client', name: 'Client' },
    { id: 'admin', name: 'Admin' },
];

const severityChoices = [
    { id: 'low', name: 'Faible' },
    { id: 'medium', name: 'Moyen' },
    { id: 'high', name: 'Élevé' },
    { id: 'critical', name: 'Critique' },
];

const typeChoices = [
    { id: 'intrusion', name: 'Intrusion' },
    { id: 'degradation', name: 'Dégradation' },
    { id: 'vol', name: 'Vol' },
    { id: 'incident_technique', name: 'Incident technique' },
    { id: 'comportement', name: 'Comportement suspect' },
    { id: 'autre', name: 'Autre' },
];

// siteName retiré des filtres serveur : filtre texte exact-match fragile,
// source de combinaisons d'index non couvertes. Colonne conservée dans le tableau.
const filters = [
    <SelectInput key="source" source="source" label="Origine" choices={sourceChoices} alwaysOn />,
    <SelectInput key="status" source="status" label="Statut" choices={statusChoices} alwaysOn />,
    <TextInput key="clientId" source="clientId" label="Client ID" />,
    <SelectInput key="severity" source="severity" label="Gravité" choices={severityChoices} />,
    <SelectInput key="type" source="type" label="Type" choices={typeChoices} />,
];

const statusLabel = (status: string | undefined): string => {
    const s = statusChoices.find(c => c.id === status);
    return s ? s.name : (status || '—');
};

const severityLabel = (severity: string | undefined): string => {
    const s = severityChoices.find(c => c.id === severity);
    return s ? s.name : (severity || '—');
};

/**
 * Affiche une vraie erreur Firestore ou un message "aucun résultat" propre.
 * Remplace le comportement par défaut qui masquait les erreurs backend
 * comme un faux résultat vide ("No incidents found").
 */
const ReportsEmptyOrError = () => {
    const { error, isPending } = useListContext();

    if (isPending) return null;

    if (error) {
        const message =
            error instanceof Error
                ? error.message
                : 'Erreur inconnue lors du chargement des incidents.';

        return (
            <Box p={2}>
                <Alert severity="error">
                    <Typography variant="body1" fontWeight={600}>
                        Impossible de charger les incidents.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        La requête Firestore a échoué. Vérifie les index composites de la collection <strong>reports</strong>.
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
                Aucun incident ne correspond aux filtres actuels.
            </Alert>
        </Box>
    );
};

/**
 * A23 — Admin resource for client incidents (reports collection)
 */
export const ReportList = () => (
    <List
        resource="reports"
        filters={filters}
        sort={{ field: 'createdAt', order: 'DESC' }}
        perPage={25}
        empty={<ReportsEmptyOrError />}
        queryOptions={{ retry: false }}
    >
        <Datagrid rowClick="show" bulkActionButtons={false}>
            <TextField source="title" label="Titre" sortable={false} />
            <FunctionField label="Statut" render={(r: { status?: string }) => statusLabel(r.status)} sortable={false} />
            <FunctionField label="Gravité" render={(r: { severity?: string }) => severityLabel(r.severity)} sortable={false} />
            <TextField source="type" label="Type" sortable={false} />
            <TextField source="siteName" label="Site" sortable={false} />
            <TextField source="source" label="Origine" sortable={false} />
            <TextField source="clientId" label="Client ID" sortable={false} />
            <FunctionField label="📎" render={(r: { attachmentUrl?: string }) => (r.attachmentUrl ? '📎' : '')} sortable={false} />
            <DateField source="createdAt" label="Date" showTime />
            <ShowButton />
            <EditButton />
        </Datagrid>
    </List>
);

const ReportShowContent = () => {
    const record = useRecordContext();

    return (
        <SimpleShowLayout>
            <TextField source="id" label="Report ID" />
            <TextField source="title" label="Titre" />
            <FunctionField label="Statut" render={(r: { status?: string }) => statusLabel(r.status)} />
            <FunctionField label="Gravité" render={(r: { severity?: string }) => severityLabel(r.severity)} />
            <TextField source="type" label="Type" />
            <TextField source="siteName" label="Site" />
            <TextField source="siteId" label="Site ID" />
            <TextField source="source" label="Origine" />
            <TextField source="clientId" label="Client ID" />
            <TextField source="createdBy" label="Créé par" />
            <DateField source="createdAt" label="Date" showTime />
            <TextField source="description" label="Description" />
            <FunctionField
                label="Pièce jointe"
                render={(r: { attachmentUrl?: string; attachmentName?: string }) =>
                    r.attachmentUrl ? (
                        <a href={r.attachmentUrl} target="_blank" rel="noreferrer">
                            📎 {r.attachmentName || 'Télécharger'}
                        </a>
                    ) : (
                        '—'
                    )
                }
            />
            {record?.id && <AdminCommentThread parentCollection="reports" parentId={record.id as string} />}
        </SimpleShowLayout>
    );
};

export const ReportShow = () => (
    <Show resource="reports">
        <ReportShowContent />
    </Show>
);

export const ReportEdit = () => (
    <Edit resource="reports">
        <SimpleForm>
            <TextField source="title" label="Titre" />
            <TextField source="siteName" label="Site" />
            <TextField source="source" label="Origine" />
            <TextField source="clientId" label="Client ID" />
            <DateField source="createdAt" label="Date" showTime />
            <SelectInput source="status" label="Statut" choices={statusChoices} fullWidth />
            <SelectInput source="severity" label="Gravité" choices={severityChoices} fullWidth />
        </SimpleForm>
    </Edit>
);
