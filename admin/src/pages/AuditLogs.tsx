import {
    Datagrid, List, TextField, DateField, SelectInput, TextInput,
    FunctionField
} from 'react-admin';

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

const filters = [
    <SelectInput key="action" source="action" label="Action" choices={actionChoices} alwaysOn />,
    <SelectInput key="targetType" source="targetType" label="Cible" choices={targetTypeChoices} />,
    <TextInput key="actorUid" source="actorUid" label="Auteur UID" />,
    <TextInput key="targetId" source="targetId" label="Cible ID" />,
];

const actionLabel = (action: string | undefined): string => {
    const a = actionChoices.find(c => c.id === action);
    return a ? a.name : (action || '—');
};

/**
 * A27 — AuditLog resource (read-only)
 * Displays structured audit entries from the auditLogs collection.
 */
export const AuditLogList = () => (
    <List resource="auditLogs" filters={filters} sort={{ field: 'createdAt', order: 'DESC' }} perPage={25}>
        <Datagrid bulkActionButtons={false}>
            <DateField source="createdAt" label="Date" showTime />
            <FunctionField label="Action" render={(r: { action?: string }) => actionLabel(r.action)} />
            <TextField source="actorUid" label="Auteur" />
            <TextField source="actorRole" label="Rôle" />
            <TextField source="targetType" label="Type cible" />
            <TextField source="targetId" label="ID cible" />
            <TextField source="summary" label="Résumé" />
        </Datagrid>
    </List>
);
