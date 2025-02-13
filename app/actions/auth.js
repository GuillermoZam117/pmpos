import { createGraphQLClient, queries } from '../utils/graphqlClient';
import { appconfig, TOKEN_CONFIG } from '../config';
import * as types from '../constants/ActionTypes';
import { authenticate } from '../queries';
import Debug from 'debug';
import { createAction } from 'redux-actions';
import { tokenService } from '../services/tokenService';

const debug = Debug('pmpos:auth');

// Action Types
export const AUTH_ACTIONS = {
    LOGIN_REQUEST: 'AUTH_LOGIN_REQUEST',
    LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
    LOGIN_FAILURE: 'AUTH_LOGIN_FAILURE',
    LOGOUT: 'AUTH_LOGOUT',
    TOKEN_REFRESH: 'AUTH_TOKEN_REFRESH',
    TOKEN_REFRESH_SUCCESS: 'AUTH_TOKEN_REFRESH_SUCCESS',
    TOKEN_REFRESH_FAILURE: 'AUTH_TOKEN_REFRESH_FAILURE'
};

// Action Creators
export const authActions = {
    loginRequest: () => ({ type: AUTH_ACTIONS.LOGIN_REQUEST }),
    loginSuccess: (token) => ({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: { token } }),
    loginFailure: (error) => ({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: { error } }),
    logout: () => ({ type: AUTH_ACTIONS.LOGOUT }),
    tokenRefresh: () => ({ type: AUTH_ACTIONS.TOKEN_REFRESH }),
    tokenRefreshSuccess: (token) => ({ type: AUTH_ACTIONS.TOKEN_REFRESH_SUCCESS, payload: { token } }),
    tokenRefreshFailure: (error) => ({ type: AUTH_ACTIONS.TOKEN_REFRESH_FAILURE, payload: { error } })
};

// Add this near your other action creators
export const checkTokenStatus = () => (dispatch) => {
    console.group('🔍 Token Status Check');
    
    const token = localStorage.getItem('access_token');
    const expiry = localStorage.getItem('token_expiry');
    
    console.log('Storage Status:', {
        token: token ? '✅ Present' : '❌ Missing',
        expiry: expiry ? '✅ Present' : '❌ Missing'
    });
    
    if (token && expiry) {
        const expiryDate = new Date(expiry);
        const now = new Date();
        
        console.log('Token Details:', {
            expiryDate,
            timeRemaining: (expiryDate - now) / 1000 / 60 / 60, // hours
            isValid: expiryDate > now
        });
    }
    
    console.groupEnd();
    
    return {
        type: 'TOKEN_STATUS_CHECK',
        payload: {
            hasToken: !!token,
            expiry: expiry ? new Date(expiry) : null
        }
    };
};

// Thunk Actions
export const login = (pin) => async (dispatch) => {
    console.group('🔑 Login Attempt');
    console.time('Login Duration');
    
    try {
        dispatch({ type: AUTH_ACTIONS.LOGIN_REQUEST });
        
        // First, ensure we have a valid token for GraphQL requests
        const config = appconfig();
        const tokenResponse = await fetch(config.authUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'password',
                username: config.userName,
                password: config.password,
                client_id: 'graphiql'
            })
        });

        if (!tokenResponse.ok) {
            throw new Error('Failed to acquire access token');
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        console.log('📝 Token acquired, validating PIN...');

        // Now use the token to validate the PIN
        const userResponse = await fetch(config.graphqlUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                query: `{
                    getUser(pin: "${pin}") {
                        name
                    }
                }`
            })
        });

        const userData = await userResponse.json();
        console.log('👤 User validation response:', userData);

        const userName = userData.data?.getUser?.name;

        if (!userName || userName === '*') {
            throw new Error('Invalid PIN');
        }

        // Success! Store token and dispatch success action
        const success = await dispatch({
            type: AUTH_ACTIONS.LOGIN_SUCCESS,
            payload: {
                token: accessToken,
                user: userData.data.getUser,
                expiry: new Date(Date.now() + (8 * 60 * 60 * 1000)) // 8 hours
            }
        });

        console.log('✅ Login successful:', userName);
        console.timeEnd('Login Duration');
        console.groupEnd();
        return success;

    } catch (error) {
        console.error('❌ Login failed:', error);
        dispatch({
            type: AUTH_ACTIONS.LOGIN_FAILURE,
            error: error.message
        });
        console.timeEnd('Login Duration');
        console.groupEnd();
        return false;
    }
};

export const refreshToken = () => async (dispatch) => {
    dispatch(authActions.tokenRefresh());
    
    try {
        console.log('🔄 Refreshing token...');
        const token = await tokenService.refreshToken();
        dispatch(authActions.tokenRefreshSuccess(token));
        return token;
    } catch (error) {
        console.error('❌ Token refresh failed:', error);
        dispatch(authActions.tokenRefreshFailure(error.message));
        throw error;
    }
};

