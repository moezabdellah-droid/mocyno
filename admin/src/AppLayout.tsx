import type { LayoutProps } from 'react-admin';
import { Layout, AppBar } from 'react-admin';

const CustomAppBar = (props: Parameters<typeof AppBar>[0]) => {
    return <AppBar {...props} />;
};

const AppLayout = (props: LayoutProps) => {
    return <Layout {...props} appBar={CustomAppBar} />;
};

export default AppLayout;

