/**
 * Terminal Service - cleaned
 * No local fabricated terminal IDs. On failure, registration returns null.
 */

import { registerTerminalAsync } from '../queries';
import Debug from 'debug';

const debug = Debug('pmpos:terminal');

class TerminalService {
    constructor() {
        this._terminalsByUser = new Map();
        this._serverRegisteredUsers = new Set();
        this._currentUser = null;
        this._onRegisteredCallbacks = new Set();
        this._registrationInFlight = false;
        this._registrationPromise = null;
        this.loadTerminals();
    }

    loadTerminals() {
        if (typeof window === 'undefined') return;
        try {
            const stored = localStorage.getItem('pmpos_terminals_by_user');
            if (stored) {
                const terminals = JSON.parse(stored);
                this._terminalsByUser = new Map(Object.entries(terminals));
                Object.keys(terminals).forEach(u => this._serverRegisteredUsers.add(u));
                debug('✅ Loaded terminals from storage:', terminals);
            }
        } catch (error) {
            debug('❌ Error loading terminals from storage:', error);
        }
    }

    saveTerminals() {
        if (typeof window === 'undefined') return;
        try {
            const terminals = Object.fromEntries(this._terminalsByUser);
            localStorage.setItem('pmpos_terminals_by_user', JSON.stringify(terminals));
            debug('✅ Saved terminals to storage:', terminals);
        } catch (error) {
            debug('❌ Error saving terminals to storage:', error);
        }
    }

    setCurrentUser(userName) {
        this._currentUser = userName;
        debug('👤 Current user set to:', userName);
    }

    getTerminalId(userName = null) {
        const user = userName || this._currentUser;
        if (!user) return null;

        const terminalId = this._terminalsByUser.get(user);
        if (terminalId) return terminalId;

        if (typeof window !== 'undefined') {
            try {
                if (window.currentTerminalId) return window.currentTerminalId;
                const legacy = localStorage.getItem('currentTerminalId') || localStorage.getItem('pmpos_terminal_id');
                if (legacy) return legacy;
            } catch (e) {
                debug('❌ Error reading legacy terminalId from storage:', e);
            }
        }

        return null;
    }

    setTerminalId(id, userName = null) {
        if (!id) return;
        const user = userName || this._currentUser;
        if (!user) return;

        this._terminalsByUser.set(user, id);
        this.saveTerminals();

        try {
            if (typeof window !== 'undefined') {
                window.currentTerminalId = id;
                localStorage.setItem('currentTerminalId', id);
                localStorage.setItem('pmpos_terminal_id', id);
            }
        } catch (e) {
            debug('❌ Error saving legacy terminalId keys:', e);
        }

        this._serverRegisteredUsers.add(user);
        debug('✅ Terminal ID set for user', user + ':', id);
    }

    async ensureTerminalRegistered(user = null) {
        const userName = user || this._currentUser;
        if (!userName) return null;
        if (!this._currentUser) this.setCurrentUser(userName);

        const existingId = this.getTerminalId(userName);
        if (existingId) return existingId;

        if (process.env.REACT_APP_SKIP_TERMINAL_REGISTER === 'true') return null;

        if (this._registrationInFlight && this._registrationPromise) {
            return await this._registrationPromise;
        }

        this._registrationInFlight = true;
        this._registrationPromise = this._performRegistration(userName);

        try {
            const terminalId = await this._registrationPromise;
            if (terminalId) {
                this.setTerminalId(terminalId, userName);
                // Notify listeners about successful registration
                try {
                    this._onRegisteredCallbacks.forEach(cb => {
                        try { cb(userName, terminalId); } catch (e) { debug('Callback error:', e); }
                    });
                } catch (e) {
                    debug('❌ Error invoking onRegistered callbacks:', e);
                }
                return terminalId;
            }
            debug('⚠️ Terminal registration returned no id for user', userName);
            return null;
        } catch (error) {
            debug('❌ Terminal registration failed for user', userName + ':', error);
            return null;
        } finally {
            this._registrationInFlight = false;
            this._registrationPromise = null;
        }
    }

    // Allow external modules to register a callback when a user gets a server terminalId
    onRegistered(callback) {
        if (typeof callback === 'function') this._onRegisteredCallbacks.add(callback);
        return () => this._onRegisteredCallbacks.delete(callback);
    }

    async _performRegistration(user) {
        // Registrar una sola vez; los 3 reintentos con backoff ocurren dentro de registerTerminalAsync
        try {
            const result = await registerTerminalAsync(user);
            return result || null;
        } catch (error) {
            debug('❌ Terminal registration error (no outer retries):', error?.message || error);
            return null;
        }
    }
    
    _isRetryableError(error) {
        if (!error) return false;
        
        const errorMsg = error.message || error.toString();
        const errorCode = error.code || error.status;
        
        // Network errors that should be retried
        const retryablePatterns = [
            'network',
            'timeout',
            'ECONNREFUSED',
            'ENOTFOUND', 
            'ETIMEDOUT',
            'fetch',
            'Failed to fetch',
            'NetworkError'
        ];
        
        // HTTP status codes that should be retried
        const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
        
        // Check error message patterns
        const hasRetryablePattern = retryablePatterns.some(pattern => 
            errorMsg.toLowerCase().includes(pattern.toLowerCase())
        );
        
        // Check status codes
        const hasRetryableStatus = retryableStatusCodes.includes(errorCode);
        
        const shouldRetry = hasRetryablePattern || hasRetryableStatus;
        
        debug(`🔍 Error analysis - Message: "${errorMsg}", Code: ${errorCode}, Retryable: ${shouldRetry}`);
        
        return shouldRetry;
    }

    isServerRegistered(userName = null) {
        const user = userName || this._currentUser;
        if (!user) return false;
        return this._serverRegisteredUsers.has(user);
    }

    clearTerminal(userName = null) {
        const user = userName || this._currentUser;
        if (!user) return;
        this._terminalsByUser.delete(user);
        this.saveTerminals();
        this._registrationPromise = null;
        this._registrationInFlight = false;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('pmpos_terminal_id');
            localStorage.removeItem('currentTerminalId');
            delete window.currentTerminalId;
        }
    }

    clearAllTerminals() {
        this._terminalsByUser.clear();
        this.saveTerminals();
        this._currentUser = null;
        this._serverRegisteredUsers.clear();
    }

    isRegistered() {
        return !!this.getTerminalId();
    }

    async forceReRegister(user = null) {
        this.clearTerminal(user);
        return await this.ensureTerminalRegistered(user);
    }

    async register(user) {
        const userName = typeof user === 'string' ? user : user?.name || user?.userName;
        return await this.ensureTerminalRegistered(userName);
    }
}

const terminalService = new TerminalService();
export default terminalService;
export { terminalService };
