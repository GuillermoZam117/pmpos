import { Map } from 'immutable';
import { AUTH_ACTIONS } from '../actions/types';
import Debug from 'debug';

const debug = Debug('pmpos:auth');

const initialState = Map({
    isAuthenticated: false,
    user: null,
    token: null,
    tokenExpiry: null,
    error: null,
    loading: false,
    lastCheck: null
});

export default function auth(state = initialState, action) {
    debug('📣 Auth Action:', action.type);

    switch (action.type) {
        case AUTH_ACTIONS.LOGIN_REQUEST:
            debug('🔄 Login request started');
            return state.merge({
                loading: true,
                error: null
            });
            
        case AUTH_ACTIONS.LOGIN_SUCCESS:
            debug('✅ Login successful:', action.payload.user?.name);
            return state.merge({
                isAuthenticated: true,
                user: action.payload.data,
                token: action.payload.token,
                tokenExpiry: action.payload.tokenExpiry,
                loading: false,
                error: null,
                lastCheck: Date.now()
            });
            
        case AUTH_ACTIONS.LOGIN_FAILURE:
            debug('❌ Login failed:', action.error);
            return state.merge({
                isAuthenticated: false,
                loading: false,
                error: action.error,
                user: null
            });

        case AUTH_ACTIONS.LOGOUT:
            debug('🔓 User logout - preserving token');
            return state.merge({
                isAuthenticated: false,
                user: null,
                error: null,
                loading: false
            });

        case AUTH_ACTIONS.TOKEN_CHECK:
            debug('🔍 Token check:', action.payload?.valid ? 'valid' : 'invalid');
            return state.merge({
                lastCheck: Date.now(),
                error: action.payload?.error
            });

        case AUTH_ACTIONS.TOKEN_EXPIRED:
            debug('⚠️ Token expired');
            localStorage.removeItem('access_token');
            localStorage.removeItem('token_expiry');
            return initialState;

        case AUTH_ACTIONS.UNAUTHORIZED:
            debug('🚫 Unauthorized access');
            localStorage.removeItem('access_token');
            return initialState;

        case AUTH_ACTIONS.CLEAR_ERROR:
            return state.set('error', null);

        default:
            return state;
    }
}