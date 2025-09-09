import { createTheme } from '@mui/material/styles';

// Common theme overrides
const commonComponents = {
    MuiButton: {
        styleOverrides: {
            root: {
                textTransform: 'none',
                borderRadius: 12,
                fontSize: '0.875rem',
                fontWeight: 600,
                padding: '8px 20px',
                boxShadow: 'none',
                '&:hover': {
                    boxShadow: '0 4px 16px rgba(37, 99, 235, 0.3)',
                    transform: 'translateY(-1px)',
                    transition: 'all 0.2s ease',
                },
            },
            contained: {
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                '&:hover': {
                    background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                },
            },
        },
    },
    MuiCard: {
        styleOverrides: {
            root: {
                borderRadius: 16,
                boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(148, 163, 184, 0.1)',
            },
        },
    },
    MuiPaper: {
        styleOverrides: {
            root: {
                borderRadius: 12,
                backgroundImage: 'none',
                border: '1px solid rgba(148, 163, 184, 0.1)',
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
                borderRadius: 12,
                transition: 'all 0.2s ease',
                '&:hover': {
                    backgroundColor: 'rgba(37, 99, 235, 0.08)',
                    transform: 'scale(1.05)',
                },
            },
        },
    },
    MuiAppBar: {
        styleOverrides: {
            root: {
                // Glassmorphism + login palette gradient
                background: 'linear-gradient(135deg, rgba(25,118,210,0.55) 0%, rgba(21,101,192,0.55) 100%)',
                color: '#ffffff',
                boxShadow: '0 8px 24px rgba(13,27,42,0.25)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 0,
            },
        },
    },
    MuiToolbar: {
        styleOverrides: {
            root: {
                paddingTop: 'env(safe-area-inset-top, 0px)',
            },
        },
    },
    MuiDrawer: {
        styleOverrides: {
            paper: {
                backgroundColor: '#1a1a1a',
                borderRight: '1px solid rgba(148, 163, 184, 0.1)',
            },
        },
    },
    MuiChip: {
        styleOverrides: {
            root: {
                borderRadius: 8,
                fontWeight: 500,
            },
            filled: {
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                color: '#a78bfa',
                border: '1px solid rgba(139, 92, 246, 0.3)',
            },
        },
    },
    MuiTextField: {
        styleOverrides: {
            root: {
                '& .MuiOutlinedInput-root': {
                    borderRadius: 12,
                    backgroundColor: 'rgba(26, 26, 26, 0.6)',
                    '& fieldset': {
                        borderColor: 'rgba(148, 163, 184, 0.3)',
                    },
                    '&:hover fieldset': {
                        borderColor: 'rgba(139, 92, 246, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                        borderColor: '#8b5cf6',
                        boxShadow: '0 0 0 3px rgba(139, 92, 246, 0.1)',
                    },
                },
            },
        },
    },
};

// Modern Dark theme inspired by sophisticated interfaces
export const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#2563eb',     // Professional blue
            light: '#3b82f6',    // Light blue
            dark: '#1d4ed8',     // Deep blue
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#dc2626',     // Professional red
            light: '#ef4444',    // Light red
            dark: '#b91c1c',     // Deep red
            contrastText: '#ffffff',
        },
        success: {
            main: '#059669',     // Professional green
            light: '#10b981',    
            dark: '#047857',
        },
        warning: {
            main: '#ea580c',     // Professional orange
            light: '#f97316',
            dark: '#c2410c',
        },
        error: {
            main: '#dc2626',     // Professional red
            light: '#ef4444',
            dark: '#b91c1c',
        },
        background: {
            default: '#0f0f0f',  // Deep black background
            paper: '#1a1a1a',    // Dark gray cards
            surface: '#262626',  // Elevated surfaces
        },
        text: {
            primary: '#f8fafc',         // Near white
            secondary: '#94a3b8',       // Cool gray
            disabled: '#64748b',        // Muted gray
        },
        divider: 'rgba(148, 163, 184, 0.12)',  // Subtle gray dividers
        action: {
            hover: 'rgba(37, 99, 235, 0.08)',     // Blue hover
            selected: 'rgba(37, 99, 235, 0.12)',  // Blue selection
            disabled: 'rgba(100, 116, 139, 0.3)', // Disabled actions
            focus: 'rgba(37, 99, 235, 0.25)',     // Focus states
        },
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

// Professional Light theme
export const lightTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#2563eb',     // Professional blue - same as dark
            light: '#3b82f6',    // Light blue
            dark: '#1d4ed8',     // Deep blue
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#dc2626',     // Professional red - same as dark
            light: '#ef4444',    // Light red
            dark: '#b91c1c',     // Deep red
            contrastText: '#ffffff',
        },
        success: {
            main: '#059669',     // Professional green - same as dark
            light: '#10b981',    
            dark: '#047857',
        },
        warning: {
            main: '#ea580c',     // Professional orange - same as dark
            light: '#f97316',
            dark: '#c2410c',
        },
        error: {
            main: '#dc2626',     // Professional red - same as dark
            light: '#ef4444',
            dark: '#b91c1c',
        },
        background: {
            default: '#f8fafc',  // Very light gray instead of white
            paper: '#ffffff',    // White for cards
            surface: '#f1f5f9',  // Light gray for elevated surfaces
        },
        text: {
            primary: '#0f172a',        // Very dark gray for excellent contrast
            secondary: '#475569',      // Medium gray
            disabled: '#94a3b8',       // Light gray for disabled
        },
        divider: 'rgba(15, 23, 42, 0.12)',  // Dark gray dividers
        action: {
            hover: 'rgba(37, 99, 235, 0.08)',     // Blue hover - same as dark
            selected: 'rgba(37, 99, 235, 0.12)',  // Blue selection - same as dark
            disabled: 'rgba(148, 163, 184, 0.3)', // Disabled actions
            focus: 'rgba(37, 99, 235, 0.25)',     // Focus states - same as dark
        },
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
