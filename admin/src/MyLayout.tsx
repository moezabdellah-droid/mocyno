// @ts-nocheck
import type { LayoutProps, AppBarProps, UserMenuProps } from 'react-admin';
import { Layout, AppBar, UserMenu, Logout } from 'react-admin';
import { MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNavigate } from 'react-router-dom';
import React from 'react';

// Custom User Menu Item to link to Profile
const ProfileMenu = () => {
    const navigate = useNavigate();

    return (
        <MenuItem onClick={() => navigate('/profile')}>
            <ListItemIcon>
                <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Mon Profil</ListItemText>
        </MenuItem>
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
