import * as types from '../constants/ActionTypes';

const initialState = {
    isAuthenticated: false,
    token: null,
    loading: false,
    error: null
};

export default function auth(state = initialState, action) {
    switch (action.type) {
        case 'AUTHENTICATION_REQUEST':
            return {
                ...state,
                loading: true,
                error: null
            };
        case 'AUTHENTICATION_SUCCESS':
            return {
                ...state,
                isAuthenticated: true,
                token: action.payload.token,
                loading: false,
                error: null
            };
        case 'AUTHENTICATION_FAILURE':
            return {
                ...state,
                isAuthenticated: false,
                token: null,
                loading: false,
                error: action.error
            };
        default:
            return state;
    }
}