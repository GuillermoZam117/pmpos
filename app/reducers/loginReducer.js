import { Map } from 'immutable';

const initialState = Map({
    isAuthenticated: false,
    token: null,
    user: null,
    error: null
});

export default function loginReducer(state = initialState, action) {
    switch (action.type) {
        case 'LOGIN_SUCCESS':
            return state.merge({
                isAuthenticated: true,
                token: action.payload.token,
                user: action.payload.user,
                error: null
            });
        case 'LOGIN_FAILURE':
            return state.merge({
                isAuthenticated: false,
                token: null,
                user: null,
                error: action.payload
            });
        case 'LOGOUT':
            return initialState;
        default:
            return state;
    }
}