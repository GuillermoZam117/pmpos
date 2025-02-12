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

const TOKEN_CONFIG = {
    STORAGE_KEY: 'sambapos_token',
    EXPIRY_KEY: 'sambapos_token_expiry',
    REQUEST_TIMEOUT: 20000,
    REFRESH_THRESHOLD: 7 * 24 * 60 * 60 * 1000 // 7 days
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
            const token = localStorage.getItem(TOKEN_CONFIG.STORAGE_KEY);
            const expiry = localStorage.getItem(TOKEN_CONFIG.EXPIRY_KEY);
            
            if (token && expiry && this.isTokenValid(expiry)) {
                this.currentToken = token;
                console.log('Token loaded from storage');
            }
        } catch (error) {
            console.error('Error initializing token storage:', error);
            this.clearToken();
        }
    }

    async getToken() {
        try {
            if (this.currentToken && this.isTokenValid()) {
                return this.currentToken;
            }
            return await this.refreshToken();
        } catch (error) {
            console.error('Token retrieval failed:', error);
            throw error;
        }
    }

    async refreshToken() {
        if (this.pendingRefresh) {
            return this.pendingRefresh;
        }

        this.pendingRefresh = (async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

            try {
                console.time('tokenRefresh');
                const settings = appconfig();
                const response = await fetch(settings.authUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        grant_type: 'password',
                        username: settings.userName,
                        password: settings.password,
                        client_id: 'graphiql'
                    }),
                    signal: controller.signal
                });

                if (!response.ok) {
                    throw new Error(`Token refresh failed: ${response.status}`);
                }

                const data = await response.json();
                const expiryDate = new Date(Date.now() + TOKEN_VALIDITY);
                
                this.setToken(data.access_token, expiryDate);
                console.timeEnd('tokenRefresh');
                
                return data.access_token;
            } finally {
                clearTimeout(timeoutId);
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
}

export const tokenService = new TokenService();