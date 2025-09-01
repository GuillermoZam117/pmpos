/**
 * Cache Service for PMPOS
 * Manages caching of tables and other frequently accessed data
 */
// Note: Using console.log instead of debug for cache operations

const CACHE_KEYS = {
    TABLES: 'pmpos_cached_tables',
    TABLES_TIMESTAMP: 'pmpos_tables_timestamp',
    MENU: 'pmpos_cached_menu',
    MENU_TIMESTAMP: 'pmpos_menu_timestamp'
    ,
    PENDING_TICKETS: 'pmpos_pending_tickets'
    ,
    ACTIVE_TICKETS: 'pmpos_active_tickets'
};

const CACHE_DURATION = {
    TABLES: 5 * 60 * 1000, // 5 minutes
    MENU: 10 * 60 * 1000   // 10 minutes
};

const CACHE_DURATION_EXTRA = {
    ACTIVE_TICKETS: 10 * 1000 // 10 seconds by default for active tickets
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
        console.log('🗑️ Cleared terminal cache keys:', terminalKeys);
    }

    /**
     * Active tickets cache helpers
     */
    setActiveTickets(tickets, duration = CACHE_DURATION_EXTRA.ACTIVE_TICKETS) {
        this.set(CACHE_KEYS.ACTIVE_TICKETS, tickets, duration);
    }

    getActiveTickets() {
        return this.get(CACHE_KEYS.ACTIVE_TICKETS) || null;
    }

    clearActiveTickets() {
        this.remove(CACHE_KEYS.ACTIVE_TICKETS);
    }

    /**
     * Pending local-only tickets support
     */
    _getPendingTicketsRaw() {
        try {
            const raw = localStorage.getItem(CACHE_KEYS.PENDING_TICKETS);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.warn('Failed to read pending tickets:', e);
            return [];
        }
    }

    getPendingTickets() {
        return this._getPendingTicketsRaw();
    }

    addPendingTicket(ticket) {
        try {
            const list = this._getPendingTicketsRaw();
            list.push(ticket);
            localStorage.setItem(CACHE_KEYS.PENDING_TICKETS, JSON.stringify(list));
            console.log('📥 Pending ticket added:', ticket.uid);
        } catch (e) {
            console.warn('Failed to add pending ticket:', e);
        }
    }

    removePendingTicket(uid) {
        try {
            const list = this._getPendingTicketsRaw();
            const filtered = list.filter(t => t.uid !== uid);
            localStorage.setItem(CACHE_KEYS.PENDING_TICKETS, JSON.stringify(filtered));
            console.log('🗑️ Pending ticket removed:', uid);
        } catch (e) {
            console.warn('Failed to remove pending ticket:', e);
        }
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