import { Map } from 'immutable';

const initialState = Map({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    token: null,
    tokenExpiry: null,
    user: null
});

export default function auth(state = initialState, action) {
    console.log('📣 Auth Reducer:', action.type);
    
    switch (action.type) {
        case AUTH_ACTIONS.LOGIN_REQUEST:
            return state.merge({
                isLoading: true,
                error: null
            });
            
        case AUTH_ACTIONS.LOGIN_SUCCESS:
            return state.merge({
                isAuthenticated: true,
                isLoading: false,
                error: null,
                token: action.payload.token,
                tokenExpiry: action.payload.expiry,
                user: action.payload.user
            });
            
        case AUTH_ACTIONS.LOGIN_FAILURE:
            return state.merge({
                isAuthenticated: false,
                isLoading: false,
                error: action.error,
                token: null,
                tokenExpiry: null,
                user: null
            });

        default:
            return state;
    }
}