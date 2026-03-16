import { useState } from 'react';
import {
    List, Datagrid, TextField, EmailField, DateField,
    FunctionField, SimpleShowLayout, ShowButton, Show,
    Create, SimpleForm, TextInput, SelectInput, required,
    useNotify, useRedirect, ReferenceInput
} from 'react-admin';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * R12 — Admin Clients — modèle avancé clients/{docId}
 * Resource = 'clients' → pointe vers collection 'clients' via dataProvider.
 * Création via callable createClient (provisioning industrialisé).
 */

const clientFilters = [
    <TextInput key="companyName" source="companyName" label="Société" alwaysOn />,
    <SelectInput key="status" source="status" label="Statut" choices={[
        { id: 'active', name: '🟢 Actif' },
        { id: 'inactive', name: '🔴 Inactif' },
    ]} />,
];

export const ClientList = () => (
    <List resource="clients" exporter={false} sort={{ field: 'provisionedAt', order: 'DESC' }} filters={clientFilters}>
        <Datagrid rowClick="show" bulkActionButtons={false}>
            <TextField source="firstName" label="Prénom" />
            <TextField source="lastName" label="Nom" />
            <EmailField source="email" />
            <TextField source="companyName" label="Société" />
            <FunctionField label="Statut" render={(record: Record<string, unknown>) =>
                record.status === 'active' ? '🟢 Actif' : '🔴 Inactif'
            } />
            <FunctionField label="Accès portail" render={(record: Record<string, unknown>) =>
                record.portalAccess ? '✅ Actif' : '❌ Désactivé'
            } />
            <FunctionField label="MDP à changer" render={(record: Record<string, unknown>) =>
                record.mustChangePassword ? '⚠️ Oui' : '✅ Non'
            } />
            <DateField source="provisionedAt" label="Provisionné le" />
            <ShowButton />
        </Datagrid>
    </List>
);

export const ClientShow = () => (
    <Show resource="clients">
        <SimpleShowLayout>
            <TextField source="id" label="Client ID" />
            <TextField source="authUid" label="Auth UID" />
            <TextField source="firstName" label="Prénom" />
            <TextField source="lastName" label="Nom" />
            <EmailField source="email" />
            <TextField source="companyName" label="Société" />
            <TextField source="role" label="Rôle" />
            <TextField source="status" label="Statut" />
            <FunctionField label="Site(s)" render={(record: Record<string, unknown>) => {
                const ids = record.siteIds as string[] | undefined;
                if (ids && ids.length > 0) return ids.join(', ');
                return (record.siteId as string) || '—';
            }} />
            <FunctionField label="Accès portail" render={(record: Record<string, unknown>) =>
                record.portalAccess ? '✅ Actif' : '❌ Désactivé'
            } />
            <FunctionField label="MDP à changer" render={(record: Record<string, unknown>) =>
                record.mustChangePassword ? '⚠️ Oui' : '✅ Non'
            } />
            <DateField source="provisionedAt" label="Provisionné le" showTime />
            <DateField source="createdAt" label="Créé le (legacy)" />
        </SimpleShowLayout>
    </Show>
);

export const ClientCreate = () => {
    const [, setLoading] = useState(false);
    const notify = useNotify();
    const redirect = useRedirect();

    const save = async (data: Record<string, unknown>) => {
        setLoading(true);
        try {
            const functions = getFunctions(undefined, 'europe-west1');
            const createClient = httpsCallable(functions, 'createClient');

            await createClient({
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                password: data.password,
                siteId: data.siteId,
                companyName: data.companyName || null,
            });
            notify('Compte client créé avec succès (portail activé, MDP à changer)', { type: 'success' });
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
                <TextInput source="password" label="Mot de passe provisoire" validate={required()} fullWidth type="password" helperText="Le client devra le changer à la première connexion" />
                <TextInput source="companyName" label="Société (optionnel)" fullWidth />
                <ReferenceInput source="siteId" reference="sites" label="Site principal">
                    <SelectInput optionText="name" validate={required()} fullWidth />
                </ReferenceInput>
            </SimpleForm>
        </Create>
    );
};
