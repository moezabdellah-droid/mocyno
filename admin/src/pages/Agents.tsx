import { useState, useEffect } from 'react';
import {
    List, Datagrid, TextField, EmailField, DateField, Create, SimpleForm,
    TextInput, required, useNotify, useRedirect, SelectArrayInput,
    FunctionField, SelectInput, TabbedForm, FormTab, DateInput, ImageField, ImageInput,
    FormDataConsumer, regex, useRefresh, useRecordContext, useListContext,
    Toolbar, SaveButton, DeleteButton, Edit,
    SimpleShowLayout, TopToolbar, EditButton, RecordContextProvider,
} from 'react-admin';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { PDFDownloadLink, pdf } from '@react-pdf/renderer';
import type { Agent } from '@mocyno/types';
import { Button, TextField as MuiTextField, Alert, Box, Typography, CircularProgress } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import GenerateIcon from '@mui/icons-material/Autorenew';
import EditIcon from '@mui/icons-material/Edit';
import { AgentBadgePdf, AgentProfilePdf } from '../components/AgentPdf';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { storage, db } from '../firebase.config';
import { useParams } from 'react-router-dom';
import logoUrl from '../assets/mocyno-logo.png';
import { imageUrlToPngBase64 } from '../utils/imageUtils';
import { resolveAgentPhotoBase64 } from '../utils/agentPhotoUtils';

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
    const { id } = useParams();
    const record = useRecordContext();
    const notify = useNotify();
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Use record ID or URL param ID (robust fallback)
    const agentId = record?.id || id;

    if (!agentId) {
        // Debug info if ID is seemingly lost
        return <div style={{ color: 'red', marginTop: 10 }}>Erreur: Impossible de récupérer l'ID de l'agent.</div>;
    }

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
                agentId: agentId,
                newPassword: newPassword
            });

            notify('Mot de passe mis à jour avec succès.', { type: 'success' });
            setNewPassword(''); // Clear field
        } catch (error: unknown) {
            console.error(error);
            const errMsg = error instanceof Error ? error.message : 'Impossible de mettre à jour le mot de passe';
            notify(`Erreur: ${errMsg}`, { type: 'error' });
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
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



// ... (other components if needed)

const AgentDownloadButtons = () => {
    const record = useRecordContext<Agent>();

    // Image State
    const [logoBase64, setLogoBase64] = useState<string | null>(null);
    const [photoBase64, setPhotoBase64] = useState<string | null>(null);
    const [loadingImages, setLoadingImages] = useState(false);

    // 2. Load Images (Logo & Photo) once record is ready
    useEffect(() => {
        if (!record) return;

        const loadImages = async () => {
            setLoadingImages(true);
            try {
                // Load Logo (Static asset)
                if (!logoBase64) {
                    const logoData = await imageUrlToPngBase64(logoUrl);
                    setLogoBase64(logoData);
                }

                // Load Photo (User uploaded)
                if (record.photoURL && !photoBase64) {
                    // Try/Catch specifically for photo to not fail logo if photo fails (CORS etc)
                    try {
                        const photoData = await imageUrlToPngBase64(record.photoURL as string);
                        setPhotoBase64(photoData);
                    } catch {
                        console.warn('Failed to load agent photo, using fallback');
                        setPhotoBase64(record.photoURL as string);
                    }
                }
            } catch (err) {
                console.error('Error loading PDF assets:', err);
            } finally {
                setLoadingImages(false);
            }
        };

        loadImages();
    }, [record, logoBase64, photoBase64]);

    if (!record) return <Button disabled>Chargement...</Button>;

    const isReady = !loadingImages && logoBase64 !== null;

    return (
        <div style={{ display: 'flex', gap: 10 }}>
            {/* PDFDownloadLink children prop type mismatch suppression not needed */}
            <PDFDownloadLink
                document={<AgentBadgePdf agent={record} photoBase64={photoBase64} logoBase64={logoBase64} />}
                fileName={`Badge-${record.lastName || 'Agent'}.pdf`}
            >
                {({ loading }: { loading: boolean }) => (
                    <Button variant="contained" color="primary" startIcon={<DownloadIcon />} disabled={loading || !isReady}>
                        {loading || !isReady ? 'Chargement...' : 'Badge'}
                    </Button>
                )}
            </PDFDownloadLink>

            {/* PDFDownloadLink children prop type mismatch suppression not needed */}
            <PDFDownloadLink
                document={<AgentProfilePdf agent={record} photoBase64={photoBase64} />}
                fileName={`Fiche-${record.lastName || 'Agent'}.pdf`}
            >
                {({ loading }: { loading: boolean }) => (
                    <Button variant="contained" color="secondary" startIcon={<DownloadIcon />} disabled={loading || !isReady}>
                        {loading || !isReady ? 'Chargement...' : 'Fiche'}
                    </Button>
                )}
            </PDFDownloadLink>
        </div>
    );
};

const statusChoices = [
    { id: 'active', name: '🟢 Actif' },
    { id: 'inactive', name: '🔴 Inactif' },
];

const contractChoices = [
    { id: 'CDI', name: 'CDI' },
    { id: 'CDD', name: 'CDD' },
    { id: 'SAISONNIER', name: 'Saisonnier' },
    { id: 'EXTRA', name: 'Extra / Vacation' },
    { id: 'INTERIM', name: 'Intérim' },
];

// lastName retiré des filtres serveur : TextInput exact-match libre, aucun index
// agents/lastName+lastName ASC déclaré. Tri alphabétique conservé via sort={{ field: 'lastName' }}.
const agentFilters = [
    <SelectInput key="status" source="status" label="Statut" choices={statusChoices} alwaysOn />,
    <SelectInput key="contractNature" source="contractNature" label="Contrat" choices={contractChoices} />,
];

/**
 * Affiche une vraie erreur Firestore ou un message "aucun agent" propre.
 * Évite le masquage silencieux d'une erreur backend en faux résultat vide.
 */
const AgentsEmptyOrError = () => {
    const { error, isPending } = useListContext();

    if (isPending) return null;

    if (error) {
        const message =
            error instanceof Error
                ? error.message
                : 'Erreur inconnue lors du chargement des agents.';

        return (
            <Box p={2}>
                <Alert severity="error">
                    <Typography variant="body1" fontWeight={600}>
                        Impossible de charger la liste des agents.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        La requête Firestore a échoué. Vérifie les index composites de la collection <strong>agents</strong>.
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
                Aucun agent ne correspond aux filtres actuels.
            </Alert>
        </Box>
    );
};

export const AgentList = () => (
    <List
        resource="agents"
        filters={agentFilters}
        sort={{ field: 'lastName', order: 'ASC' }}
        empty={<AgentsEmptyOrError />}
        queryOptions={{ retry: false }}
    >
        <Datagrid rowClick="show" bulkActionButtons={false}>
            <FunctionField label="Photo" sortable={false} render={(record: Agent) =>
                record.photoURL ? <img src={record.photoURL} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} alt="" /> : null
            } />
            <TextField source="matricule" label="Matricule" sortable={false} />
            <TextField source="firstName" label="Prénom" sortable={false} />
            <TextField source="lastName" label="Nom" />
            <FunctionField label="Statut" sortable={false} render={(record: Agent) =>
                record.status === 'active' ? '🟢 Actif' : '🔴 Inactif'
            } />
            <FunctionField label="En service" sortable={false} render={(record: Agent & { isServiceRunning?: boolean }) =>
                record.isServiceRunning ? '🟢 Oui' : '—'
            } />
            <TextField source="professionalCardNumber" label="Carte Pro" sortable={false} />
            <EmailField source="email" sortable={false} />
            <FunctionField label="Spécialités" sortable={false} render={(record: Agent) => record.specialties ? record.specialties.join(', ') : '—'} />
            <TextField source="contractNature" label="Contrat" sortable={false} />
            <DateField source="createdAt" label="Créé le" sortable={false} />
            <EditButton />
        </Datagrid>
    </List>
);

/** Extension du type form photo pour AgentEdit */
interface AgentEditFormData extends Omit<Partial<Agent>, 'photoURL'> {
    photoPath?: string | null;
    photoURL?: string | { rawFile: File; src?: string; title?: string } | null;
}

/**
 * transformAgentEdit — intercepte le rawFile photo avant le dataProvider.
 * Upload vers chemin canonique agent_photos/{agentId}/profile_{ts}.{ext}.
 *
 * React-Admin passe `previousData` en second argument via l'option `transform`.
 * On utilise previousData.id en priorité (source fiable) pour construire le chemin.
 *
 * En cas d'échec upload : retire le rawFile non sérialisable, restaure l'URL
 * depuis photoPath existant. Ne perd jamais la photo existante.
 */
const transformAgentEdit = async (
    data: Partial<Agent>,
    options?: { previousData?: Partial<Agent> }
): Promise<Partial<Agent>> => {
    const formData = data as AgentEditFormData;
    let cleaned: Partial<Agent> = { ...data };

    // Source fiable de l'UID : previousData.id injecté par React-Admin, data.id en fallback
    const agentId = options?.previousData?.id ?? data.id;

    if (
        formData.photoURL &&
        typeof formData.photoURL !== 'string' &&
        'rawFile' in (formData.photoURL as object)
    ) {
        const rawFile = (formData.photoURL as { rawFile: File }).rawFile;

        // Garde : si l'UID est introuvable, ne pas tenter l'upload
        if (!agentId) {
            console.warn('[AgentEdit] Missing agent id for photo upload — skipping');
            const { photoURL: _rawObj, ...dataWithoutRaw } = cleaned as Record<string, unknown>;
            const existingPhotoPath = formData.photoPath;
            if (existingPhotoPath) {
                try {
                    const restoredUrl = await getDownloadURL(ref(storage, existingPhotoPath));
                    return { ...(dataWithoutRaw as Partial<Agent>), photoURL: restoredUrl };
                } catch {
                    return dataWithoutRaw as Partial<Agent>;
                }
            }
            return dataWithoutRaw as Partial<Agent>;
        }

        try {
            const mimeToExt: Record<string, string> = {
                'image/jpeg': 'jpg', 'image/jpg': 'jpg',
                'image/png': 'png',  'image/webp': 'webp',
            };
            const ext = mimeToExt[rawFile.type] ?? (rawFile.name.split('.').pop() ?? 'jpg');
            const ts  = new Date().toISOString().replace(/[:.]/g, '-');
            const storagePath = `agent_photos/${agentId}/profile_${ts}.${ext}`;
            const storageRef  = ref(storage, storagePath);
            await uploadBytes(storageRef, rawFile, { contentType: rawFile.type });
            const photoURL = await getDownloadURL(storageRef);
            cleaned = {
                ...cleaned,
                photoURL,
                photoPath:     storagePath,
                photoFileName: rawFile.name,
                photoMimeType: rawFile.type,
                photoUpdatedAt: new Date().toISOString(),
            } as Partial<Agent>;
        } catch (err) {
            console.warn('[AgentEdit] Photo upload failed (non-blocking):', err);
            const { photoURL: _rawObj, ...dataWithoutRaw } = cleaned as Record<string, unknown>;
            const existingPhotoPath = formData.photoPath;
            if (existingPhotoPath) {
                try {
                    const restoredUrl = await getDownloadURL(ref(storage, existingPhotoPath));
                    cleaned = { ...(dataWithoutRaw as Partial<Agent>), photoURL: restoredUrl };
                } catch {
                    cleaned = dataWithoutRaw as Partial<Agent>;
                }
            } else {
                cleaned = dataWithoutRaw as Partial<Agent>;
            }
        }
    }

    return cleaned;
};

// Custom Robust Edit Component

// Define Toolbar outside to avoid re-creation on render.
// DeleteButton needs 'resource' prop or context. Since we are in TabbedForm which provides ResourceContext,
// but DeleteButton explicitly asked for it in the error, we keep resource="agents".
// Custom Toolbar for Edit
const AgentEditToolbar = () => (
    <Toolbar>
        <SaveButton />
        <DeleteButton />
    </Toolbar>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AgentEdit = (props: any) => {
    return (
        <Edit {...props} resource="agents" mutationMode="pessimistic" transform={transformAgentEdit}>
            <TabbedForm toolbar={<AgentEditToolbar />}>
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
                            formData.specialties && formData.specialties.includes('CYNO') && (
                                <Box sx={{ width: '100%' }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                        Identifications chiens — tous reportés sur le badge (1 obligatoire, 3 maximum)
                                    </Typography>
                                    <TextInput
                                        source="dogIds"
                                        label="Chien 1 — Numéro d'identification"
                                        validate={[required(), validateDogId]}
                                        fullWidth
                                        helperText="15 chiffres (Ex: 250 268 780 869 046)"
                                        {...rest}
                                    />
                                    <TextInput
                                        source="dog2Id"
                                        label="Chien 2 — Numéro d'identification (optionnel)"
                                        validate={validateDogId}
                                        fullWidth
                                        helperText="15 chiffres — laisser vide si pas de 2ème chien"
                                        {...rest}
                                    />
                                    <TextInput
                                        source="dog3Id"
                                        label="Chien 3 — Numéro d'identification (optionnel)"
                                        validate={validateDogId}
                                        fullWidth
                                        helperText="15 chiffres — laisser vide si pas de 3ème chien"
                                        {...rest}
                                    />
                                </Box>
                            )
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
        </Edit>
    );
};

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
            // Temps 1 — extraire rawFile sans uploader, créer l'agent via callable
            let rawFile: File | null = null;
            if (formData.photoURL && typeof formData.photoURL !== 'string' && 'rawFile' in formData.photoURL) {
                rawFile = formData.photoURL.rawFile;
            }

            const functions = getFunctions(undefined, 'europe-west1');
            const createAgentFn = httpsCallable(functions, 'createAgent');

            // createAgent retourne { uid } — utilisé pour le chemin canonique
            const result = await createAgentFn({ ...data, photoURL: null }) as { data: { uid: string } };
            const agentUid = result.data.uid;

            // Temps 2 — upload photo vers chemin canonique post-création
            let successMessage = 'Agent créé avec succès';
            if (rawFile && agentUid) {
                try {
                    const mimeToExt: Record<string, string> = {
                        'image/jpeg': 'jpg', 'image/jpg': 'jpg',
                        'image/png': 'png',  'image/webp': 'webp',
                    };
                    const ext = mimeToExt[rawFile.type] ?? (rawFile.name.split('.').pop() ?? 'jpg');
                    const ts  = new Date().toISOString().replace(/[:.]/g, '-');
                    const storagePath = `agent_photos/${agentUid}/profile_${ts}.${ext}`;
                    const storageRef  = ref(storage, storagePath);
                    await uploadBytes(storageRef, rawFile, { contentType: rawFile.type });
                    const photoURL = await getDownloadURL(storageRef);
                    // setDoc merge:true — robuste même si le doc n'est pas encore stable
                    await setDoc(doc(db, 'agents', agentUid), {
                        photoURL,
                        photoPath:     storagePath,
                        photoFileName: rawFile.name,
                        photoMimeType: rawFile.type,
                        photoUpdatedAt: new Date().toISOString(),
                    }, { merge: true });
                } catch (photoErr) {
                    console.warn('[AgentCreate] Photo upload failed (non-blocking):', photoErr);
                    successMessage = "Agent créé. La photo n'a pas pu être chargée.";
                }
            }

            notify(successMessage, successMessage.includes('photo') ? { type: 'warning' } : undefined);
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

// ─── Agent Show ────────────────────────────────────────────────────────────────────────────

/**
 * downloadPdfBlob — génère un PDF à la demande et déclenche le téléchargement.
 * Remplace PDFDownloadLink (pré-rendu au mount) qui bloquait la toolbar
 * sur "ÉCHARGEMENT..." dès que le document PDF avait un souci interne.
 */
const downloadPdfBlob = async (element: React.ReactElement, fileName: string) => {
    // @react-pdf/renderer pdf() attend <Document>, mais le JSX est inféré <unknown> :
    // cast as any est le pattern recommandé pour lever ce mismatch de types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blob = await pdf(element as any).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

/**
 * AgentShowContent — contenu de la fiche agent.
 * Reçoit record et isPending en props explicites.
 * Aucune dépendance à useShowContext ou au ShowContextProvider de React-Admin.
 */
const AgentShowContent = ({
    record,
    isPending,
}: {
    record: Agent | undefined;
    isPending: boolean;
}) => {
    const [generating, setGenerating] = useState<'badge' | 'fiche' | null>(null);
    const redirect = useRedirect();

    const handleBadge = async () => {
        if (!record) return;
        setGenerating('badge');
        try {
            let logoBase64: string | null = null;
            try { logoBase64 = await imageUrlToPngBase64(logoUrl); } catch { /* logo optionnel */ }
            const photoBase64 = await resolveAgentPhotoBase64(record);
            await downloadPdfBlob(
                <AgentBadgePdf agent={record} photoBase64={photoBase64} logoBase64={logoBase64} />,
                `Badge-${record.lastName ?? 'Agent'}-${record.firstName ?? ''}.pdf`
            );
        } catch (err) {
            console.error('Erreur génération badge PDF:', err);
        } finally {
            setGenerating(null);
        }
    };

    const handleFiche = async () => {
        if (!record) return;
        setGenerating('fiche');
        try {
            const photoBase64 = await resolveAgentPhotoBase64(record);
            await downloadPdfBlob(
                <AgentProfilePdf agent={record} photoBase64={photoBase64} />,
                `Fiche-${record.lastName ?? 'Agent'}-${record.firstName ?? ''}.pdf`
            );
        } catch (err) {
            console.error('Erreur génération fiche PDF:', err);
        } finally {
            setGenerating(null);
        }
    };

    return (
        <>
            <TopToolbar>
                <Button
                    variant="outlined"
                    color="inherit"
                    startIcon={<EditIcon />}
                    onClick={() => {
                        if (!record?.id) return;
                        redirect(`/agents/${record.id}`);
                    }}
                    disabled={!record || isPending || !!generating}
                    size="small"
                >
                    EDIT
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={generating === 'badge' ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
                    onClick={handleBadge}
                    disabled={!record || isPending || !!generating}
                    size="small"
                >
                    {generating === 'badge' ? 'Génération...' : 'Badge PDF'}
                </Button>
                <Button
                    variant="contained"
                    color="secondary"
                    startIcon={generating === 'fiche' ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
                    onClick={handleFiche}
                    disabled={!record || isPending || !!generating}
                    size="small"
                >
                    {generating === 'fiche' ? 'Génération...' : 'Fiche PDF'}
                </Button>
            </TopToolbar>

            <RecordContextProvider value={record}>
                <SimpleShowLayout record={record}>
                    <FunctionField
                        label="Photo"
                        render={(record: Agent) =>
                            record.photoURL
                                ? <img src={record.photoURL as string} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                                : '—'
                        }
                    />
                    <TextField source="matricule"              label="Matricule" />
                    <TextField source="firstName"              label="Prénom" />
                    <TextField source="lastName"               label="Nom" />
                    <EmailField source="email" />
                    <FunctionField
                        label="Statut"
                        render={(record: Agent) => record.status === 'active' ? '🟢 Actif' : '🔴 Inactif'}
                    />
                    <FunctionField
                        label="En service"
                        render={(record: Agent & { isServiceRunning?: boolean }) =>
                            record.isServiceRunning ? '🟢 Oui' : '—'
                        }
                    />
                    <FunctionField
                        label="Spécialités"
                        render={(record: Agent) => record.specialties ? record.specialties.join(', ') : '—'}
                    />
                    <TextField source="contractNature"         label="Contrat" />
                    <TextField source="professionalCardNumber" label="Carte Pro" />
                    <FunctionField
                        label="Validité Carte Pro"
                        render={(record: Agent) => {
                            if (!record.professionalCardObtainedAt) return '—';
                            const d = new Date(record.professionalCardObtainedAt);
                            d.setFullYear(d.getFullYear() + 5);
                            return d.toLocaleDateString();
                        }}
                    />
                    <TextField source="sstNumber"              label="Numéro SST" />
                    <DateField  source="sstExpiresAt"          label="SST expire le" />
                    <TextField source="phone"                  label="Téléphone" />
                    <TextField source="city"                   label="Ville" />
                    <DateField  source="createdAt"             label="Créé le" showTime />
                </SimpleShowLayout>
            </RecordContextProvider>
        </>
    );
};

/**
 * AgentShow — fiche de consultation (lecture seule).
 * Chargement déterministe via useDataProvider + useEffect.
 * Élimine le cache optimiste instable de useGetOne hors <Show>.
 * États explicites : chargement / erreur / not found / succès.
 */
export const AgentShow = () => {
    const { id } = useParams<{ id: string }>();

    const [record, setRecord]       = useState<Agent | undefined>(undefined);
    const [isPending, setIsPending] = useState(true);
    const [error, setError]         = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            if (!id) {
                if (!cancelled) {
                    setError('Identifiant agent introuvable.');
                    setIsPending(false);
                }
                return;
            }

            setIsPending(true);
            setError(null);

            try {
                const snap = await getDoc(doc(db, 'agents', id));

                console.log(
                    `[AgentShow direct] id=${id} | exists=${snap.exists()} | keys=${snap.exists() ? Object.keys(snap.data() ?? {}).join(',') : 'null'}`
                );

                if (!cancelled) {
                    if (snap.exists()) {
                        setRecord({
                            id: snap.id,
                            ...(snap.data() as Omit<Agent, 'id'>),
                        });
                    } else {
                        setRecord(undefined);
                    }
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Erreur inconnue.');
                    setRecord(undefined);
                }
            } finally {
                if (!cancelled) setIsPending(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [id]);

    if (error) {
        return <div style={{ padding: 24, color: 'red' }}>Erreur : {error}</div>;
    }

    if (isPending) {
        return <AgentShowContent record={undefined} isPending={true} />;
    }

    if (!record) {
        return <div style={{ padding: 24 }}>Agent introuvable.</div>;
    }

    return (
        <RecordContextProvider value={record}>
            <AgentShowContent record={record} isPending={false} />
        </RecordContextProvider>
    );
};
