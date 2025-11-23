/**
 * Terminal Service - cleaned
 * No local fabricated terminal IDs. On failure, registration returns null.
 */

import Debug from 'debug';
import { graphqlSimple, gqlEscape } from './graphqlService';
import { appconfig } from '../config';

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

                // If we have stored terminals, also check for current user in localStorage
                try {
                    const userData = localStorage.getItem('user');
                    if (userData) {
                        const user = JSON.parse(userData);
                        const userName = user?.name;
                        if (userName && this._terminalsByUser.has(userName)) {
                            debug('✅ Restored current user with terminal from storage:', userName);
                            this._currentUser = userName;
                        }
                    }
                } catch (e) {
                    debug('⚠️ Could not restore current user from storage:', e);
                }
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
        const oldUser = this._currentUser;
        this._currentUser = userName;
        debug('👤 Current user changed from', oldUser, 'to:', userName);

        // If setting to same user that already has terminal, nothing to do
        if (userName && oldUser === userName && this.getTerminalId(userName)) {
            debug('✅ User unchanged and has terminal, no action needed');
        }
    }

    getTerminalId(userName = null) {
        const user = userName || this._currentUser;

        // Enhanced debugging for terminal ID retrieval
        debug('🔍 getTerminalId called:', {
            requestedUser: userName,
            currentUser: this._currentUser,
            effectiveUser: user,
            hasUser: !!user
        });

        if (!user) {
            debug('❌ getTerminalId: No user specified');
            return null;
        }

        // ONLY look in _terminalsByUser - respects "one terminal per user" principle
        const terminalId = this._terminalsByUser.get(user);
        if (terminalId) {
            debug('✅ getTerminalId: Found terminal for user:', { user, terminalId });
            return terminalId;
        }

        debug('❌ getTerminalId: No terminal found for user:', user);
        return null;
    }

    setTerminalId(id, userName = null) {
        if (!id) return;
        const user = userName || this._currentUser;
        if (!user) return;

        // Store terminal ID for this specific user
        this._terminalsByUser.set(user, id);
        this.saveTerminals();

        // Mark user as server-registered
        this._serverRegisteredUsers.add(user);

        debug('✅ Terminal ID set for user', user + ':', id);
    }

    async ensureTerminalRegistered(user = null) {
        const userName = user || this._currentUser;
        if (!userName) {
            debug('❌ ensureTerminalRegistered: No user specified');
            return null;
        }
        if (!this._currentUser) this.setCurrentUser(userName);

        // Check if we already have a valid terminal ID for this user
        const existingId = this.getTerminalId(userName);
        if (existingId) {
            debug('✅ ensureTerminalRegistered: Using existing terminal ID:', existingId);
            return existingId;
        }

        // Skip registration if explicitly disabled
        if (process.env.REACT_APP_SKIP_TERMINAL_REGISTER === 'true') {
            debug('⚠️ Terminal registration skipped by environment variable');
            return null;
        }

        // Prevent concurrent registrations for the same user
        if (this._registrationInFlight && this._registrationPromise) {
            debug('⏳ Terminal registration already in flight, waiting...');
            return await this._registrationPromise;
        }

        debug('🚀 Starting terminal registration for user:', userName);
        this._registrationInFlight = true;
        this._registrationPromise = this._performRegistration(userName);

        try {
            const terminalId = await this._registrationPromise;
            if (terminalId) {
                this.setTerminalId(terminalId, userName);
                debug('✅ Terminal registration successful:', terminalId);

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
            debug('⚠️ Terminal registration returned no ID for user', userName);
            return null;
        } catch (error) {
            debug('❌ Terminal registration failed for user', userName + ':', error?.message || error);
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
        // Registrar terminal usando los parámetros correctos según documentación real
        try {
            const cfg = appconfig();
            const terminalName = cfg?.terminalName || 'SERVIDOR';
            const departmentName = cfg?.departmentName || 'MESAS';
            const ticketTypeName = cfg?.ticketTypeName || 'COMEDOR';
            const userName = user || cfg?.userName || 'CAJERO';

            const query = `mutation { 
                registerTerminal(
                    ticketType: "${gqlEscape(ticketTypeName)}",
                    terminal: "${gqlEscape(terminalName)}",
                    department: "${gqlEscape(departmentName)}",
                    user: "${gqlEscape(userName)}"
                )
            }`;

            const result = await graphqlSimple(query);

            if (result?.registerTerminal) {
                // La documentación no especifica que retorna, así que asumimos que retorna el terminalId
                const terminalId = result.registerTerminal;
                debug('✅ Terminal registered successfully:', terminalId);
                return terminalId;
            } else {
                debug('❌ Terminal registration failed - no ID returned');
                return null;
            }
        } catch (error) {
            debug('❌ Terminal registration error:', error?.message || error);
            return null;
        }
    } _isRetryableError(error) {
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

        // Clear terminal for specific user only
        this._terminalsByUser.delete(user);
        this._serverRegisteredUsers.delete(user);
        this.saveTerminals();

        // Clear registration state
        this._registrationPromise = null;
        this._registrationInFlight = false;

        debug('✅ Terminal cleared for user:', user);
    }

    clearAllTerminals() {
        this._terminalsByUser.clear();
        this._serverRegisteredUsers.clear();
        this.saveTerminals();
        this._currentUser = null;

        // Clear all legacy storage
        if (typeof window !== 'undefined') {
            try {
                localStorage.removeItem('pmpos_terminal_id');
                localStorage.removeItem('currentTerminalId');
                delete window.currentTerminalId;
            } catch (e) {
                debug('❌ Error clearing legacy storage:', e);
            }
        }

        debug('✅ All terminals cleared');
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

    // Debug helper - get current terminals state
    getTerminalsState() {
        return {
            currentUser: this._currentUser,
            terminalsByUser: Object.fromEntries(this._terminalsByUser),
            serverRegisteredUsers: Array.from(this._serverRegisteredUsers),
            registrationInFlight: this._registrationInFlight
        };
    }
}

const terminalService = new TerminalService();
export default terminalService;
export { terminalService };
