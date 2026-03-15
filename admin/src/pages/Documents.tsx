import {
    Datagrid, List, TextField, DateField, TextInput, SelectInput,
    FunctionField, Show, SimpleShowLayout, ShowButton
} from 'react-admin';

const visibilityChoices = [
    { id: 'true', name: 'Visible client' },
    { id: 'false', name: 'Interne seulement' },
];

const filters = [
    <TextInput key="clientId" source="clientId" label="Client ID" alwaysOn />,
    <TextInput key="name" source="name" label="Nom" />,
    <TextInput key="type" source="type" label="Type" />,
];

/**
 * A23 — Admin resource for client documents
 */
export const DocumentList = () => (
    <List resource="documents" filters={filters} sort={{ field: 'createdAt', order: 'DESC' }} perPage={25}>
        <Datagrid rowClick="show" bulkActionButtons={false}>
            <TextField source="name" label="Nom" />
            <TextField source="type" label="Type" />
            <TextField source="clientId" label="Client ID" />
            <FunctionField
                label="Visible client"
                render={(r: { visibility?: { client?: boolean } }) =>
                    r.visibility?.client ? '✅ Oui' : '❌ Non'
                }
            />
            <DateField source="createdAt" label="Date" showTime />
            <ShowButton />
        </Datagrid>
    </List>
);

export const DocumentShow = () => (
    <Show resource="documents">
        <SimpleShowLayout>
            <TextField source="id" label="Document ID" />
            <TextField source="name" label="Nom" />
            <TextField source="type" label="Type" />
            <TextField source="clientId" label="Client ID" />
            <FunctionField
                label="Visible client"
                render={(r: { visibility?: { client?: boolean } }) =>
                    r.visibility?.client ? '✅ Oui' : '❌ Non'
                }
            />
            <TextField source="storagePath" label="Chemin stockage" />
            <DateField source="createdAt" label="Date" showTime />
        </SimpleShowLayout>
    </Show>
);
