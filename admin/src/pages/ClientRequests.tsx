import { Datagrid, List, TextField, DateField, SelectInput, TextInput, FunctionField } from 'react-admin';

const statusChoices = [
    { id: 'pending', name: 'En attente' },
    { id: 'in_progress', name: 'En cours' },
    { id: 'resolved', name: 'Résolu' },
    { id: 'closed', name: 'Clôturé' },
];

const filters = [
    <TextInput key="clientId" source="clientId" label="Client ID" alwaysOn />,
    <SelectInput key="status" source="status" label="Statut" choices={statusChoices} alwaysOn />,
    <TextInput key="category" source="category" label="Catégorie" />,
    <TextInput key="siteName" source="siteName" label="Site" />,
];

/**
 * R17 — Admin list for client requests
 */
export const ClientRequestList = () => (
    <List resource="clientRequests" filters={filters} sort={{ field: 'createdAt', order: 'DESC' }}>
        <Datagrid bulkActionButtons={false}>
            <TextField source="title" label="Titre" />
            <FunctionField
                label="Statut"
                render={(record: { status?: string }) => {
                    const map: Record<string, string> = { pending: 'En attente', in_progress: 'En cours', resolved: 'Résolu', closed: 'Clôturé' };
                    return map[record.status || ''] || record.status;
                }}
            />
            <TextField source="priority" label="Priorité" />
            <TextField source="category" label="Catégorie" />
            <TextField source="siteName" label="Site" />
            <TextField source="clientId" label="Client ID" />
            <DateField source="createdAt" label="Date" showTime />
            <TextField source="message" label="Message" />
        </Datagrid>
    </List>
);
