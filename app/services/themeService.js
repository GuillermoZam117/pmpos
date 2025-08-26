/**
 * Theme Service for PMPOS
 * Manages theme switching and persistence
 */
import { themeConfig } from '../theme';

class ThemeService {
    constructor() {
        this.currentMode = this.getStoredTheme();
        this.subscribers = new Set();
    }

    /**
     * Get stored theme from localStorage
     */
    getStoredTheme() {
        try {
            const stored = localStorage.getItem(themeConfig.STORAGE_KEY);
            if (stored === 'light' || stored === 'dark') {
                return stored;
            }
        } catch (error) {
            console.warn('Failed to read theme from localStorage:', error);
        }
        return themeConfig.DEFAULT_MODE;
    }

    /**
     * Save theme to localStorage
     */
    saveTheme(mode) {
        try {
            localStorage.setItem(themeConfig.STORAGE_KEY, mode);
        } catch (error) {
            console.warn('Failed to save theme to localStorage:', error);
        }
    }

    /**
     * Get current theme mode
     */
    getThemeMode() {
        return this.currentMode;
    }

    /**
     * Check if dark mode is active
     */
    isDarkMode() {
        return this.currentMode === 'dark';
    }

    /**
     * Check if light mode is active
     */
    isLightMode() {
        return this.currentMode === 'light';
    }

    /**
     * Toggle theme between light and dark
     */
    toggleTheme() {
        const newMode = this.currentMode === 'dark' ? 'light' : 'dark';
        this.setTheme(newMode);
        return newMode;
    }

    /**
     * Set specific theme mode
     */
    setTheme(mode) {
        if (mode !== 'light' && mode !== 'dark') {
            console.warn('Invalid theme mode:', mode);
            return;
        }

        this.currentMode = mode;
        this.saveTheme(mode);
        this.notifySubscribers(mode);
    }

    /**
     * Subscribe to theme changes
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        
        // Return unsubscribe function
        return () => {
            this.subscribers.delete(callback);
        };
    }

    /**
     * Notify all subscribers of theme change
     */
    notifySubscribers(mode) {
        this.subscribers.forEach(callback => {
            try {
                callback(mode);
            } catch (error) {
                console.error('Error in theme subscriber:', error);
            }
        });
    }

    /**
     * Get system theme preference
     */
    getSystemTheme() {
        if (typeof window !== 'undefined' && window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'light';
    }

    /**
     * Use system theme
     */
    useSystemTheme() {
        const systemTheme = this.getSystemTheme();
        this.setTheme(systemTheme);
        
        // Listen for system theme changes
        if (typeof window !== 'undefined' && window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                this.setTheme(e.matches ? 'dark' : 'light');
            });
        }
    }

    /**
     * Reset to default theme
     */
    resetToDefault() {
        this.setTheme(themeConfig.DEFAULT_MODE);
    }
}

export default new ThemeService();
export { ThemeService };