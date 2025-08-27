import { appconfig } from '../config';
import fs from 'fs';
import path from 'path';
import { store, AUTH_ACTIONS } from '../store';
import { getUserByPinQuery, getUserByPin } from '../queries';
import Debug from 'debug';

const TOKEN_FILE_PATH = path.join(process.cwd(), 'token.txt');
const TOKEN_STORAGE_KEY = 'sambapos_token_encrypted';
const TOKEN_EXPIRY_KEY = 'sambapos_token_expiry';
const REFRESH_TOKEN_KEY = 'sambapos_refresh_token';
const REQUEST_TIMEOUT = 20000; // 20 seconds
const REFRESH_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days
const TOKEN_VALIDITY = 365 * 24 * 60 * 60 * 1000; // 365 days
const isDevelopment = process?.env?.NODE_ENV === 'development';

const debug = Debug('pmpos:token');

const AUTH_CONSTANTS = {
    STORAGE_KEYS: {
        ACCESS_TOKEN: 'sambapos_access_token',
        REFRESH_TOKEN: 'sambapos_refresh_token',
        TOKEN_EXPIRY: 'sambapos_token_expiry'
    },
    REQUEST_TIMEOUT: 30000,
    TOKEN_VALIDITY: 24 * 60 * 60 * 1000, // 24 hours for access token
    REFRESH_TOKEN_VALIDITY: 365 * 24 * 60 * 60 * 1000, // 365 days for refresh token
    DEFAULTS: {
        GRANT_TYPE: 'password',
        CLIENT_ID: 'graphiql',
        CLIENT_SECRET: 'graphiql',
        USERNAME: 'graphiql',
        PASSWORD: 'graphiql'
    }
};

class TokenService {
    constructor() {
        console.log('Initializing TokenService');
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        this.pendingRefresh = null;
        this.isPreloading = false;
        this.preloadPromise = null;
        this.loadTokens();
        
        // Start preloading token immediately if none exists
        this.preloadTokenIfNeeded();
    }

    loadTokens() {
        debug('Loading tokens from storage...');
        const storedAccessToken = localStorage.getItem(AUTH_CONSTANTS.STORAGE_KEYS.ACCESS_TOKEN);
        const storedRefreshToken = localStorage.getItem(AUTH_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN);
        const storedExpiry = localStorage.getItem(AUTH_CONSTANTS.STORAGE_KEYS.TOKEN_EXPIRY);

        console.group('📦 Token Storage Status');
        console.log('Access Token:', storedAccessToken ? '✅ Present' : '❌ Missing');
        console.log('Refresh Token:', storedRefreshToken ? '✅ Present' : '❌ Missing');
        console.log('Token Expiry:', storedExpiry ? '✅ Present' : '❌ Missing');
        
        if (storedAccessToken && storedRefreshToken && storedExpiry) {
            this.accessToken = storedAccessToken;
            this.refreshToken = storedRefreshToken;
            this.tokenExpiry = new Date(storedExpiry);
            
            console.log('Token Expiry:', this.tokenExpiry);
            console.log('Current Time:', new Date());
            console.log('Is Valid:', this.tokenExpiry > new Date() ? '✅ Yes' : '⚠️ Expired');
            console.log('✅ Tokens loaded from storage');
        } else {
            console.log('⚠️ No complete token set found in storage');
        }
        console.groupEnd();
    }

    async getValidAccessToken() {
        // Si tenemos un token válido, lo retornamos
        if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
            console.log('✅ Using valid cached access token (preloaded)');
            return this.accessToken;
        }

        // Si tenemos refresh token, intentamos renovar
        if (this.refreshToken) {
            console.log('🔄 Access token expired, using refresh token...');
            try {
                return await this.refreshAccessToken();
            } catch (error) {
                console.warn('⚠️ Refresh token failed, will request new tokens');
                this.clearTokens();
            }
        }

