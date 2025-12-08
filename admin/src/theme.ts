import { defaultTheme } from 'react-admin';

export const mocynoTheme = {
    ...defaultTheme,
    palette: {
        mode: 'light' as const, // Fixes TS error
        primary: {
            main: '#CD1A20', // Mo'Cyno Red
        },
        secondary: {
            main: '#000000', // Black
        },
        background: {
            default: '#f4f6f8',
            paper: '#ffffff',
        },
    },
    typography: {
        fontFamily: [
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
        ].join(','),
        h1: {
            fontWeight: 700,
        },
        h2: {
            fontWeight: 700,
        },
    },
    components: {
        ...defaultTheme.components,
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: '#000000', // Black Header
                    color: '#ffffff',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                },
            },
        },
    },
};
