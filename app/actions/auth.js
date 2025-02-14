import { createGraphQLClient, queries } from '../utils/graphqlClient';
import { appconfig, TOKEN_CONFIG } from '../config';
import * as types from '../constants/ActionTypes';
import { authenticate } from '../queries';
import Debug from 'debug';
import { createAction } from 'redux-actions';
import { tokenService } from '../services/tokenService';
import { navigate } from '../utils/navigation';

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
        
        const result = await tokenService.authenticate(pin);
        
        if (result.success) {
            await dispatch({
                type: AUTH_ACTIONS.LOGIN_SUCCESS,
                payload: {
                    user: result.user,
                    token: result.token,
                    tokenExpiry: result.tokenExpiry
                }
            });
            
            console.log('✅ Login successful:', result.user.name);
            console.timeEnd('Login Duration');
            console.groupEnd();

            // Use setTimeout to ensure state is updated before navigation
            setTimeout(() => {
                navigate('/main');
            }, 0);

            return true;
        }
        
        throw new Error('Authentication failed');

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
  console.group('🔑 Login Attempt');
  console.time('Login Duration');
  
  try {
    const result = await tokenService.authenticate(pin);
    if (result.success) {
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: {
          user: result.user,
          token: result.token,
          tokenExpiry: result.tokenExpiry
        }
      });
      console.log('✅ Login successful:', result.user?.name);
      console.timeEnd('Login Duration');
      console.groupEnd();
      return true;
    }
  } catch (error) {
    dispatch({
      type: AUTH_ACTIONS.LOGIN_FAILURE,
      error: error.message
    });
    console.error('❌ Login failed:', error);
  }
  console.timeEnd('Login Duration');
  console.groupEnd();
  return false;
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

export const logout = () => async (dispatch) => {
    console.log('🔓 Iniciando logout...');
    
    try {
        // 1. Dispatch logout action
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
        
        // 2. Clear user data but keep token
        tokenService.clearAuthentication();
        
        // 3. Use hash router navigation
        window.location.hash = '#/pinpad';
        
        console.log('✅ Logout exitoso');
    } catch (error) {
        console.error('❌ Error en logout:', error);
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