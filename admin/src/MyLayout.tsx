// @ts-nocheck
import type { LayoutProps, AppBarProps } from 'react-admin';
import { Layout, AppBar } from 'react-admin';
import React from 'react';

// Custom AppBar (can be customized later if needed)
const MyAppBar = (props: AppBarProps) => <AppBar {...props} />;

// Custom Layout using MyAppBar
const MyLayout = (props: LayoutProps) => <Layout {...props} appBar={MyAppBar} />;

export default MyLayout;
