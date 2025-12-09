// @ts-nocheck
import type { LayoutProps, AppBarProps, UserMenuProps } from 'react-admin';
import { Layout, AppBar, UserMenu, Logout, MenuItemLink } from 'react-admin';
import SettingsIcon from '@mui/icons-material/Settings';
import React from 'react';

// Custom User Menu Item to link to Profile
const ProfileMenu = () => {
    return (
        <MenuItemLink
            to="/profile"
            primaryText="Mon Profil"
            leftIcon={<SettingsIcon />}
        />
    );
};

// Custom User Menu including Profile and default Logout
const MyUserMenu = (props: UserMenuProps) => (
    <UserMenu {...props}>
        <ProfileMenu />
        <Logout />
    </UserMenu>
);

// Custom AppBar using MyUserMenu
const MyAppBar = (props: AppBarProps) => <AppBar {...props} userMenu={<MyUserMenu />} />;

// Custom Layout using MyAppBar
const MyLayout = (props: LayoutProps) => <Layout {...props} appBar={MyAppBar} />;

export default MyLayout;
