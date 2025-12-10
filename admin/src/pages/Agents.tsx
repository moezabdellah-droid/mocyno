import { useState } from 'react';
import {
    List, Datagrid, TextField, EmailField, DateField, Create, Edit, SimpleForm,
    TextInput, required, useNotify, useRedirect, Title, SelectArrayInput,
    FunctionField, SelectInput, TabbedForm, FormTab, DateInput, ImageField, ImageInput, TopToolbar,
    FormDataConsumer, regex, useRefresh, useRecordContext
} from 'react-admin';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { PDFDownloadLink } from '@react-pdf/renderer';
import type { Agent } from '../types/models';
import { Button, TextField as MuiTextField } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import GenerateIcon from '@mui/icons-material/Autorenew';
import { AgentBadgePdf, AgentProfilePdf } from '../components/AgentPdf';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase.config';

// Basic validation for professional card
const validateCardPro = (value: string) => {
    if (!value) return undefined;
    // Format: CAR-083-2030-03-18-XXXXXXXXXXX (Example)
    const regex = /^CAR-\d{3}-\d{4}-\d{2}-\d{2}-\d{11}$/;
    return regex.test(value) ? undefined : 'Format invalide (Ex: CAR-083-2030-03-18-...)';
};

// Validation for Dog ID: 250 268 780 869 046 (15 digits usually displayed in groups)
// Regex: 15 digits, allowing spaces
const validateDogId = regex(/^\d{3}\s?\d{3}\s?\d{3}\s?\d{3}\s?\d{3}$/, 'Format requis: 250 268 780 869 046 (15 chiffres)');

const AgentPasswordReset = () => {
    const record = useRecordContext();
    const notify = useNotify();
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    if (!record) return null;

    const handlePasswordUpdate = async () => {
        if (!newPassword || newPassword.length < 6) {
            notify('Le mot de passe doit contenir au moins 6 caractères.', { type: 'warning' });
            return;
        }

        setLoading(true);
        try {
            const functions = getFunctions(undefined, 'europe-west1');
            const updateAgentPassword = httpsCallable(functions, 'updateAgentPassword');

            await updateAgentPassword({
                agentId: record.id,
                newPassword: newPassword
            });

            notify('Mot de passe mis à jour avec succès.', { type: 'success' });
            setNewPassword(''); // Clear field
        } catch (error: any) {
            console.error(error);
            notify(`Erreur: ${error.message || 'Impossible de mettre à jour le mot de passe'}`, { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 400, marginTop: 10 }}>
            <h3>Gestion du Mot de Passe</h3>
            <p style={{ fontSize: '0.9em', color: '#666' }}>
                Définit un nouveau mot de passe pour cet agent. L'ancien mot de passe sera écrasé.
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <MuiTextField
                    label="Nouveau Mot de Passe"
                    type="password"
                    value={newPassword}
                    onChange={(e: any) => setNewPassword(e.target.value)}
                    variant="outlined"
                    size="small"
                    style={{ flex: 1 }}
                    InputLabelProps={{ shrink: true }}
                />
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handlePasswordUpdate}
                    disabled={loading || !newPassword}
                    size="medium"
                >
                    {loading ? '...' : 'Modifier'}
                </Button>
            </div>
        </div>
    );
};

const GenerateMatriculeButton = () => {
    const record = useRecordContext();
    const refresh = useRefresh();
    const notify = useNotify();
    const [loading, setLoading] = useState(false);

    if (!record || record.matricule) return null;

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const functions = getFunctions(undefined, 'europe-west1');
            const generateMatricule = httpsCallable(functions, 'generateMatricule');
            await generateMatricule({ agentId: record.id });
            notify('Matricule généré avec succès');
            refresh();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
            console.error(error);
            notify(`Erreur: ${errorMessage}`, { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={handleGenerate}
            disabled={loading}
            startIcon={<GenerateIcon />}
            sx={{ mt: 2, mb: 2 }}
        >
            {loading ? 'Génération...' : 'Générer Matricule'}
        </Button>
    );
};

const AgentDownloadButtons = () => {
    const record = useRecordContext();
    // Simplified: No async image pre-loading for now to ensure buttons appear.
    // Images will be loaded by the PDF renderer if possible, or skipped.
    const photoBase64 = record?.photoURL || null;
    const logoBase64 = null; // Skip logo for now to prevent hang

    if (!record) return null;

    return (
        <div style={{ display: 'flex', gap: 10 }}>
            <PDFDownloadLink
                document={<AgentBadgePdf agent={record as unknown as Agent} photoBase64={photoBase64} logoBase64={logoBase64} />}
                fileName={`Badge-${record.lastName || 'Agent'}.pdf`}
            >
                {({ loading }) => (
                    <Button variant="contained" color="primary" startIcon={<DownloadIcon />} disabled={loading}>
                        {loading ? '...' : 'Badge'}
                    </Button>
                )}
            </PDFDownloadLink>

            <PDFDownloadLink
                document={<AgentProfilePdf agent={record as unknown as Agent} photoBase64={photoBase64} />}
                fileName={`Fiche-${record.lastName || 'Agent'}.pdf`}
            >
                {({ loading }) => (
                    <Button variant="contained" color="secondary" startIcon={<DownloadIcon />} disabled={loading}>
                        {loading ? '...' : 'Fiche'}
                    </Button>
                )}
            </PDFDownloadLink>
        </div>
    );
};

export const AgentList = () => (
    <List resource="agents">
        <Datagrid rowClick="edit">
            <FunctionField label="Photo" render={(record: Agent) =>
                record.photoURL ? <img src={record.photoURL} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} alt="" /> : null
            } />
            <TextField source="matricule" label="Matricule" />
            <TextField source="firstName" label="Prénom" />
            <TextField source="lastName" label="Nom" />
            <TextField source="professionalCardNumber" label="Carte Pro" />
            <EmailField source="email" />
            <FunctionField label="Spécialités" render={(record: Agent) => record.specialties ? record.specialties.join(', ') : ''} />
            <TextField source="status" />
            <DateField source="createdAt" label="Créé le" />
        </Datagrid>
    </List>
);

