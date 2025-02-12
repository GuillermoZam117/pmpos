import { createGraphQLClient, queries } from '../utils/graphqlClient';
import { appconfig, TOKEN_CONFIG } from '../config';
import * as types from '../constants/ActionTypes';
import { authenticate } from '../queries';
import Debug from 'debug';

const debug = Debug('pmpos:auth');

// Action Types
export const AUTH_TYPES = {
    LOGIN_REQUEST: 'LOGIN_REQUEST',
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILURE: 'LOGIN_FAILURE',
    TOKEN_REFRESH: 'TOKEN_REFRESH',
    TOKEN_REFRESH_SUCCESS: 'TOKEN_REFRESH_SUCCESS',
    TOKEN_REFRESH_FAILURE: 'TOKEN_REFRESH_FAILURE',
    LOGOUT: 'LOGOUT'
};

// Action Creators
const actions = {
    loginRequest: () => ({
        type: AUTH_TYPES.LOGIN_REQUEST
    }),

    loginSuccess: (token, expiry) => ({
        type: AUTH_TYPES.LOGIN_SUCCESS,
        payload: { token, expiry }
    }),

    loginFailure: (error) => ({
        type: AUTH_TYPES.LOGIN_FAILURE,
        error
    }),

    tokenRefresh: () => ({
        type: AUTH_TYPES.TOKEN_REFRESH
    }),

    tokenRefreshSuccess: (token, expiry) => ({
        type: AUTH_TYPES.TOKEN_REFRESH_SUCCESS,
        payload: { token, expiry }
    }),

    tokenRefreshFailure: (error) => ({
        type: AUTH_TYPES.TOKEN_REFRESH_FAILURE,
        error
    }),

    logout: () => ({
        type: AUTH_TYPES.LOGOUT
    })
};

// Thunk Actions
export const login = (username, password) => async (dispatch) => {
    dispatch(actions.loginRequest());
    
    try {
        const client = createGraphQLClient();
        const config = appconfig();
        
        const variables = {
            username: username || config.userName,
            password: password || config.password
        };

        const { authenticate: { token, refreshToken } } = await client.request(queries.login, variables);
        
        const expiryDate = new Date(Date.now() + TOKEN_CONFIG.TOKEN_VALIDITY);
        dispatch(actions.loginSuccess(token, expiryDate.toISOString()));

        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);
        
        return token;
    } catch (error) {
        console.error('Authentication failed:', error);
        dispatch(actions.loginFailure(error.message));
        throw error;
    }
};

export const refreshToken = () => async (dispatch, getState) => {
    const state = getState();
    const currentRefreshToken = state.login.get('refreshToken');
    
    if (!currentRefreshToken) {
        throw new Error('No refresh token available');
    }

    try {
        const response = await fetch(`${appconfig().GQLserv}/Token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: currentRefreshToken,
                client_id: 'graphiql',
                client_secret: 'test'
            })
        });

        if (!response.ok) {
            throw new Error('Token refresh failed');
        }

        const data = await response.json();
        dispatch(authActions.authSuccess({
            accessToken: data.access_token,
            refreshToken: data.refresh_token
        }));

        return data.access_token;
    } catch (error) {
        dispatch(authActions.authFailure(error.message));
        throw error;
    }
};

export const authenticateWithPin = (pin) => async (dispatch) => {
    try {
        dispatch({ type: 'AUTHENTICATION_REQUEST' });
        const config = appconfig();
        const response = await fetch(config.authUrl, {  // <-- Issue here
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'password',
                username: 'graphiql',
                password: 'graphiql',
                client_id: 'graphiql'
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('access_token', data.access_token);
            dispatch({
                type: 'AUTHENTICATION_SUCCESS',
                payload: { token: data.access_token }
            });
        } else {
            dispatch(authenticationFailure(data.error_description));
        }
    } catch (error) {
        dispatch(authenticationFailure(error.message));
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
    
    dispatch(actions.tokenRefresh());
    
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
        
        case AUTH_TYPES.TOKEN_REFRESH_SUCCESS:
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
export const AUTH_ACTION_TYPES = AUTH_TYPES;
export const setAuthenticated = authActions.updateAuthState;
export const initiateAuthentication = authActions.initiateAuth;

// Single export of action creators
export const {
    loginRequest,
    loginSuccess,
    loginFailure,
    authRequest,
    authSuccess,
    authFailure,
    authRequired,
    logout
} = authActions;