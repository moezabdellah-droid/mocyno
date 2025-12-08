// @ts-nocheck
import type { LayoutProps, AppBarProps, UserMenuProps } from 'react-admin';
import { Layout, AppBar, UserMenu, Logout } from 'react-admin';
import { MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { Link } from 'react-router-dom';
import React, { type ForwardedRef } from 'react';

// Custom User Menu Item to link to Profile
const ProfileMenu = React.forwardRef<HTMLLIElement, any>((props, ref: ForwardedRef<HTMLLIElement>) => {
    return (
        <MenuItem
            component={Link}
            to="/profile"
            ref={ref as any}
            {...props}
        >
            <ListItemIcon>
                <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Mon Profil</ListItemText>
        </MenuItem>
    );
});

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
