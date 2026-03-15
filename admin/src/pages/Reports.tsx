import {
    Datagrid, List, TextField, DateField, SelectInput, TextInput,
    FunctionField, Show, SimpleShowLayout, Edit, SimpleForm,
    ShowButton, EditButton, useRecordContext
} from 'react-admin';
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

const filters = [
    <SelectInput key="source" source="source" label="Origine" choices={sourceChoices} alwaysOn />,
    <SelectInput key="status" source="status" label="Statut" choices={statusChoices} alwaysOn />,
    <TextInput key="clientId" source="clientId" label="Client ID" />,
    <SelectInput key="severity" source="severity" label="Gravité" choices={severityChoices} />,
    <SelectInput key="type" source="type" label="Type" choices={typeChoices} />,
    <TextInput key="siteName" source="siteName" label="Site" />,
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
 * A23 — Admin resource for client incidents (reports collection)
 */
export const ReportList = () => (
    <List resource="reports" filters={filters} sort={{ field: 'createdAt', order: 'DESC' }} perPage={25}>
        <Datagrid rowClick="show" bulkActionButtons={false}>
            <TextField source="title" label="Titre" />
            <FunctionField label="Statut" render={(r: { status?: string }) => statusLabel(r.status)} />
            <FunctionField label="Gravité" render={(r: { severity?: string }) => severityLabel(r.severity)} />
            <TextField source="type" label="Type" />
            <TextField source="siteName" label="Site" />
            <TextField source="source" label="Origine" />
            <TextField source="clientId" label="Client ID" />
            <FunctionField label="📎" render={(r: { attachmentUrl?: string }) => r.attachmentUrl ? '📎' : ''} />
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
                    r.attachmentUrl
                        ? <a href={r.attachmentUrl} target="_blank" rel="noreferrer">📎 {r.attachmentName || 'Télécharger'}</a>
                        : '—'
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
