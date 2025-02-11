import { createGraphQLClient, queries } from '../utils/graphqlClient';
import { appconfig } from '../config';
import * as types from '../constants/ActionTypes';

export const login = (username, password) => async (dispatch) => {
    dispatch({ type: types.AUTHENTICATION_REQUEST });
    
    try {
        const client = createGraphQLClient();
        const config = appconfig();
        
        const variables = {
            username: username || config.userName,
            password: password || config.password
        };

        const { authenticate: { token, refreshToken } } = await client.request(queries.login, variables);
        
        dispatch({
            type: types.AUTHENTICATION_SUCCESS,
            accessToken: token,
            refreshToken
        });

        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);
        
        return token;
    } catch (error) {
        console.error('Authentication failed:', error);
        dispatch({
            type: types.AUTHENTICATION_FAILURE,
            error: error.message
        });
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
        
        dispatch({
            type: types.AUTHENTICATION_SUCCESS,
            accessToken: data.access_token,
            refreshToken: data.refresh_token
        });

        return data.access_token;
    } catch (error) {
        dispatch({ type: types.AUTHENTICATION_FAILURE, error: error.message });
        throw error;
    }
};

export const loginSuccess = (token, user) => ({
    type: 'LOGIN_SUCCESS',
    payload: { token, user }
});

export const loginFailure = (error) => ({
    type: 'LOGIN_FAILURE',
    payload: error
});

export const logout = () => ({
    type: 'LOGOUT'
});