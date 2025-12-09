import * as React from 'react';
import type { LayoutProps } from 'react-admin';
import { Layout, AppBar, TitlePortal } from 'react-admin';

const CustomAppBar = (props: React.ComponentProps<typeof AppBar>) => (
    <AppBar {...props}>
        <TitlePortal />
    </AppBar>
);

const AppLayout = (props: LayoutProps) => (
    <Layout {...props} appBar={CustomAppBar} />
);

export default AppLayout;