const UserEditActions = () => {
    return (
        <TopToolbar>
            <AgentDownloadButtons />
        </TopToolbar>
    );
};

export const AgentEdit = () => (
    <Edit resource="agents" actions={<UserEditActions />}>
        <Title title="Modifier l'Agent" />
        <TabbedForm>
            <FormTab label="Identité">
                <TextInput source="id" disabled />
                <TextInput source="matricule" disabled label="Matricule (Auto)" />
                <GenerateMatriculeButton />
                <TextInput source="email" disabled label="Email (Non modifiable)" fullWidth />

                <ImageInput source="photoURL" label="Photo d'Identité" accept={{ 'image/*': ['.png', '.jpg', '.jpeg'] }}>
                    <ImageField source="src" title="title" />
                </ImageInput>

                <TextInput source="firstName" label="Prénom" validate={required()} fullWidth />
                <TextInput source="lastName" label="Nom" validate={required()} fullWidth />

                <DateInput source="birthDate" label="Date de Naissance" fullWidth />
                <TextInput source="birthPlace" label="Lieu de Naissance" fullWidth />
                <TextInput source="nationality" label="Nationalité" fullWidth />

                <SelectInput source="gender" label="Genre" choices={[
                    { id: 'M', name: 'Masculin' },
                    { id: 'F', name: 'Féminin' },
                ]} fullWidth />

                <SelectInput source="bloodGroup" label="Groupe Sanguin" choices={[
                    { id: 'A+', name: 'A+' }, { id: 'A-', name: 'A-' },
                    { id: 'B+', name: 'B+' }, { id: 'B-', name: 'B-' },
                    { id: 'AB+', name: 'AB+' }, { id: 'AB-', name: 'AB-' },
                    { id: 'O+', name: 'O+' }, { id: 'O-', name: 'O-' },
                ]} fullWidth />
            </FormTab>

            <FormTab label="Coordonnées">
                <TextInput source="address" label="Adresse Postale" fullWidth multiline />
                <TextInput source="zipCode" label="Code Postal" fullWidth />
                <TextInput source="city" label="Ville" fullWidth />
                <TextInput source="phone" label="Téléphone" fullWidth />
            </FormTab>

            <FormTab label="Professionnel">
                <SelectArrayInput source="specialties" label="Spécialités" choices={[
                    { id: 'ADS', name: 'Agent de Sécurité (ADS)' },
                    { id: 'SSIAP1', name: 'SSIAP 1' },
                    { id: 'SSIAP2', name: 'SSIAP 2' },
                    { id: 'CYNO', name: 'Agent Cynophile' },
                    { id: 'RONDIER', name: 'Rondier' },
                    { id: 'VIDEO', name: 'Opérateur Vidéo' },
                ]} fullWidth />

                <FormDataConsumer>
                    {({ formData, ...rest }) =>
                        formData.specialties && formData.specialties.includes('CYNO') &&
                        <TextInput
                            source="dogIds"
                            label="Numéro(s) d'identification Chien (250...)"
                            validate={validateDogId}
                            fullWidth
                            helperText="15 chiffres (Ex: 250 268 780 869 046)"
                            {...rest}
                        />
                    }
                </FormDataConsumer>

                <TextInput source="professionalCardNumber" label="Numéro de Carte Pro (Ex: CAR-083-2030-03-18-XXXXXXXXXXX)" validate={validateCardPro} fullWidth />
                <DateInput source="professionalCardObtainedAt" label="Date d'Obtention Carte Pro" fullWidth />
                <FunctionField label="Date Validité (Calculée)" render={(record: Agent) => {
                    if (!record.professionalCardObtainedAt) return '-';
                    const date = new Date(record.professionalCardObtainedAt);
                    date.setFullYear(date.getFullYear() + 5);
                    return date.toLocaleDateString();
                }} />

                <TextInput source="sstNumber" label="Numéro SST" fullWidth />
                <DateInput source="sstObtainedAt" label="Date Obtention SST" fullWidth />
                <DateInput source="sstExpiresAt" label="Date Expiration SST" fullWidth />

                <SelectInput source="contractNature" label="Nature du Contrat" choices={[
                    { id: 'CDI', name: 'CDI' },
                    { id: 'CDD', name: 'CDD' },
                    { id: 'SAISONNIER', name: 'Saisonnier' },
                    { id: 'EXTRA', name: 'Extra / Vacation' },
                    { id: 'INTERIM', name: 'Intérim' },
                ]} fullWidth />

                <SelectInput source="contractType" label="Type de Contrat" choices={[
                    { id: 'FULL_TIME', name: 'Temps Plein (35h)' },
                    { id: 'PART_TIME', name: 'Temps Partiel' },
                ]} fullWidth />
            </FormTab>

            <FormTab label="Administratif & Documents">
                <TextInput source="socialSecurityNumber" label="Numéro de Sécurité Sociale" fullWidth />
                <TextInput source="bankName" label="Nom de la Banque" fullWidth />
                <TextInput source="iban" label="IBAN" fullWidth />
                <TextInput source="bic" label="BIC" fullWidth />

                <div style={{ marginTop: 20 }}>
                    <h3>Téléchargements</h3>
                    <AgentDownloadButtons />
                </div>
            </FormTab>

            <FormTab label="Compte">
                <SelectInput source="status" label="Statut Compte" choices={[
                    { id: 'active', name: 'Actif' },
                    { id: 'inactive', name: 'Inactif' },
                ]} defaultValue="active" fullWidth />

                <div style={{ marginTop: '2rem', borderTop: '1px solid #ccc', paddingTop: '1rem' }}>
                    <AgentPasswordReset />
                </div>
            </FormTab>
        </TabbedForm>
    </Edit >
);

