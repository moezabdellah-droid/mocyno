import {
    Datagrid, List, TextField, DateField, TextInput,
    FunctionField, Show, SimpleShowLayout, ShowButton,
    useListContext,
} from 'react-admin';
import { Alert, Box, Typography } from '@mui/material';

// name et type retirés des filtres serveur : TextInput exact-match libres,
// aucun index documents/name+createdAt ni documents/type+createdAt déclaré.
// clientId conservé : couvert par index clientId+createdAt.
const filters = [
    <TextInput key="clientId" source="clientId" label="Client ID" alwaysOn />,
];

/**
 * Affiche une vraie erreur Firestore ou un message "aucun document" propre.
 * Évite le masquage silencieux d'une erreur backend en faux résultat vide.
 */
const DocumentsEmptyOrError = () => {
    const { error, isPending } = useListContext();

    if (isPending) return null;

    if (error) {
        const message =
            error instanceof Error
                ? error.message
                : 'Erreur inconnue lors du chargement des documents.';

        return (
            <Box p={2}>
                <Alert severity="error">
                    <Typography variant="body1" fontWeight={600}>
                        Impossible de charger les documents.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        La requête Firestore a échoué. Vérifie les index composites de la collection <strong>documents</strong>.
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
                Aucun document ne correspond aux filtres actuels.
            </Alert>
        </Box>
    );
};

/**
 * A23 — Admin resource for client documents
 */
export const DocumentList = () => (
    <List
        resource="documents"
        filters={filters}
        sort={{ field: 'createdAt', order: 'DESC' }}
        perPage={25}
        empty={<DocumentsEmptyOrError />}
        queryOptions={{ retry: false }}
    >
        <Datagrid rowClick="show" bulkActionButtons={false}>
            <TextField source="name" label="Nom" sortable={false} />
            <TextField source="type" label="Type" sortable={false} />
            <TextField source="clientId" label="Client ID" sortable={false} />
            <FunctionField
                label="Visible client"
                sortable={false}
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
