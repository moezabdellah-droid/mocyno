import { useState } from 'react';
import {
    List, Datagrid, TextField, EmailField, DateField,
    FunctionField, SimpleShowLayout, ShowButton, Show,
    Create, SimpleForm, TextInput, SelectInput, required,
    useNotify, useRedirect, ReferenceInput, useListContext, CreateButton
} from 'react-admin';
import { Alert, Box, Typography } from '@mui/material';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * R12 — Admin Clients — modèle avancé clients/{docId}
 * Resource = 'clients' → pointe vers collection 'clients' via dataProvider.
 * Création via callable createClient (provisioning industrialisé).
 */

// companyName retiré des filtres serveur : TextInput exact-match libre,
// aucun index clients/companyName+provisionedAt déclaré.
// status conservé : SelectInput borné, index status+provisionedAt couvert.
const clientFilters = [
    <SelectInput key="status" source="status" label="Statut" choices={[
        { id: 'active', name: '🟢 Actif' },
        { id: 'inactive', name: '🔴 Inactif' },
    ]} />,
];

/**
 * Affiche une vraie erreur Firestore ou un message "aucun client" propre.
 * Évite le masquage silencieux d'une erreur backend en faux résultat vide.
 */
const ClientsEmptyOrError = () => {
    const { error, isPending } = useListContext();

    if (isPending) return null;

    if (error) {
        const message =
            error instanceof Error
                ? error.message
                : 'Erreur inconnue lors du chargement des clients.';

        return (
            <Box p={2}>
                <Alert severity="error">
                    <Typography variant="body1" fontWeight={600}>
                        Impossible de charger la liste des clients.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        La requête Firestore a échoué. Vérifie les index composites de la collection <strong>clients</strong>.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {message}
                    </Typography>
                </Alert>
            </Box>
        );
    }

    return (
        <Box p={2}>
            <Alert severity="info">
                Aucun client ne correspond aux filtres actuels.
            </Alert>
            <Box mt={2}>
                <CreateButton />
            </Box>
        </Box>
    );
};

export const ClientList = () => (
    <List
        resource="clients"
        exporter={false}
        sort={{ field: 'provisionedAt', order: 'DESC' }}
        filters={clientFilters}
        empty={<ClientsEmptyOrError />}
        queryOptions={{ retry: false }}
    >
        <Datagrid rowClick="show" bulkActionButtons={false}>
            <TextField source="firstName" label="Prénom" sortable={false} />
            <TextField source="lastName" label="Nom" sortable={false} />
            <EmailField source="email" sortable={false} />
            <TextField source="companyName" label="Société" sortable={false} />
            <FunctionField label="Statut" sortable={false} render={(record: Record<string, unknown>) =>
                record.status === 'active' ? '🟢 Actif' : '🔴 Inactif'
            } />
            <FunctionField label="Accès portail" sortable={false} render={(record: Record<string, unknown>) =>
                record.portalAccess ? '✅ Actif' : '❌ Désactivé'
            } />
            <FunctionField label="MDP à changer" sortable={false} render={(record: Record<string, unknown>) =>
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
