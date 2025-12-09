import { Login, LoginForm, TextInput, required } from 'react-admin';

const CustomLoginPage = () => (
    <Login>
        <LoginForm>
            <TextInput
                source="username"
                label="Email"
                type="email"
                validate={required()}
                fullWidth
            />
            <TextInput
                source="password"
                label="Mot de passe"
                type="password"
                validate={required()}
                fullWidth
            />
        </LoginForm>
    </Login>
);

export default CustomLoginPage;
