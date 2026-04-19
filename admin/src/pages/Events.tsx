import {
    Datagrid,
    List,
    TextField,
    DateField,
    FunctionField,
    Show,
    SimpleShowLayout,
    SelectInput,
    useListContext,
} from 'react-admin';
import { Alert, Box, Typography } from '@mui/material';
import type { Event } from '@mocyno/types';

const typeChoices = [
    { id: 'SOS', name: '🚨 SOS' },
    { id: 'INCIDENT', name: '🔥 Incident' },
    { id: 'MAIN_COURANTE', name: '📝 Main courante' },
    { id: 'OBSERVATION', name: '👁️ Observation' },
    { id: 'RDL_CHECKPOINT', name: '📍 Checkpoint' },
    { id: 'SERVICE_START', name: '▶️ Prise de service' },
    { id: 'SERVICE_STOP', name: '⏹️ Fin de service' },
];

const statusChoices = [
    { id: 'OPEN', name: 'Ouvert' },
    { id: 'CLOSED', name: 'Fermé' },
    { id: 'VALIDATED', name: 'Validé' },
];

// agentName et siteName retirés des filtres serveur :
// TextInput exact-match libre, aucun index events/agentName+timestamp
// ni events/siteName+timestamp déclaré. Colonnes conservées dans le tableau.
const eventFilters = [
    <SelectInput key="type" source="type" label="Type" choices={typeChoices} alwaysOn />,
    <SelectInput key="status" source="status" label="Statut" choices={statusChoices} />,
];

const typeLabels: Record<string, string> = {
    SOS: '🚨 SOS',
    INCIDENT: '🔥 Incident',
    MAIN_COURANTE: '📝 Main courante',
    OBSERVATION: '👁️ Observation',
    RDL_CHECKPOINT: '📍 Checkpoint',
    SERVICE_START: '▶️ Prise de service',
    SERVICE_STOP: '⏹️ Fin de service',
};

/**
 * Affiche une vraie erreur Firestore ou un message "aucun événement" propre.
 * Évite le masquage silencieux d'une erreur backend en faux résultat vide.
 */
const EventsEmptyOrError = () => {
    const { error, isPending } = useListContext();

    if (isPending) return null;

    if (error) {
        const message =
            error instanceof Error
                ? error.message
                : 'Erreur inconnue lors du chargement des événements.';

        return (
            <Box p={2}>
                <Alert severity="error">
                    <Typography variant="body1" fontWeight={600}>
                        Impossible de charger la main courante.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        La requête Firestore a échoué. Vérifie les index composites de la collection <strong>events</strong>.
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
                Aucun événement ne correspond aux filtres actuels.
            </Alert>
        </Box>
    );
};

export const EventList = () => (
    <List
        resource="events"
        filters={eventFilters}
        sort={{ field: 'timestamp', order: 'DESC' }}
        empty={<EventsEmptyOrError />}
        queryOptions={{ retry: false }}
    >
        <Datagrid rowClick="show">
            <FunctionField
                label="Type"
                sortable={false}
                render={(record: Event) => typeLabels[record.type || ''] || record.type || '—'}
            />
            <TextField source="agentName" label="Agent" sortable={false} />
            <TextField source="siteName" label="Site" sortable={false} />
            <TextField source="title" label="Titre" sortable={false} />
            <FunctionField
                label="Priorité"
                sortable={false}
                render={(record: Event) => record.priority === 'CRITICAL' ? '🔴 Critique' : '—'}
            />
            <TextField source="status" label="Statut" sortable={false} />
            <DateField source="timestamp" showTime label="Date" />
        </Datagrid>
    </List>
);

export const EventShow = () => (
    <Show resource="events">
        <SimpleShowLayout>
            <FunctionField label="Type" render={(record: Event) =>
                typeLabels[record.type || ''] || record.type || '—'
            } />
            <TextField source="title" variant="h4" />
            <DateField source="timestamp" showTime />
            <TextField source="agentName" label="Agent" />
            <TextField source="siteName" label="Site" />
            <TextField source="authorEmail" label="Email" />
            <TextField source="status" label="Statut" />
            <FunctionField label="Priorité" render={(record: Event) =>
                record.priority === 'CRITICAL' ? '🔴 CRITIQUE' : '—'
            } />
            <TextField source="description" style={{ marginTop: '20px', whiteSpace: 'pre-wrap' }} />
            <FunctionField label="Localisation" render={(record: Event) => {
                if (!record.location) return null;
                return `${record.location.lat}, ${record.location.lng}`;
            }} />
            <FunctionField
                label="Preuve Photo"
                render={(record: Event) => {
                    if (!record.photo) return null;
                    return (
                        <div style={{ marginTop: '20px' }}>
                            <img src={record.photo} alt="Preuve" style={{ maxWidth: '500px', borderRadius: '4px' }} />
                        </div>
                    );
                }}
            />
        </SimpleShowLayout>
    </Show>
);
