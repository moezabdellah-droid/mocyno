import {
    List,
    Datagrid,
    TextField,
    DateField,
    TextInput,
    SelectInput,
    useListContext,
} from 'react-admin';
import { Alert, Box, Typography } from '@mui/material';

const roleChoices = [
    { id: 'client', name: 'Client' },
    { id: 'admin', name: 'Admin' },
    { id: 'manager', name: 'Manager' },
];

// documentName retiré des filtres serveur : TextInput exact-match libre,
// aucun index documentDownloads/documentName+downloadedAt déclaré.
// clientId et callerRole conservés : couverts par les index déclarés.
const downloadFilters = [
    <TextInput key="clientId" source="clientId" label="Client ID" alwaysOn />,
    <SelectInput key="callerRole" source="callerRole" label="Rôle" choices={roleChoices} />,
];

/**
 * Affiche une vraie erreur Firestore ou un message "aucun téléchargement" propre.
 */
const DocumentDownloadsEmptyOrError = () => {
    const { error, isPending } = useListContext();

    if (isPending) return null;

    if (error) {
        const message =
            error instanceof Error
                ? error.message
                : 'Erreur inconnue lors du chargement des téléchargements.';

        return (
            <Box p={2}>
                <Alert severity="error">
                    <Typography variant="body1" fontWeight={600}>
                        Impossible de charger les téléchargements.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        La requête Firestore a échoué. Vérifie les index composites de la collection <strong>documentDownloads</strong>.
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
                Aucun téléchargement ne correspond aux filtres actuels.
            </Alert>
        </Box>
    );
};

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
        empty={<DocumentDownloadsEmptyOrError />}
        queryOptions={{ retry: false }}
    >
        <Datagrid bulkActionButtons={false}>
            <TextField source="documentName" label="Document" sortable={false} />
            <TextField source="documentType" label="Type" sortable={false} />
            <TextField source="clientId" label="Client ID" sortable={false} />
            <TextField source="callerRole" label="Rôle" sortable={false} />
            <TextField source="callerUid" label="UID" sortable={false} />
            <DateField source="downloadedAt" label="Date" showTime />
        </Datagrid>
    </List>
);

export default DocumentDownloadList;
