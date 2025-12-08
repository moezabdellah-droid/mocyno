import { useState } from 'react';
import { Card, CardContent, CardHeader, Button, TextField } from '@mui/material';
import { Title, useNotify } from 'react-admin';
import { auth } from '../firebase';
import { updatePassword } from 'firebase/auth';

const Profile = () => {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const notify = useNotify();

    const handleSubmit = async () => {
        if (password !== confirm) {
            notify("Les mots de passe ne correspondent pas", { type: 'warning' });
            return;
        }
        if (password.length < 6) {
            notify("Le mot de passe doit faire au moins 6 caractères", { type: 'warning' });
            return;
        }

        setLoading(true);
        const user = auth.currentUser;

        if (user) {
            try {
                await updatePassword(user, password);
                notify("Mot de passe mis à jour avec succès");
                setPassword('');
                setConfirm('');
            } catch (error: any) {
                notify("Erreur: " + error.message, { type: 'error' });
            }
        }
        setLoading(false);
    };

    return (
        <Card>
            <Title title="Mon Profil" />
            <CardHeader title="Gestion du Compte Admin" />
            <CardContent>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
                    <h3>Changer mon mot de passe</h3>
                    <TextField
                        label="Nouveau mot de passe"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                    <TextField
                        label="Confirmer mot de passe"
                        type="password"
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                    />
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? "Mise à jour..." : "Mettre à jour"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default Profile;
