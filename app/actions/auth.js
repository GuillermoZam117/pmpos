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

// Thunk Actions
export const login = (pin) => async (dispatch) => {
    try {
        dispatch({ type: 'LOGIN_REQUEST' });
        const tokenService = new TokenService();
        const result = await tokenService.authenticate(pin);

        if (result.success) {
            dispatch({ type: 'LOGIN_SUCCESS', payload: result });
            return true;
        }

        dispatch({ type: 'LOGIN_FAILURE', error: 'Invalid PIN' });
        return false;
    } catch (error) {
        dispatch({ type: 'LOGIN_FAILURE', error: error.message });
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
    console.log('🔐 Attempting authentication with PIN');
    dispatch({ type: 'AUTHENTICATION_REQUEST' });
    
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

        console.log('📡 Auth response status:', response.status);
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Authentication successful');
            localStorage.setItem('access_token', data.access_token);
            dispatch({
                type: 'AUTHENTICATION_SUCCESS',
                payload: { token: data.access_token }
            });
            return true;
        }
        
        console.error('❌ Authentication failed:', data.error_description);
        dispatch({
            type: 'AUTHENTICATION_FAILURE',
            error: data.error_description
        });
        return false;
    } catch (error) {
        console.error('❌ Auth error:', error);
        dispatch({
            type: 'AUTHENTICATION_FAILURE',
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