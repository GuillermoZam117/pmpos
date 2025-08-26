/**
 * Theme Context for PMPOS
 * Provides theme state and controls to React components
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { getTheme } from '../theme';
import themeService from '../services/themeService';

// Create theme context
const ThemeContext = createContext();

// Theme provider component
export const ThemeProvider = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(themeService.isDarkMode());
    const [currentTheme, setCurrentTheme] = useState(getTheme(themeService.isDarkMode()));

    useEffect(() => {
        // Apply theme to document
        const applyThemeToDocument = (mode) => {
            document.documentElement.setAttribute('data-theme', mode);
            document.body.setAttribute('data-theme', mode);
        };

        // Apply initial theme
        applyThemeToDocument(isDarkMode ? 'dark' : 'light');

        // Subscribe to theme changes
        const unsubscribe = themeService.subscribe((mode) => {
            const isDark = mode === 'dark';
            setIsDarkMode(isDark);
            setCurrentTheme(getTheme(isDark));
            applyThemeToDocument(mode);
        });

        return unsubscribe;
    }, [isDarkMode]);

    const toggleTheme = () => {
        themeService.toggleTheme();
    };

    const setTheme = (mode) => {
        themeService.setTheme(mode);
    };

    const contextValue = {
        isDarkMode,
        isLightMode: !isDarkMode,
        currentTheme,
        toggleTheme,
        setTheme,
        setDarkMode: () => setTheme('dark'),
        setLightMode: () => setTheme('light'),
        useSystemTheme: () => themeService.useSystemTheme(),
        resetToDefault: () => themeService.resetToDefault(),
    };

    return (
        <ThemeContext.Provider value={contextValue}>
            <MuiThemeProvider theme={currentTheme}>
                {children}
            </MuiThemeProvider>
        </ThemeContext.Provider>
    );
};

// Hook to use theme context
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

// Export context for advanced usage
export default ThemeContext;