        // Si no tenemos refresh token o falló, solicitamos tokens nuevos
        console.log('🔐 No valid tokens, requesting new authentication...');
        return await this.requestNewTokens();
    }

    async refreshAccessToken() {
        if (this.pendingRefresh) {
            return this.pendingRefresh;
        }

        this.pendingRefresh = (async () => {
            try {
                console.log('🔄 Refreshing access token with refresh token...');
                
                const cfg = appconfig();
                const response = await fetch(cfg.authUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        grant_type: 'refresh_token',
                        refresh_token: this.refreshToken,
                        client_id: cfg.auth.clientId
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Refresh token failed:', {
                        status: response.status,
                        error: errorText
                    });
                    throw new Error(`Refresh token failed: ${response.status}`);
                }

                const data = await response.json();
                console.log('✅ Tokens refreshed successfully');
                
                // Guardar los nuevos tokens
                this.saveTokens(data.access_token, data.refresh_token, data.expires_in);
                
                return data.access_token;
            } catch (error) {
                console.error('❌ Token refresh error:', error);
                throw error;
            } finally {
                this.pendingRefresh = null;
            }
        })();

        return this.pendingRefresh;
    }

    async requestNewTokens() {
        try {
            console.log('🔐 Requesting new token set...');
            
            const cfg = appconfig();
            const response = await fetch(cfg.authUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: cfg.auth.grantType,
                    client_id: cfg.auth.clientId,
                    username: cfg.userName,
                    password: cfg.password
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Token request failed:', {
                    status: response.status,
                    error: errorText
                });
                throw new Error(`Token request failed: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ New tokens received successfully');
            
            // Guardar los tokens
            this.saveTokens(data.access_token, data.refresh_token, data.expires_in);
            
            return data.access_token;
        } catch (error) {
            console.error('❌ New token request error:', error);
            throw error;
        }
    }

    saveTokens(accessToken, refreshToken, expiresIn) {
        console.group('💾 Saving Tokens');
        
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        
        // Calcular expiración (expires_in viene en segundos)
        const expiryDate = new Date(Date.now() + (expiresIn * 1000));
        this.tokenExpiry = expiryDate;
        
        // Guardar en localStorage
        localStorage.setItem(AUTH_CONSTANTS.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        localStorage.setItem(AUTH_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        localStorage.setItem(AUTH_CONSTANTS.STORAGE_KEYS.TOKEN_EXPIRY, expiryDate.toISOString());
        
        console.log('Access Token:', accessToken ? '✅ Saved' : '❌ Missing');
        console.log('Refresh Token:', refreshToken ? '✅ Saved' : '❌ Missing');
        console.log('Expires At:', expiryDate);
        console.log('✅ All tokens saved successfully');
        console.groupEnd();
    }

    async authenticate(pin) {
        try {
            // Use preloaded token for instant authentication
            const token = await this.getPreloadedToken();
            console.log('📡 Sending PIN validation with preloaded token...');

            let response = await fetch(appconfig().graphqlUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    query: `{
                        getUser(pin: "${pin}") {
                            name
                        }
                    }`
                })
            });

            // Si obtenemos 401, forzamos refresh y reintentamos
            if (response.status === 401) {
                console.log('🔄 Token rejected by server, forcing token refresh...');
                this.clearTokens(); // Limpiar tokens inválidos
                const freshToken = await this.requestNewTokens(); // Obtener tokens frescos
                
                console.log('📡 Retrying PIN validation with fresh token...');
                response = await fetch(appconfig().graphqlUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${freshToken}`
                    },
                    body: JSON.stringify({
                        query: `{
                            getUser(pin: "${pin}") {
                                name
                            }
                        }`
                    })
                });
            }

            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status}`);
            }

            const result = await response.json();
            console.log('👤 User validation response:', result);

            if (result.errors) {
                throw new Error(result.errors[0]?.message || 'GraphQL Error');
            }

            const userName = result.data?.getUser?.name;
            console.log('User name from response:', userName);

            if (!userName || userName === '*') {
                throw new Error('Invalid PIN');
            }

            // Resolve role from server (best-effort)
            let userRole = 'Mesero';
            try {
                const roleResp = await fetch(appconfig().graphqlUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${await this.getValidAccessToken()}`
                    },
                    body: JSON.stringify({ query: 'query { getUsers { name roleName isAdmin } }' })
                });
                const roleJson = await roleResp.json();
                const arr = roleJson?.data?.getUsers || [];
                const match = arr.find(u => u?.name === userName);
                if (match?.roleName) userRole = match.roleName;
                else if (match?.isAdmin) userRole = 'Admin';
            } catch (e) {
                console.warn('User role lookup failed; defaulting to Mesero');
            }

            // Guardar datos del usuario + rol
            this.setUserData({ name: userName, role: userRole });
            try { localStorage.setItem('pmpos_user_role', userRole); } catch {}

            return {
                success: true,
                message: 'Authentication successful',
                user: {
                    name: userName,
                    role: userRole
                }
            };

        } catch (error) {
            console.error('❌ PIN validation failed:', error);
            throw error;
        }
    }

    clearTokens() {
        console.group('🗑️ Clearing All Tokens');
        
        // Limpiar variables de instancia
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        this.pendingRefresh = null;
        
        // Limpiar localStorage
        localStorage.removeItem(AUTH_CONSTANTS.STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(AUTH_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(AUTH_CONSTANTS.STORAGE_KEYS.TOKEN_EXPIRY);
        
        // Limpiar también las claves legacy por compatibilidad
        localStorage.removeItem('access_token');
        localStorage.removeItem('token_expiry');
        localStorage.removeItem('token');
        localStorage.removeItem('expiry');
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
        
        console.log('✅ All tokens cleared from storage');
        console.groupEnd();
    }

    setUserData(user) {
        try {
            localStorage.setItem('user', JSON.stringify(user));
        } catch (error) {
            console.error('Failed to store user data:', error);
        }
    }

    getCurrentUser() {
        try {
            const userData = localStorage.getItem('user');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    }

    // Método para verificar si tenemos tokens válidos (para la UI)
    hasValidTokens() {
        return this.accessToken && this.refreshToken && 
               this.tokenExpiry && this.tokenExpiry > new Date();
    }

    // Método para obtener información del estado de los tokens
    getTokenStatus() {
        return {
            hasAccessToken: !!this.accessToken,
            hasRefreshToken: !!this.refreshToken,
            tokenExpiry: this.tokenExpiry,
            isExpired: this.tokenExpiry ? this.tokenExpiry <= new Date() : true,
            timeToExpiry: this.tokenExpiry ? this.tokenExpiry - new Date() : 0
        };
    }

    /**
     * Pre-load token if needed (background initialization)
     */
    async preloadTokenIfNeeded() {
        // Don't preload if we already have valid tokens
        if (this.hasValidTokens()) {
            console.log('✅ Valid tokens already exist, no preload needed');
            return;
        }

        // Don't start multiple preload operations
        if (this.isPreloading) {
            console.log('⏳ Token preload already in progress...');
            return this.preloadPromise;
        }

        console.log('🚀 Starting token preload in background...');
        this.isPreloading = true;
        
        this.preloadPromise = this.performTokenPreload();
        
        try {
            await this.preloadPromise;
            console.log('✅ Token preload completed successfully');
        } catch (error) {
            console.warn('⚠️ Token preload failed:', error.message);
            // Don't throw - this is background operation
        } finally {
            this.isPreloading = false;
            this.preloadPromise = null;
        }
    }

    /**
     * Perform actual token preload
     */
    async performTokenPreload() {
        try {
            console.log('📡 Preloading token from SambaPOS...');
            const token = await this.requestNewTokens();
            
            if (token) {
                console.log('✅ Token preloaded successfully, ready for instant login');
                return token;
            } else {
                throw new Error('No token received from server');
            }
        } catch (error) {
            console.error('❌ Token preload failed:', error);
            throw error;
        }
    }

    /**
     * Get preloaded token or wait for preload to complete
     */
    async getPreloadedToken() {
        // If we have valid tokens, return immediately
        if (this.hasValidTokens()) {
            return this.accessToken;
        }

        // If preload is in progress, wait for it
        if (this.isPreloading && this.preloadPromise) {
            console.log('⏳ Waiting for token preload to complete...');
            try {
                await this.preloadPromise;
                return this.accessToken;
            } catch (error) {
                console.warn('⚠️ Preload failed, falling back to normal token request');
                return await this.getValidAccessToken();
            }
        }

        // Otherwise get token normally
        return await this.getValidAccessToken();
    }

    /**
     * Clear authentication data (but keep tokens for performance)
     * Only clears user data, NOT tokens
     */
    clearAuthentication() {
        console.log('🧹 Clearing user authentication data (keeping tokens)');
        try {
            localStorage.removeItem('user');
            console.log('✅ User data cleared, tokens preserved for performance');
        } catch (error) {
            console.error('❌ Error clearing authentication data:', error);
        }
    }

    /**
     * Clear ALL tokens (use only when absolutely necessary)
     */
    clearTokens() {
        console.log('🧹 Clearing ALL token data');
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        this.pendingRefresh = null;
        
        try {
            localStorage.removeItem(AUTH_CONSTANTS.STORAGE_KEYS.ACCESS_TOKEN);
            localStorage.removeItem(AUTH_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN);
            localStorage.removeItem(AUTH_CONSTANTS.STORAGE_KEYS.TOKEN_EXPIRY);
            localStorage.removeItem('user');
            console.log('✅ All tokens and user data cleared');
        } catch (error) {
            console.error('❌ Error clearing tokens:', error);
        }
    }
}

export const tokenService = new TokenService();
