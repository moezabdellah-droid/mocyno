import {
    Datagrid, List, TextField, DateField, SelectInput, TextInput,
    FunctionField, Show, SimpleShowLayout, Edit, SimpleForm,
    ShowButton, EditButton
} from 'react-admin';

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

const filters = [
    <TextInput key="clientId" source="clientId" label="Client ID" alwaysOn />,
    <SelectInput key="status" source="status" label="Statut" choices={statusChoices} alwaysOn />,
    <SelectInput key="priority" source="priority" label="Priorité" choices={priorityChoices} />,
    <TextInput key="category" source="category" label="Catégorie" />,
    <TextInput key="siteName" source="siteName" label="Site" />,
];

/**
 * A23 — Enhanced ClientRequests with show + edit for treatment workflow
 */
export const ClientRequestList = () => (
    <List resource="clientRequests" filters={filters} sort={{ field: 'createdAt', order: 'DESC' }} perPage={25}>
        <Datagrid rowClick="show" bulkActionButtons={false}>
            <TextField source="title" label="Titre" />
            <FunctionField label="Statut" render={(r: { status?: string }) => statusLabel(r.status)} />
            <FunctionField label="Priorité" render={(r: { priority?: string }) => priorityLabel(r.priority)} />
            <TextField source="category" label="Catégorie" />
            <TextField source="siteName" label="Site" />
            <TextField source="clientId" label="Client ID" />
            <FunctionField label="📎" render={(r: { attachmentUrl?: string }) => r.attachmentUrl ? '📎' : ''} />
            <DateField source="createdAt" label="Date" showTime />
            <ShowButton />
            <EditButton />
        </Datagrid>
    </List>
);

export const ClientRequestShow = () => (
    <Show resource="clientRequests">
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
        </SimpleShowLayout>
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
