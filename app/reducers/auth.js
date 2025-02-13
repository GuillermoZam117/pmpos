import { Map } from 'immutable';
import { AUTH_ACTIONS } from '../actions/types';

const initialState = Map({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    token: null,
    tokenExpiry: null,
    user: null
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
            console.log('🔐 Login Success - User:', action.payload.user);  // Debug log
            localStorage.setItem('isAuthenticated', 'true');
            return state.merge({
                isAuthenticated: true,
                isLoading: false,
                error: null,
                token: action.payload.token,
                tokenExpiry: action.payload.tokenExpiry,
                user: Map(action.payload.user)  // Convert to Immutable Map
            });
            
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
            return initialState;

        default:
            return state;
    }
}