import { appconfig } from '../config';
import fs from 'fs';
import path from 'path';
import { store, AUTH_ACTIONS } from '../store';
import { getUserByPinQuery, getUserByPin } from '../queries';
import Debug from 'debug';

const TOKEN_FILE_PATH = path.join(process.cwd(), 'token.txt');
const TOKEN_STORAGE_KEY = 'sambapos_token_encrypted';
const TOKEN_EXPIRY_KEY = 'sambapos_token_expiry';
const REQUEST_TIMEOUT = 20000; // 20 seconds
const REFRESH_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days
const TOKEN_VALIDITY = 365 * 24 * 60 * 60 * 1000; // 365 days
const isDevelopment = process?.env?.NODE_ENV === 'development';

const debug = Debug('pmpos:token');

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
        this.token = null;
        this.expiry = null;
        this.pendingRefresh = null;
        this.currentToken = null;
        this.loadToken();
    }

    loadToken() {
        debug('Loading token from storage...');
        const storedToken = localStorage.getItem('access_token');
        const storedExpiry = localStorage.getItem('token_expiry');

        console.group('📦 Token Storage Status');
        console.log('Stored Token:', storedToken ? '✅ Present' : '❌ Missing');
        console.log('Stored Expiry:', storedExpiry ? '✅ Present' : '❌ Missing');
        
        if (storedToken && storedExpiry) {
            const expiry = new Date(storedExpiry);
            console.log('Token Expiry:', expiry);
            console.log('Current Time:', new Date());
            console.log('Is Valid:', expiry > new Date() ? '✅ Yes' : '❌ No');
            
            if (expiry > new Date()) {
                this.token = storedToken;
                this.expiry = expiry;
                console.log('✅ Token loaded successfully');
            } else {
                console.log('⚠️ Token expired');
                this.clearToken();
            }
        } else {
            console.log('⚠️ No token found in storage');
        }
        console.groupEnd();
    }

    async getToken() {
        if (this.token && this.expiry > new Date()) {
            return this.token;
        }

        const storedToken = localStorage.getItem('token');
        const storedExpiry = localStorage.getItem('expiry');

        if (storedToken && storedExpiry && new Date(storedExpiry) > new Date()) {
            this.token = storedToken;
            this.expiry = new Date(storedExpiry);
            return this.token;
        }

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

    async authenticate(pin) {
        try {
            const token = await this.getToken();
            console.log('📡 Sending PIN validation...');

            const response = await fetch(appconfig().graphqlUrl, {
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

            // Store user data in localStorage
            this.setUserData({ name: userName });

            return {
                success: true,
                message: 'Authentication successful',
                user: {
                    name: userName
                }
            };

        } catch (error) {
            console.error('❌ PIN validation failed:', error);
            throw error;
        }
    }

    setToken(token, expiry) {
        console.group('💾 Setting Token');
        console.log('Token:', token ? '✅ Present' : '❌ Missing');
        console.log('Expiry:', expiry);
        
        localStorage.setItem('access_token', token);
        localStorage.setItem('token_expiry', expiry.toISOString());
        
        this.token = token;
        this.expiry = expiry;
        
        console.log('✅ Token saved to storage');
        console.groupEnd();
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
        console.group('🗑️ Clearing Token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('token_expiry');
        this.token = null;
        this.expiry = null;
        console.log('✅ Token cleared from storage');
        console.groupEnd();
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