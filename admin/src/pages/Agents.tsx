import { useState, useEffect } from 'react';
import {
    List, Datagrid, TextField, EmailField, DateField, Create, Edit, SimpleForm,
    TextInput, required, useNotify, useRedirect, Title, SelectArrayInput,
    FunctionField, SelectInput, TabbedForm, FormTab, DateInput, ImageField, ImageInput, TopToolbar,
    FormDataConsumer, regex, useRefresh, useRecordContext
} from 'react-admin';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { PDFDownloadLink } from '@react-pdf/renderer';
import type { Agent } from '../types/models';
import { Button, CircularProgress } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import GenerateIcon from '@mui/icons-material/Autorenew';
import { imageUrlToPngBase64 } from '../utils/imageUtils';
import { AgentBadgePdf, AgentProfilePdf } from '../components/AgentPdf';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

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
    const [photoBase64, setPhotoBase64] = useState<string | null>(null);
    const [logoBase64, setLogoBase64] = useState<string | null>(null);
    const [loadingImages, setLoadingImages] = useState(false);

    useEffect(() => {
        const loadImages = async () => {
            if (!record) return;

            // Avoid re-loading if already set
            if (photoBase64 !== null && logoBase64 !== null) return;
            if (loadingImages) return;

            setLoadingImages(true);

            // Safety timeout promise
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Image loading timed out')), 5000)
            );

            const loadProcess = async () => {
                // 1. Load Agent Photo
                let photoData = photoBase64;
                if (record.photoURL && !photoData) {
                    try {
                        // Use the utility function which uses fetch (CORS now supported)
                        // This avoids using getBlob which requires Buffer polyfill
                        photoData = await imageUrlToPngBase64(record.photoURL);
                        setPhotoBase64(photoData);
                    } catch (err) {
                        console.error("Failed to load agent photo:", err);
                        setPhotoBase64('');
                    }
                } else if (!photoData) {
                    setPhotoBase64(''); // No URL, validly empty
                }

                // 2. Load Logo
                let logoData = logoBase64;
                if (!logoData) {
                    try {
                        logoData = await imageUrlToPngBase64('/mocyno-logo.png');
                        setLogoBase64(logoData);
                    } catch (err) {
                        console.warn("Failed to load logo:", err);
                        setLogoBase64('');
                    }
                }
            };

            try {
                // Race between loading and timeout
                await Promise.race([loadProcess(), timeoutPromise]);
            } catch (error) {
                console.error("Error or timeout in loadImages:", error);
                // Ensure values are set to strings so UI unblocks
                setPhotoBase64(prev => prev ?? '');
                setLogoBase64(prev => prev ?? '');
            } finally {
                setLoadingImages(false);
            }
        };

        loadImages();
    }, [record, photoBase64, logoBase64, loadingImages]);

    if (!record) return null;

    const ready = !loadingImages && (logoBase64 !== null);

    return (
        <div style={{ display: 'flex', gap: 10 }}>
            {ready ? (
                <>
                    <PDFDownloadLink
                        document={<AgentBadgePdf agent={record} photoBase64={photoBase64} logoBase64={logoBase64} />}
                        fileName={`Badge-${record.lastName || 'Agent'}.pdf`}
                    >
                        {({ loading }) => (
                            <Button variant="contained" color="primary" startIcon={<DownloadIcon />} disabled={loading}>
                                {loading ? <CircularProgress size={24} color="inherit" /> : 'Badge Agent'}
                            </Button>
                        )}
                    </PDFDownloadLink>

                    <PDFDownloadLink
                        document={<AgentProfilePdf agent={record} photoBase64={photoBase64} />}
                        fileName={`Fiche-${record.lastName || 'Agent'}.pdf`}
                    >
                        {({ loading }) => (
                            <Button variant="contained" color="secondary" startIcon={<DownloadIcon />} disabled={loading}>
                                {loading ? <CircularProgress size={24} color="inherit" /> : 'Fiche Renseignements'}
                            </Button>
                        )}
                    </PDFDownloadLink>
                </>
            ) : (
                <Button variant="contained" disabled startIcon={<DownloadIcon />}>
                    Chargement Images...
                </Button>
            )}
        </div>
    );
};

export const AgentList = () => (
    <List>
        <Datagrid rowClick="edit">
            <FunctionField label="Photo" render={(record: any) =>
                record.photoURL ? <img src={record.photoURL} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} alt="" /> : null
            } />
            <TextField source="matricule" label="Matricule" />
            <TextField source="firstName" label="Prénom" />
            <TextField source="lastName" label="Nom" />
            <TextField source="professionalCardNumber" label="Carte Pro" />
            <EmailField source="email" />
            <FunctionField label="Spécialités" render={(record: any) => record.specialties ? record.specialties.join(', ') : ''} />
            <TextField source="status" />
            <DateField source="createdAt" label="Créé le" />
        </Datagrid>
    </List>
);

const UserEditActions = () => {
    const record = useRecordContext();
    if (!record) return null;
    return (
        <TopToolbar>
            <AgentBadgePdf agent={record as unknown as Agent} />
            <AgentProfilePdf agent={record as unknown as Agent} />
        </TopToolbar>
    );
};

export const AgentEdit = () => (
    <Edit actions={<UserEditActions />}>
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
                <FunctionField label="Date Validité (Calculée)" render={(record: any) => {
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
            </FormTab>
        </TabbedForm>
    </Edit>
);

export const AgentCreate = () => {
    const [, setLoading] = useState(false);
    const notify = useNotify();
    const redirect = useRedirect();

    const save = async (data: any) => {
        setLoading(true);
        try {
            // Handle Photo Upload Manually first
            let photoUrl = null;
            if (data.photoURL && data.photoURL.rawFile) {
                const file = data.photoURL.rawFile;
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
        } catch (error: any) {
            console.error(error);
            notify(`Erreur: ${error.message}`, { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Create>
            <SimpleForm onSubmit={save}>
                <TextInput source="firstName" label="Prénom" validate={required()} fullWidth />
                <TextInput source="lastName" label="Nom" validate={required()} fullWidth />
                <TextInput source="email" label="Email" validate={[required()]} fullWidth type="email" />

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
