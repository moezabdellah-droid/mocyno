import type { LayoutProps, AppBarProps } from 'react-admin';
import { Layout, AppBar } from 'react-admin';

interface CustomAppBarProps extends AppBarProps {
    // Ajoutez vos props personnalisées ici si nécessaire
}

const CustomAppBar = (props: CustomAppBarProps) => {
    return <AppBar {...props} />;
};

interface AppLayoutProps extends LayoutProps {
    // Ajoutez vos props personnalisées ici si nécessaire
}

const AppLayout = (props: AppLayoutProps) => {
    return <Layout {...props} appBar={CustomAppBar} />;
};

export default AppLayout;
