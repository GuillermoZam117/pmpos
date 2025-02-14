import { Map } from 'immutable';
import { AUTH_ACTIONS } from '../actions/types';

const initialState = Map({
    isAuthenticated: false,
    user: null,
    token: null,
    error: null
});

export default function auth(state = initialState, action) {
    console.log('📣 Auth Reducer:', action.type, action.payload);  // Added payload logging
    
    switch (action.type) {
        case AUTH_ACTIONS.LOGIN_REQUEST:
            return state.merge({
                isLoading: true,
                error: null
            });
            
        case AUTH_ACTIONS.LOGIN_SUCCESS:
            return {
                ...state,
                isAuthenticated: true,
                user: action.payload.user,
                token: action.payload.token,
                loading: false,
                error: null
            };
            
        case AUTH_ACTIONS.LOGIN_FAILURE:
            console.log('❌ Login Failure:', action.error);  // Debug log
            return state.merge({
                isAuthenticated: false,
                isLoading: false,
                error: action.error,
                token: null,
                tokenExpiry: null,
                user: null
            });

        case AUTH_ACTIONS.LOGOUT:
            return {
                ...state,
                isAuthenticated: false,
                user: null,
                error: null
                // Keep token
            };

        case AUTH_ACTIONS.TOKEN_EXPIRED:
        case AUTH_ACTIONS.UNAUTHORIZED:
            // Aquí sí limpiamos todo, incluyendo el token
            localStorage.removeItem('access_token');
            return initialState;

        default:
            return state;
    }
}