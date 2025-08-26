import { createTheme } from '@mui/material/styles';

// Common theme overrides
const commonComponents = {
    MuiButton: {
        styleOverrides: {
            root: {
                textTransform: 'none',
                borderRadius: 8,
                fontSize: '0.875rem',
                fontWeight: 500,
            },
        },
    },
    MuiCard: {
        styleOverrides: {
            root: {
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            },
        },
    },
    MuiPaper: {
        styleOverrides: {
            root: {
                borderRadius: 8,
            },
        },
    },
    MuiAppBar: {
        styleOverrides: {
            root: {
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            },
        },
    },
    MuiIconButton: {
        styleOverrides: {
            root: {
                borderRadius: 8,
            },
        },
    },
};

// Dark theme
export const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#2196f3',
            light: '#64b5f6',
            dark: '#1976d2',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#f50057',
            light: '#ff5983',
            dark: '#c51162',
            contrastText: '#ffffff',
        },
        success: {
            main: '#4caf50',
            light: '#81c784',
            dark: '#388e3c',
        },
        warning: {
            main: '#ff9800',
            light: '#ffb74d',
            dark: '#f57c00',
        },
        error: {
            main: '#f44336',
            light: '#ef5350',
            dark: '#d32f2f',
        },
        background: {
            default: '#121212',
            paper: '#1e1e1e',
            surface: '#2c2c2c',
        },
        text: {
            primary: '#ffffff',
            secondary: 'rgba(255, 255, 255, 0.7)',
        },
        divider: 'rgba(255, 255, 255, 0.12)',
    },
    typography: {
        fontFamily: ['Roboto', 'Arial', 'sans-serif'].join(','),
        h4: {
            fontWeight: 600,
            fontSize: '1.5rem',
        },
        h5: {
            fontWeight: 600,
            fontSize: '1.25rem',
        },
        h6: {
            fontWeight: 500,
            fontSize: '1.125rem',
        },
        body1: {
            fontSize: '0.875rem',
        },
        body2: {
            fontSize: '0.75rem',
        },
        button: {
            fontSize: '0.875rem',
            fontWeight: 500,
        },
    },
    shape: {
        borderRadius: 8,
    },
    components: commonComponents,
});

// Light theme
export const lightTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#1976d2',
            light: '#42a5f5',
            dark: '#1565c0',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#dc004e',
            light: '#ff5983',
            dark: '#9a0036',
            contrastText: '#ffffff',
        },
        success: {
            main: '#2e7d32',
            light: '#4caf50',
            dark: '#1b5e20',
        },
        warning: {
            main: '#ed6c02',
            light: '#ff9800',
            dark: '#e65100',
        },
        error: {
            main: '#d32f2f',
            light: '#ef5350',
            dark: '#c62828',
        },
        background: {
            default: '#fafafa',
            paper: '#ffffff',
            surface: '#f5f5f5',
        },
        text: {
            primary: 'rgba(0, 0, 0, 0.87)',
            secondary: 'rgba(0, 0, 0, 0.6)',
        },
        divider: 'rgba(0, 0, 0, 0.12)',
    },
    typography: {
        fontFamily: ['Roboto', 'Arial', 'sans-serif'].join(','),
        h4: {
            fontWeight: 600,
            fontSize: '1.5rem',
        },
        h5: {
            fontWeight: 600,
            fontSize: '1.25rem',
        },
        h6: {
            fontWeight: 500,
            fontSize: '1.125rem',
        },
        body1: {
            fontSize: '0.875rem',
        },
        body2: {
            fontSize: '0.75rem',
        },
        button: {
            fontSize: '0.875rem',
            fontWeight: 500,
        },
    },
    shape: {
        borderRadius: 8,
    },
    components: commonComponents,
});

// Theme utility functions
export const getTheme = (isDark) => isDark ? darkTheme : lightTheme;

export const themeConfig = {
    STORAGE_KEY: 'pmpos_theme_mode',
    DEFAULT_MODE: 'dark', // Default to dark theme
};