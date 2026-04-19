import {
    Datagrid,
    List,
    TextField,
    DateField,
    Create,
    SimpleForm,
    TextInput,
    SelectInput,
    Edit,
    Show,
    SimpleShowLayout,
    RichTextField,
    required,
    ReferenceField,
    ReferenceInput,
    AutocompleteInput,
    FormDataConsumer,
    FunctionField,
    useListContext,
} from 'react-admin';
import { Alert, Box, Typography } from '@mui/material';
import { RichTextInput } from 'ra-input-rich-text';

const consigneTypes = [
    { id: 'general', name: 'Générale' },
    { id: 'metier', name: 'Métier' },
    { id: 'site', name: 'Site' },
    { id: 'service', name: 'Service (Ponctuelle)' }
];

const consigneStatuses = [
    { id: 'pending', name: '🟡 En attente' },
    { id: 'approved', name: '✅ Validée' },
    { id: 'rejected', name: '❌ Refusée' },
];

const sourceChoices = [
    { id: 'client', name: 'Client' },
    { id: 'admin', name: 'Admin' },
];

// clientId retiré des filtres serveur : TextInput exact-match, pas d'index clientId+createdAt
// sur la collection consignes. Index déclarés couverts : targetId, siteId,
// source, status, source+status (tous combinés avec createdAt DESC).
const consigneFilters = [
    <SelectInput key="source" source="source" label="Origine" choices={sourceChoices} alwaysOn />,
    <SelectInput key="status" source="status" label="Statut" choices={consigneStatuses} alwaysOn />,
];

/**
 * Affiche une vraie erreur Firestore ou un message "aucune consigne" propre.
 * Évite le masquage silencieux d'une erreur backend en faux résultat vide.
 */
const ConsignesEmptyOrError = () => {
    const { error, isPending } = useListContext();

    if (isPending) return null;

    if (error) {
        const message =
            error instanceof Error
                ? error.message
                : 'Erreur inconnue lors du chargement des consignes.';

        return (
            <Box p={2}>
                <Alert severity="error">
                    <Typography variant="body1" fontWeight={600}>
                        Impossible de charger les consignes.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        La requête Firestore a échoué. Vérifie les index composites de la collection <strong>consignes</strong>.
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
                Aucune consigne ne correspond aux filtres actuels.
            </Alert>
        </Box>
    );
};

export const ConsigneList = () => (
    <List
        resource="consignes"
        filters={consigneFilters}
        sort={{ field: 'createdAt', order: 'DESC' }}
        empty={<ConsignesEmptyOrError />}
        queryOptions={{ retry: false }}
    >
        <Datagrid rowClick="show">
            <TextField source="title" label="Titre" sortable={false} />
            <FunctionField
                label="Type"
                sortable={false}
                render={(record: { type?: string }) => {
                    const typeObj = consigneTypes.find(t => t.id === record.type);
                    return typeObj ? typeObj.name : record.type;
                }}
            />
            <ReferenceField
                source="targetId"
                reference="sites"
                link="show"
                label="Site concerné"
                sortable={false}
            >
                <TextField source="name" />
            </ReferenceField>
            <TextField source="targetId" label="ID Cible (Autre)" sortable={false} />
            <DateField source="createdAt" label="Créé le" showTime />
            <TextField source="source" label="Origine" sortable={false} />
            <FunctionField
                label="Statut"
                sortable={false}
                render={(record: { status?: string; source?: string }) => {
                    if (record.source !== 'client') return '—';
                    const st = consigneStatuses.find(s => s.id === record.status);
                    return st ? st.name : (record.status || 'N/A');
                }}
            />
            <TextField source="clientId" label="Client ID" sortable={false} />
        </Datagrid>
    </List>
);

import type { Consigne } from '@mocyno/types';

const transform = (data: Partial<Consigne>) => {
    const payload = {
        ...data,
        authorId: 'admin',
        createdAt: new Date()
    };
    // Fix: Firestore crashes on undefined values
    if (payload.targetId === undefined) {
        payload.targetId = null;
    }
    return payload;
};

export const ConsigneCreate = () => (
    <Create resource="consignes" transform={transform}>
        <SimpleForm defaultValues={{ type: 'general' }}>
            <TextInput source="title" validate={[required()]} label="Titre de la consigne" fullWidth />
            <SelectInput source="type" choices={consigneTypes} validate={[required()]} label="Type de consigne" fullWidth />

            <FormDataConsumer>
                {({ formData }) =>
                    formData?.type === 'site' ? (
                        <ReferenceInput key="site-input" source="targetId" reference="sites" label="Sélectionner le Site">
                            <AutocompleteInput optionText="name" fullWidth />
                        </ReferenceInput>
                    ) : (
                        <TextInput
                            key="text-input"
                            source="targetId"
                            label="ID Cible (Métier/Autre)"
                            helperText="Remplir si Métier ou Autre"
                            fullWidth
                        />
                    )
                }
            </FormDataConsumer>

            <RichTextInput source="content" validate={[required()]} label="Contenu détaillé" fullWidth />
        </SimpleForm>
    </Create>
);

export const ConsigneEdit = () => (
    <Edit resource="consignes">
        <SimpleForm>
            <TextInput source="title" validate={[required()]} fullWidth />
            <SelectInput source="type" choices={consigneTypes} validate={[required()]} />

            <FormDataConsumer>
                {({ formData }) =>
                    formData.type === 'site' ? (
                        <ReferenceInput source="targetId" reference="sites" label="Site associé">
                            <AutocompleteInput optionText="name" />
                        </ReferenceInput>
                    ) : (
                        <TextInput
                            source="targetId"
                            label="ID Cible (Métier/Autre)"
                            helperText="Remplir si Métier ou Autre"
                        />
                    )
                }
            </FormDataConsumer>

            <RichTextInput source="content" validate={[required()]} />

            <FormDataConsumer>
                {({ formData }) =>
                    formData?.source === 'client' ? (
                        <SelectInput source="status" choices={consigneStatuses} label="Statut de validation" fullWidth />
                    ) : null
                }
            </FormDataConsumer>
        </SimpleForm>
    </Edit>
);

export const ConsigneShow = () => (
    <Show resource="consignes">
        <SimpleShowLayout>
            <TextField source="title" variant="h5" />
            <TextField source="type" />
            <DateField source="createdAt" showTime />
            <TextField source="source" label="Origine" />
            <TextField source="status" label="Statut de validation" />
            <TextField source="clientId" label="Client ID" />
            <RichTextField source="content" />
        </SimpleShowLayout>
    </Show>
);
