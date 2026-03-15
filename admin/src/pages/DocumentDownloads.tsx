import {
    List,
    Datagrid,
    TextField,
    DateField,
    TextInput,
    SelectInput,
} from 'react-admin';

const downloadFilters = [
    <TextInput key="clientId" source="clientId" label="Client ID" alwaysOn />,
    <TextInput key="documentName" source="documentName" label="Document" />,
    <SelectInput key="callerRole" source="callerRole" label="Rôle" choices={[
        { id: 'client', name: 'Client' },
        { id: 'admin', name: 'Admin' },
        { id: 'manager', name: 'Manager' },
    ]} />,
];

/**
 * R15 — DocumentDownloads admin list
 * Traçabilité des téléchargements documentaires client.
 */
export const DocumentDownloadList = () => (
    <List
        resource="documentDownloads"
        sort={{ field: 'downloadedAt', order: 'DESC' }}
        filters={downloadFilters}
        perPage={25}
    >
        <Datagrid bulkActionButtons={false}>
            <TextField source="documentName" label="Document" />
            <TextField source="documentType" label="Type" />
            <TextField source="clientId" label="Client ID" />
            <TextField source="callerRole" label="Rôle" />
            <TextField source="callerUid" label="UID" />
            <DateField source="downloadedAt" label="Date" showTime />
        </Datagrid>
    </List>
);

export default DocumentDownloadList;
