import {
    List, Datagrid, TextField, EmailField, DateField,
    FunctionField, Edit, SimpleShowLayout, ShowButton, Show
} from 'react-admin';
import type { Agent } from '@mocyno/types';

/**
 * ClientList — vue read-only des agents avec role='client'.
 * Le filtre permanent empêche l'affichage d'agents non-clients.
 * Resource name = 'clients' → redirigé vers collection 'agents' via dataProvider alias.
 */
export const ClientList = () => (
    <List resource="clients" filter={{ role: 'client' }} exporter={false}>
        <Datagrid rowClick="show" bulkActionButtons={false}>
            <TextField source="firstName" label="Prénom" />
            <TextField source="lastName" label="Nom" />
            <EmailField source="email" />
            <TextField source="siteId" label="Site ID" />
            <TextField source="status" label="Statut" />
            <FunctionField label="MDP à changer" render={(record: Agent) =>
                record.mustChangePassword ? '⚠️ Oui' : '✅ Non'
            } />
            <DateField source="createdAt" label="Créé le" />
            <ShowButton />
        </Datagrid>
    </List>
);

export const ClientShow = () => (
    <Show resource="clients">
        <SimpleShowLayout>
            <TextField source="id" label="UID" />
            <TextField source="firstName" label="Prénom" />
            <TextField source="lastName" label="Nom" />
            <EmailField source="email" />
            <TextField source="role" label="Rôle" />
            <TextField source="siteId" label="Site ID" />
            <TextField source="status" label="Statut" />
            <FunctionField label="MDP à changer" render={(record: Agent) =>
                record.mustChangePassword ? '⚠️ Oui' : '✅ Non'
            } />
            <DateField source="createdAt" label="Créé le" />
        </SimpleShowLayout>
    </Show>
);