export const AgentCreate = () => {
    const [, setLoading] = useState(false);
    const notify = useNotify();
    const redirect = useRedirect();

    interface AgentFormData extends Omit<Partial<Agent>, 'photoURL'> {
        photoURL?: string | { rawFile: File; src?: string; title?: string } | null;
    }

    const save = async (data: Partial<Agent>) => {
        const formData = data as AgentFormData;
        setLoading(true);
        try {
            // Handle Photo Upload Manually first
            let photoUrl = null;
            if (formData.photoURL && typeof formData.photoURL !== 'string' && 'rawFile' in formData.photoURL) {
                const file = formData.photoURL.rawFile;
                const storageRef = ref(storage, `agents/photos/${file.name}`);
                await uploadBytes(storageRef, file);
                photoUrl = await getDownloadURL(storageRef);
            }

            const functions = getFunctions(undefined, 'europe-west1');
            const createAgent = httpsCallable(functions, 'createAgent');

            await createAgent({
                ...data,
                photoURL: photoUrl
            });
            notify('Agent créé avec succès');
            redirect('/agents');
        } catch (error: unknown) {
            console.error(error);
            notify(`Erreur: ${(error as Error).message}`, { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Create resource="agents">
            <SimpleForm onSubmit={save}>
                <TextInput source="firstName" label="Prénom" validate={required()} fullWidth />
                <TextInput source="lastName" label="Nom" validate={required()} fullWidth />
                <TextInput source="email" label="Email" validate={[required()]} fullWidth type="email" />
                <TextInput source="password" label="Mot de passe provisoire" validate={[required()]} fullWidth type="password" />

                <ImageInput source="photoURL" label="Photo d'Identité" accept={{ 'image/*': ['.png', '.jpg', '.jpeg'] }}>
                    <ImageField source="src" title="title" />
                </ImageInput>

                <SelectArrayInput source="specialties" label="Spécialités" choices={[
                    { id: 'ADS', name: 'Agent de Sécurité (ADS)' },
                    { id: 'SSIAP1', name: 'SSIAP 1' },
                    { id: 'SSIAP2', name: 'SSIAP 2' },
                    { id: 'CYNO', name: 'Agent Cynophile' },
                    { id: 'RONDIER', name: 'Rondier' },
                    { id: 'VIDEO', name: 'Opérateur Vidéo' },
                ]} fullWidth />
            </SimpleForm>
        </Create>
    );
};
