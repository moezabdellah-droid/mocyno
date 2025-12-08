            <TextField source="clientContact" label="Contact Client" />
            <FunctionField label="Spécialités Requises" render={(record: Site) => record.requiredSpecialties ? record.requiredSpecialties.join(', ') : ''} />
            <DeleteButton />
        </Datagrid >
    </List >
);

const SiteForm = () => (
    <SimpleForm sanitizeEmptyValues>
        <TextInput source="name" label="Nom du Site" validate={required()} fullWidth />
        <TextInput source="address" label="Adresse (pour GPS)" fullWidth />
        <TextInput source="clientContact" label="Nom du Contact / Téléphone" fullWidth />
        <TextInput source="email" label="Email de contact" type="email" fullWidth />

        <SelectArrayInput source="requiredSpecialties" label="Spécialités Requises sur site" choices={[
            { id: 'ADS', name: 'Agent de Sécurité (ADS)' },
            { id: 'SSIAP1', name: 'SSIAP 1' },
            { id: 'SSIAP2', name: 'SSIAP 2' },
            { id: 'CYNO', name: 'Agent Cynophile' },
            { id: 'RONDIER', name: 'Rondier' },
        ]} fullWidth />

        <TextInput source="notes" label="Notes internes" multiline fullWidth />
    </SimpleForm>
);

export const SiteCreate = () => (
    <Create title="Nouveau Site Client">
        <SiteForm />
    </Create>
);

export const SiteEdit = () => (
    <Edit title="Modifier Site">
        <SiteForm />
    </Edit>
);
