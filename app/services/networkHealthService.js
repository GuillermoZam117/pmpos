/**
 * Network Health Service
 * Monitorea la conectividad con SambaPOS y maneja fallbacks
 */

import Debug from 'debug';

const debug = Debug('pmpos:network');

class NetworkHealthService {
    constructor() {
        this.isOnline = navigator.onLine;
        this.sambaPOSStatus = 'unknown'; // unknown, online, offline, timeout
        this.lastCheck = null;
        this.checkInterval = null;
        this.retryAttempts = 0;
        this.maxRetries = 3;
        this.checkFrequency = 30000; // 30 segundos

        this.setupEventListeners();
        this.startHealthChecks();
    }

    setupEventListeners() {
        if (typeof window === 'undefined') return;

        window.addEventListener('online', () => {
            debug('🌐 Browser back online');
            this.isOnline = true;
            this.checkSambaPOSConnectivity();
        });

        window.addEventListener('offline', () => {
            debug('🌐 Browser went offline');
            this.isOnline = false;
            this.sambaPOSStatus = 'offline';
        });
    }

    startHealthChecks() {
        // Check immediately
        this.checkSambaPOSConnectivity();

        // Setup periodic checks
        this.checkInterval = setInterval(() => {
            this.checkSambaPOSConnectivity();
        }, this.checkFrequency);
    }

    async checkSambaPOSConnectivity() {
        if (!this.isOnline) {
            this.sambaPOSStatus = 'offline';
            return false;
        }

        try {
            // Force fresh config load to avoid cache issues
            delete require.cache[require.resolve('../config')];
            const config = require('../config').appconfig();

            // Priority order: stored server discovery result > environment > config > fallback
            const discoveredServer = localStorage.getItem('sambapos-discovered-server');
            const baseUrl = discoveredServer || process.env.SAMBAPOS_API_URL || config.GQLserv || config.baseUrl || 'http://localhost:9000';

            debug('🏥 Checking SambaPOS connectivity:', baseUrl);

            // Use GraphQL endpoint instead of non-existent health endpoint
            const graphqlUrl = `${baseUrl}/api/graphql`;
            const simpleQuery = '{ __typename }'; // Simple introspection query

            // Try to get authentication token if available
            let authHeaders = {
                'Content-Type': 'application/json',
            };

            try {
                // Import tokenService dynamically to avoid circular imports
                const { tokenService } = await import('./tokenService');
                if (tokenService && typeof tokenService.getValidAccessToken === 'function') {
                    const token = await tokenService.getValidAccessToken();
                    if (token) {
                        authHeaders['Authorization'] = `Bearer ${token}`;
                    }
                }
            } catch (err) {
                // Token service not available, continue without authentication
                debug('🔍 Token service not available for health check, continuing without auth');
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout

            const doRequest = async () => fetch(graphqlUrl, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ query: simpleQuery }),
                signal: controller.signal,
                cache: 'no-cache'
            });

            let response = await doRequest();
            if (response.status === 401) {
                // Retry once after refreshing tokens to avoid repeated 401 logs
                try {
                    const { tokenService } = await import('./tokenService');
                    if (tokenService?.clearTokens && tokenService?.requestNewTokens) {
                        tokenService.clearTokens();
                        await tokenService.requestNewTokens();
                        const fresh = await tokenService.getValidAccessToken();
                        if (fresh) authHeaders['Authorization'] = `Bearer ${fresh}`;
                        response = await doRequest();
                    }
                } catch (_) {
                    // ignore refresh errors; we'll still treat 401 as server online
                }
            }

            clearTimeout(timeoutId);

            if (response.ok) {
                // GraphQL endpoint responded successfully
                this.sambaPOSStatus = 'online';
                this.retryAttempts = 0;
                debug('✅ SambaPOS server is reachable');
                return true;
            } else if (response.status === 401) {
                // 401 means server is reachable but authentication failed
                // This still indicates the server is online
                this.sambaPOSStatus = 'online';
                this.retryAttempts = 0;
                debug('✅ SambaPOS server is reachable (401 - auth required, server online)');
                return true;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }

        } catch (error) {
            this.retryAttempts++;

            if (error.name === 'AbortError') {
                this.sambaPOSStatus = 'timeout';
                debug('⏰ SambaPOS connection timeout');
            } else {
                this.sambaPOSStatus = 'offline';
                debug('❌ SambaPOS connection failed:', error.message);
            }

            this.lastCheck = new Date();
            return false;
        }
    }

    getSambaPOSStatus() {
        return {
            status: this.sambaPOSStatus,
            isOnline: this.isOnline,
            lastCheck: this.lastCheck,
            retryAttempts: this.retryAttempts,
            canRetry: this.retryAttempts < this.maxRetries
        };
    }

    async waitForSambaPOSConnection(maxWaitTime = 60000) {
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTime) {
            const isConnected = await this.checkSambaPOSConnectivity();

            if (isConnected) {
                return true;
            }

            // Esperar antes del siguiente intento
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        return false;
    }

    cleanup() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}

export default new NetworkHealthService();
