import { appconfig } from '../config';
import fs from 'fs';
import path from 'path';

const TOKEN_FILE_PATH = path.join(process.cwd(), 'token.txt');
const TOKEN_STORAGE_KEY = 'sambapos_token_encrypted';
const TOKEN_EXPIRY_KEY = 'sambapos_token_expiry';
const REQUEST_TIMEOUT = 20000; // 20 seconds
const REFRESH_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days
const TOKEN_VALIDITY = 365 * 24 * 60 * 60 * 1000; // 365 days
const isDevelopment = process?.env?.NODE_ENV === 'development';

const debug = (message) => {
    if (isDevelopment) {
        console.log(`[TokenService] ${message}`);
    }
};

const AUTH_CONSTANTS = {
    STORAGE_KEYS: {
        TOKEN: 'sambapos_token_encrypted',
        EXPIRY: 'sambapos_token_expiry'
    },
    REQUEST_TIMEOUT: 30000,
    TOKEN_VALIDITY: 365 * 24 * 60 * 60 * 1000,
    DEFAULTS: {
        GRANT_TYPE: 'password',
        CLIENT_ID: 'graphiql',
        USERNAME: 'graphiql',
        PASSWORD: 'graphiql'
    }
};

class TokenService {
    constructor() {
        console.log('Initializing TokenService');
        this.pendingRefresh = null;
        this.currentToken = null;
        this.initializeFromStorage();
    }

    initializeFromStorage() {
        try {
            const token = localStorage.getItem(AUTH_CONSTANTS.STORAGE_KEYS.TOKEN);
            const expiry = localStorage.getItem(AUTH_CONSTANTS.STORAGE_KEYS.EXPIRY);
            
            if (token && expiry && this.isTokenValid(expiry)) {
                this.currentToken = this.decryptToken(token);
                console.log('Token loaded from storage');
            }
        } catch (error) {
            console.error('Error initializing token storage:', error);
            this.clearToken();
        }
    }

    async getToken() {
        try {
            const storedToken = this.currentToken || localStorage.getItem(AUTH_CONSTANTS.STORAGE_KEYS.TOKEN);
            const expiryDate = localStorage.getItem(AUTH_CONSTANTS.STORAGE_KEYS.EXPIRY);

            if (storedToken && expiryDate && new Date(expiryDate) > new Date()) {
                console.log('✅ Using cached token');
                return storedToken;
            }

            console.log('🔄 Token invalid or expired, refreshing...');
            return await this.refreshToken();
        } catch (error) {
            console.error('❌ Token retrieval failed:', error);
            throw error;
        }
    }

    async refreshToken() {
        if (this.pendingRefresh) {
            return this.pendingRefresh;
        }

        this.pendingRefresh = (async () => {
            try {
                console.log('🔄 Starting token refresh...');
                const settings = appconfig();
                
                const credentials = {
                    grant_type: AUTH_CONSTANTS.DEFAULTS.GRANT_TYPE,
                    client_id: AUTH_CONSTANTS.DEFAULTS.CLIENT_ID,
                    username: AUTH_CONSTANTS.DEFAULTS.USERNAME,
                    password: AUTH_CONSTANTS.DEFAULTS.PASSWORD
                };

                console.log('📤 Refreshing token with:', credentials);

                const response = await fetch('http://localhost:9000/Token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams(credentials)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Token refresh failed:', {
                        status: response.status,
                        error: errorText
                    });
                    throw new Error(`Token refresh failed: ${response.status}`);
                }

                const data = await response.json();
                console.log('✅ Token received successfully');
                
                const expiryDate = new Date(Date.now() + AUTH_CONSTANTS.TOKEN_VALIDITY);
                this.setToken(data.access_token, expiryDate);
                
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

    setToken(token, expiryDate) {
        try {
            this.currentToken = token;
            const encryptedToken = this.encryptToken(token);
            localStorage.setItem(TOKEN_STORAGE_KEY, encryptedToken);
            localStorage.setItem(TOKEN_EXPIRY_KEY, expiryDate.toISOString());
            console.log('Token saved to storage');
        } catch (error) {
            console.error('Error saving token:', error);
            throw error;
        }
    }

    isTokenValid(expiryDate = null) {
        try {
            const expiry = expiryDate || localStorage.getItem(TOKEN_EXPIRY_KEY);
            if (!expiry) return false;
            
            const expiryTime = new Date(expiry).getTime();
            const now = Date.now();
            const timeLeft = expiryTime - now;
               
            console.debug(`Token expires in ${Math.floor(timeLeft / (1000 * 60 * 60))} hours`);
            return timeLeft > REFRESH_THRESHOLD;
        } catch (error) {
            console.error('Error checking token validity:', error);
            return false;
        }
    }

    clearToken() {
        try {
            this.currentToken = null;
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(TOKEN_EXPIRY_KEY);
            console.log('Token cleared from storage');
        } catch (error) {
            console.error('Error clearing token:', error);
        }
    }

    encryptToken(token) {
        try {
            return btoa(token);
        } catch (error) {
            console.error('Error encrypting token:', error);
            throw error;
        }
    }

    decryptToken(encryptedToken) {
        try {
            return atob(encryptedToken);
        } catch (error) {
            console.error('Error decrypting token:', error);
            throw error;
        }
    }

    async validatePin(pin) {
        const token = await this.getToken();
        if (!token) {
            throw new Error('No token available for PIN validation');
        }

        const settings = appconfig();
        const response = await fetch(settings.graphqlUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                query: `
                    mutation ValidatePin($pin: String!) {
                        validatePin(pin: $pin) {
                            success
                            message
                        }
                    }
                `,
                variables: { pin }
            })
        });

        const result = await response.json();
        if (result.errors) {
            throw new Error(result.errors[0].message);
        }

        return result.data.validatePin;
    }

    async authenticate(pin) {
        try {
            console.log('🔑 Starting PIN authentication...');
            const token = await this.getToken();
            
            if (!token) {
                throw new Error('No token available');
            }

            const settings = appconfig();
            console.log(`📡 Authenticating user...`);

            const response = await fetch(settings.graphqlUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    query: `
                        query AuthenticateUser($pin: String!) {
                            authenticateUser(pin: $pin) {
                                id
                                name
                                permissions
                                departments {
                                    id
                                    name
                                }
                            }
                        }
                    `,
                    variables: { 
                        pin: pin.toString() 
                    }
                })
            });

            // Log response details for debugging
            console.log('Response status:', response.status);
            const responseText = await response.text();
            console.log('Response body:', responseText);

            if (!response.ok) {
                throw new Error('Authentication failed');
            }

            let result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse response:', e);
                throw new Error('Invalid server response');
            }

            if (result.errors) {
                const errorMessage = result.errors[0]?.message || 'Unknown error';
                throw new Error(errorMessage);
            }

            if (!result.data?.authenticateUser) {
                throw new Error('Invalid PIN');
            }

            const user = result.data.authenticateUser;
            console.log('✅ User authenticated:', user.name);

            // Store user data
            this.setUserData(user);

            return {
                success: true,
                message: `Welcome ${user.name}`,
                user
            };

        } catch (error) {
            console.error('❌ Authentication failed:', error);
            throw new Error(
                error.message === 'Authentication failed' ? 
                'Invalid PIN' : 
                'Service temporarily unavailable'
            );
        }
    }

    setUserData(user) {
        try {
            localStorage.setItem('user', JSON.stringify(user));
        } catch (error) {
            console.error('Failed to store user data:', error);
        }
    }

    // Add method to get stored user
    getCurrentUser() {
        try {
            const userData = localStorage.getItem('user');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    }
}

export const tokenService = new TokenService();