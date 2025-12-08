import { Login, LoginForm, TextInput, required } from 'react-admin';

const CustomLoginPage = () => (
    <Login
        backgroundImage="https://images.unsplash.com/photo-1497215728101-856f4ea42174?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"
        sx={{
            '& .RaLogin-avatar': {
                display: 'none',
            },
            '& .MuiPaper-root': {
                padding: '1rem',
                minWidth: '350px'
            }
        }}
    >
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '1rem',
            color: '#333'
        }}>
            <h2 style={{ margin: 0, color: '#1976d2' }}>MO'CYNO</h2>
            <p style={{ margin: '5px 0 0', fontWeight: 'bold' }}>Connexion Admin</p>
        </div>
        <LoginForm>
            <TextInput source="username" label="Email" validate={required()} fullWidth />
            <TextInput source="password" label="Mot de passe" type="password" validate={required()} fullWidth />
        </LoginForm>
    </Login>
);

export default CustomLoginPage;