export const authenticateWithPin = (pin) => async (dispatch) => {
    console.log('🔐 Attempting authentication with PIN:', pin);
    
    dispatch({ type: 'LOGIN_REQUEST' });
    
    try {
        const config = appconfig();
        const response = await fetch(config.authUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'password',
                username: config.userName,
                password: config.password,
                client_id: 'graphiql'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.access_token) {
            console.log('✅ Authentication successful');
            dispatch({
                type: 'LOGIN_SUCCESS',
                payload: {
                    token: data.access_token
                }
            });
            return true;
        } else {
            throw new Error('No access token received');
        }
    } catch (error) {
        console.error('❌ Authentication failed:', error);
        dispatch({
            type: 'LOGIN_FAILURE',
            error: error.message
        });
        return false;
    }
};

export const loginWithPin = (pin) => async (dispatch) => {
    const settings = appconfig();
    dispatch(authActions.loginRequest());
    
    try {
        // Step 1: Get token first
        const tokenResponse = await fetch(settings.authUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'password',
                username: settings.userName,
                password: settings.password,
                client_id: 'graphiql'
            })
        });

        if (!tokenResponse.ok) {
            throw new Error('Token acquisition failed');
        }

        const tokenData = await tokenResponse.json();
        const token = tokenData.access_token;
        
        // Store token immediately
        localStorage.setItem('access_token', token);

        // Step 2: Use token for GraphQL query
        const userResponse = await fetch(settings.GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`  // Add token to header
            },
            body: JSON.stringify({
                query: `
                    query {
                        getUser(pin: "${pin}") {
                            name
                        }
                    }
                `
            })
        });

        const { data, errors } = await userResponse.json();

        if (errors) {
            throw new Error(errors[0].message);
        }

        if (!data?.getUser?.name) {
            throw new Error('Invalid PIN');
        }

        dispatch(authActions.loginSuccess({
            user: data.getUser,
            token: token,
            authenticated: true
        }));

        return data.getUser;
    } catch (error) {
        console.error('Authentication failed:', error);
        dispatch(authActions.loginFailure(error.message));
        throw error;
    }
};

export const initiateTokenRefresh = () => async (dispatch) => {
    console.group('🔄 Token Refresh Flow');
    console.time('Token Refresh Duration');
    console.log('📝 Starting token refresh...');
    
    dispatch(authActions.tokenRefresh());
    
    try {
        const config = appconfig();
        const startTime = performance.now();
        
        console.log('🔧 Config used:', {
            authUrl: config.authUrl,
            username: config.userName,
            clientId: config.auth.clientId,
            grantType: config.auth.grantType
        });

        const response = await fetch(config.authUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: config.auth.grantType,
                username: config.userName,
                password: config.password,
                client_id: config.auth.clientId
            })
        });

        console.log('📡 Response status:', response.status);

        if (!response.ok) {
            console.error('❌ Token refresh failed:', response.status);
            throw new Error(`Token refresh failed: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Token received successfully');
        console.log(`⏱️ Token obtained in ${performance.now() - startTime}ms`);

        console.timeEnd('Token Refresh Duration');
        console.groupEnd();
        
        return data;
    } catch (error) {
        console.error('❌ Token refresh error:', error);
        console.timeEnd('Token Refresh Duration');
        console.groupEnd();
        throw error;
    }
};

export const initializeAuth = () => async (dispatch) => {
    debug('Starting auth initialization');
    
    try {
        const token = localStorage.getItem('access_token');
        
        if (!token) {
            debug('No token found');
            return;
        }

        debug('Found existing token, validating...');
        // Validate token and dispatch appropriate actions
        
        dispatch({
            type: 'AUTH_INITIALIZED',
            payload: { token }
        });
        
        debug('Auth initialization complete');
    } catch (error) {
        debug('Auth initialization failed:', error);
        throw error;
    }
};

export const logout = () => (dispatch) => {
    console.log('🚪 Logging out...');
    tokenService.clearToken();
    dispatch(authActions.logout());
};

const initialState = {
    isAuthenticated: false,
    user: null,
    token: null,
    loading: false,
    error: null,
    tokenExpiry: null
};

export default function authReducer(state = initialState, action) {
    switch (action.type) {
        // ...existing cases...
        
        case AUTH_ACTIONS.TOKEN_REFRESH_SUCCESS:
            return {
                ...state,
                token: action.payload.token,
                tokenExpiry: action.payload.expiry,
                loading: false
            };
            
        default:
            return state;
    }
}

// Export what's needed with new names to avoid conflicts
export const AUTH_ACTION_TYPES = AUTH_ACTIONS;
export const setAuthenticated = authActions.updateAuthState;
export const initiateAuthentication = authActions.initiateAuth;

// Single export of action creators
export const {
    loginRequest,
    loginSuccess,
    loginFailure,
    tokenRefresh,
    tokenRefreshSuccess,
    tokenRefreshFailure
} = authActions;