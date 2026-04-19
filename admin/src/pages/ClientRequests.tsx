import {
    Datagrid, List, TextField, DateField, SelectInput, TextInput,
    FunctionField, Show, SimpleShowLayout, Edit, SimpleForm,
    ShowButton, EditButton, useRecordContext, useListContext,
} from 'react-admin';
import { Alert, Box, Typography } from '@mui/material';
import { AdminCommentThread } from '../components/AdminCommentThread';

const statusChoices = [
    { id: 'pending', name: '🟡 En attente' },
    { id: 'in_progress', name: '🟠 En cours' },
    { id: 'resolved', name: '🟢 Résolu' },
    { id: 'closed', name: '⚫ Clôturé' },
];

const priorityChoices = [
    { id: 'normal', name: 'Normale' },
    { id: 'high', name: '⚠️ Haute' },
    { id: 'urgent', name: '🔴 Urgente' },
];

const statusLabel = (status: string | undefined): string => {
    const s = statusChoices.find(c => c.id === status);
    return s ? s.name : (status || '—');
};

const priorityLabel = (priority: string | undefined): string => {
    const s = priorityChoices.find(c => c.id === priority);
    return s ? s.name : (priority || '—');
};

// priority, category, siteName retirés des filtres serveur :
// champs texte libres non couverts par index composite, exact-match fragile.
// Colonnes conservées dans le tableau pour la lecture.
const filters = [
    <TextInput key="clientId" source="clientId" label="Client ID" alwaysOn />,
    <SelectInput key="status" source="status" label="Statut" choices={statusChoices} alwaysOn />,
];

/**
 * Affiche une vraie erreur Firestore ou un message "aucune demande" propre.
 * Évite le masquage silencieux d'une erreur backend en faux résultat vide.
 */
const ClientRequestsEmptyOrError = () => {
    const { error, isPending } = useListContext();

    if (isPending) return null;

    if (error) {
        const message =
            error instanceof Error
                ? error.message
                : 'Erreur inconnue lors du chargement des demandes.';

        return (
            <Box p={2}>
                <Alert severity="error">
                    <Typography variant="body1" fontWeight={600}>
                        Impossible de charger les demandes client.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        La requête Firestore a échoué. Vérifie les index composites de la collection <strong>clientRequests</strong>.
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
                Aucune demande ne correspond aux filtres actuels.
            </Alert>
        </Box>
    );
};

/**
 * A23 — Enhanced ClientRequests with show + edit for treatment workflow
 */
export const ClientRequestList = () => (
    <List
        resource="clientRequests"
        filters={filters}
        sort={{ field: 'createdAt', order: 'DESC' }}
        perPage={25}
        empty={<ClientRequestsEmptyOrError />}
        queryOptions={{ retry: false }}
    >
        <Datagrid rowClick="show" bulkActionButtons={false}>
            <TextField source="title" label="Titre" sortable={false} />
            <FunctionField label="Statut" render={(r: { status?: string }) => statusLabel(r.status)} sortable={false} />
            <FunctionField label="Priorité" render={(r: { priority?: string }) => priorityLabel(r.priority)} sortable={false} />
            <TextField source="category" label="Catégorie" sortable={false} />
            <TextField source="siteName" label="Site" sortable={false} />
            <TextField source="clientId" label="Client ID" sortable={false} />
            <FunctionField label="📎" render={(r: { attachmentUrl?: string }) => r.attachmentUrl ? '📎' : ''} sortable={false} />
            <DateField source="createdAt" label="Date" showTime />
            <ShowButton />
            <EditButton />
        </Datagrid>
    </List>
);

const ClientRequestShowContent = () => {
    const record = useRecordContext();
    return (
        <SimpleShowLayout>
            <TextField source="id" label="Demande ID" />
            <TextField source="title" label="Titre" />
            <FunctionField label="Statut" render={(r: { status?: string }) => statusLabel(r.status)} />
            <FunctionField label="Priorité" render={(r: { priority?: string }) => priorityLabel(r.priority)} />
            <TextField source="category" label="Catégorie" />
            <TextField source="siteName" label="Site" />
            <TextField source="siteId" label="Site ID" />
            <TextField source="clientId" label="Client ID" />
            <DateField source="createdAt" label="Date" showTime />
            <TextField source="message" label="Message" sx={{ whiteSpace: 'pre-wrap' }} />
            <FunctionField
                label="Pièce jointe"
                render={(r: { attachmentUrl?: string; attachmentName?: string }) =>
                    r.attachmentUrl
                        ? <a href={r.attachmentUrl} target="_blank" rel="noreferrer">📎 {r.attachmentName || 'Télécharger'}</a>
                        : '—'
                }
            />
            {record?.id && <AdminCommentThread parentCollection="clientRequests" parentId={record.id as string} />}
        </SimpleShowLayout>
    );
};

export const ClientRequestShow = () => (
    <Show resource="clientRequests">
        <ClientRequestShowContent />
    </Show>
);

export const ClientRequestEdit = () => (
    <Edit resource="clientRequests">
        <SimpleForm>
            <TextField source="title" label="Titre" />
            <TextField source="siteName" label="Site" />
            <TextField source="clientId" label="Client ID" />
            <TextField source="message" label="Message" sx={{ whiteSpace: 'pre-wrap' }} />
            <DateField source="createdAt" label="Date" showTime />
            <SelectInput source="status" label="Statut" choices={statusChoices} fullWidth />
            <SelectInput source="priority" label="Priorité" choices={priorityChoices} fullWidth />
        </SimpleForm>
    </Edit>
);
