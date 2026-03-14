import { useState } from 'react';
import {
    List, Datagrid, TextField, EmailField, DateField,
    FunctionField, SimpleShowLayout, ShowButton, Show,
    Create, SimpleForm, TextInput, SelectInput, required,
    useNotify, useRedirect, ReferenceInput
} from 'react-admin';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { Agent } from '@mocyno/types';

/**
 * ClientList — vue des agents avec role='client'.
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

export const ClientCreate = () => {
    const [, setLoading] = useState(false);
    const notify = useNotify();
    const redirect = useRedirect();

    const save = async (data: Partial<Agent>) => {
        setLoading(true);
        try {
            const functions = getFunctions(undefined, 'europe-west1');
            const createAgent = httpsCallable(functions, 'createAgent');

            await createAgent({
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                password: (data as Record<string, unknown>).password,
                siteId: data.siteId,
                role: 'client',
                status: 'active',
                mustChangePassword: true,
                provisionedAt: new Date().toISOString(),
            });
            notify('Compte client créé avec succès', { type: 'success' });
            redirect('/clients');
        } catch (error: unknown) {
            console.error(error);
            notify(`Erreur: ${(error as Error).message}`, { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Create resource="clients">
            <SimpleForm onSubmit={save}>
                <TextInput source="firstName" label="Prénom" validate={required()} fullWidth />
                <TextInput source="lastName" label="Nom" validate={required()} fullWidth />
                <TextInput source="email" label="Email" validate={required()} fullWidth type="email" />
                <TextInput source="password" label="Mot de passe provisoire" validate={required()} fullWidth type="password" />
                <ReferenceInput source="siteId" reference="sites" label="Site">
                    <SelectInput optionText="name" validate={required()} fullWidth />
                </ReferenceInput>
            </SimpleForm>
        </Create>
    );
};
