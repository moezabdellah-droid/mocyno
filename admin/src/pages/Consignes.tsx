import { Datagrid, List, TextField, DateField, Create, SimpleForm, TextInput, SelectInput, Edit, Show, SimpleShowLayout, RichTextField, required, ReferenceField, ReferenceInput, AutocompleteInput, FormDataConsumer, FunctionField } from 'react-admin';
import { RichTextInput } from 'ra-input-rich-text';

const consigneTypes = [
    { id: 'general', name: 'Générale' },
    { id: 'metier', name: 'Métier' },
    { id: 'site', name: 'Site' },
    { id: 'service', name: 'Service (Ponctuelle)' }
];

export const ConsigneList = () => (
    <List>
        <Datagrid rowClick="show">
            <TextField source="title" label="Titre" />
            <FunctionField
                label="Type"
                render={(record: any) => {
                    const typeObj = consigneTypes.find(t => t.id === record.type);
                    return typeObj ? typeObj.name : record.type;
                }}
            />
            <ReferenceField source="targetId" reference="sites" link="show" label="Site concerné">
                <TextField source="name" />
            </ReferenceField>
            <TextField source="targetId" label="ID Cible (Autre)" />
            <DateField source="createdAt" label="Créé le" showTime />
        </Datagrid>
    </List>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transform = (data: any) => ({
    ...data,
    authorId: 'admin',
    createdAt: new Date()
});

export const ConsigneCreate = () => (
    <Create transform={transform}>
        <SimpleForm>
            <TextInput source="title" validate={[required()]} label="Titre de la consigne" fullWidth />
            <SelectInput source="type" choices={consigneTypes} validate={[required()]} label="Type de consigne" />

            <FormDataConsumer>
                {({ formData }) =>
                    formData.type === 'site' ? (
                        <ReferenceInput source="targetId" reference="sites" label="Sélectionner le Site">
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

            <RichTextInput source="content" validate={[required()]} label="Contenu détaillé" />
        </SimpleForm>
    </Create>
);

export const ConsigneEdit = () => (
    <Edit>
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
        </SimpleForm>
    </Edit>
);

export const ConsigneShow = () => (
    <Show>
        <SimpleShowLayout>
            <TextField source="title" variant="h5" />
            <TextField source="type" />
            <DateField source="createdAt" showTime />
            <RichTextField source="content" />
        </SimpleShowLayout>
    </Show>
);
