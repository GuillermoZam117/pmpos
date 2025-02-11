import { Map } from 'immutable';

const initialState = Map({
    isAuthenticated: false,
    accessToken: null,
    refreshToken: null,
    roles: [],
    username: null,
    expiresAt: null,
    isLoading: false,
    error: null
});

export default function auth(state = initialState, action) {
    switch (action.type) {
        case 'AUTHENTICATION_REQUEST':
            return state.merge({
                isLoading: true,
                error: null
            });

        case 'AUTHENTICATION_SUCCESS':
            return state.merge({
                isAuthenticated: true,
                accessToken: action.payload.accessToken,
                refreshToken: action.payload.refreshToken,
                roles: action.payload.roles,
                username: action.payload.username,
                expiresAt: action.payload.expiresAt,
                isLoading: false,
                error: null
            });

        case 'AUTHENTICATION_FAILURE':
            return state.merge({
                isAuthenticated: false,
                accessToken: null,
                refreshToken: null,
                roles: [],
                username: null,
                expiresAt: null,
                isLoading: false,
                error: action.error
            });

        case 'AUTHENTICATION_REQUIRED':
            return state.merge({
                isAuthenticated: false,
                accessToken: null,
                refreshToken: null
            });

        case 'LOGOUT':
            return initialState;

        default:
            return state;
    }
}