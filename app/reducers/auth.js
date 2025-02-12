import { AUTH_TYPES } from '../actions/auth';

const initialState = {
    isAuthenticated: false,
    user: null,
    token: null,
    loading: false,
    error: null
};

export default function authReducer(state = initialState, action) {
    switch (action.type) {
        case AUTH_TYPES.LOGIN_REQUEST:
            return {
                ...state,
                loading: true,
                error: null
            };
        case AUTH_TYPES.LOGIN_SUCCESS:
            return {
                ...state,
                isAuthenticated: true,
                user: action.payload.user,
                token: action.payload.token,
                loading: false,
                error: null
            };
        case AUTH_TYPES.LOGIN_FAILURE:
            return {
                ...state,
                isAuthenticated: false,
                user: null,
                token: null,
                loading: false,
                error: action.payload
            };
        default:
            return state;
    }
}