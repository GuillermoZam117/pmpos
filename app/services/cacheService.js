/**
 * Cache Service for PMPOS
 * Manages caching of tables and other frequently accessed data
 */
import debug from '../utils/debug';

const CACHE_KEYS = {
    TABLES: 'pmpos_cached_tables',
    TABLES_TIMESTAMP: 'pmpos_tables_timestamp',
    MENU: 'pmpos_cached_menu',
    MENU_TIMESTAMP: 'pmpos_menu_timestamp'
};

const CACHE_DURATION = {
    TABLES: 5 * 60 * 1000, // 5 minutes
    MENU: 10 * 60 * 1000   // 10 minutes
};

class CacheService {
    /**
     * Set cached data with timestamp
     */
    set(key, data, duration = 5 * 60 * 1000) {
        try {
            const cacheData = {
                data,
                timestamp: Date.now(),
                duration
            };
            localStorage.setItem(key, JSON.stringify(cacheData));
            console.log(`📦 Cache SET: ${key}`);
        } catch (error) {
            console.warn('Cache SET failed:', error);
        }
    }

    /**
     * Get cached data if not expired
     */
    get(key) {
        try {
            const cached = localStorage.getItem(key);
            if (!cached) {
                console.log(`📦 Cache MISS: ${key}`);
                return null;
            }

            const cacheData = JSON.parse(cached);
            const now = Date.now();
            const isExpired = (now - cacheData.timestamp) > cacheData.duration;

            if (isExpired) {
                console.log(`📦 Cache EXPIRED: ${key}`);
                this.remove(key);
                return null;
            }

            console.log(`📦 Cache HIT: ${key}`);
            return cacheData.data;
        } catch (error) {
            console.warn('Cache GET failed:', error);
            return null;
        }
    }

    /**
     * Remove cached data
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            console.log(`📦 Cache REMOVE: ${key}`);
        } catch (error) {
            console.warn('Cache REMOVE failed:', error);
        }
    }

    /**
     * Clear all cache
     */
    clear() {
        try {
            Object.values(CACHE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            console.log('📦 Cache CLEARED ALL');
        } catch (error) {
            console.warn('Cache CLEAR failed:', error);
        }
    }

    /**
     * Cache tables data
     */
    setTables(tables) {
        this.set(CACHE_KEYS.TABLES, tables, CACHE_DURATION.TABLES);
    }

    /**
     * Get cached tables
     */
    getTables() {
        return this.get(CACHE_KEYS.TABLES);
    }

    /**
     * Cache menu data
     */
    setMenu(menu) {
        this.set(CACHE_KEYS.MENU, menu, CACHE_DURATION.MENU);
    }

    /**
     * Get cached menu
     */
    getMenu() {
        return this.get(CACHE_KEYS.MENU);
    }

    /**
     * Check if tables cache is valid
     */
    isTablesValid() {
        return this.getTables() !== null;
    }

    /**
     * Check if menu cache is valid
     */
    isMenuValid() {
        return this.getMenu() !== null;
    }

    /**
     * Force refresh by clearing specific cache
     */
    invalidateTables() {
        this.remove(CACHE_KEYS.TABLES);
    }

    invalidateMenu() {
        this.remove(CACHE_KEYS.MENU);
    }

    /**
     * Clear tables cache (alias for invalidateTables)
     */
    clearTables() {
        this.invalidateTables();
    }

    /**
     * Clear menu cache (alias for invalidateMenu)
     */
    clearMenu() {
        this.invalidateMenu();
    }

    /**
     * Clear terminal-related cache
     */
    clearTerminal() {
        // Clear any terminal-related cache keys
        const terminalKeys = Object.keys(localStorage).filter(key => 
            key.includes('terminal') || key.includes('ticket')
        );
        terminalKeys.forEach(key => localStorage.removeItem(key));
        debug('🗑️ Cleared terminal cache keys:', terminalKeys);
    }

    /**
     * Clear all cache
     */
    clearAll() {
        this.invalidateTables();
        this.invalidateMenu();
        this.clearTerminal();
    }
}

export default new CacheService(); 