
import { Datagrid, List, TextField, DateField, FunctionField, Show, SimpleShowLayout, SelectInput, TextInput } from 'react-admin';
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

const eventFilters = [
    <SelectInput key="type" source="type" label="Type" choices={typeChoices} alwaysOn />,
    <SelectInput key="status" source="status" label="Statut" choices={statusChoices} />,
    <TextInput key="agentName" source="agentName" label="Agent" />,
    <TextInput key="siteName" source="siteName" label="Site" />,
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

export const EventList = () => (
    <List resource="events" filters={eventFilters} sort={{ field: 'timestamp', order: 'DESC' }}>
        <Datagrid rowClick="show">
            <FunctionField label="Type" render={(record: Event) =>
                typeLabels[record.type || ''] || record.type || '—'
            } />
            <TextField source="agentName" label="Agent" />
            <TextField source="siteName" label="Site" />
            <TextField source="title" label="Titre" />
            <FunctionField label="Priorité" render={(record: Event) =>
                record.priority === 'CRITICAL' ? '🔴 Critique' : '—'
            } />
            <TextField source="status" label="Statut" />
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
