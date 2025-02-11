import { Map } from 'immutable';

const initialState = Map({
    accessToken: null,
    refreshToken: null,
    isLoading: false,
    error: null
});

export default function login(state = initialState, action) {
    switch (action.type) {
        case 'LOGIN_REQUEST':
            return state.merge({
                isLoading: true,
                error: null
            });

        case 'LOGIN_SUCCESS':
            return state.merge({
                isLoading: false,
                accessToken: action.payload.accessToken,
                refreshToken: action.payload.refreshToken,
                error: null
            });

        case 'LOGIN_FAILURE':
            return state.merge({
                isLoading: false,
                accessToken: null,
                refreshToken: null,
                error: action.payload
            });

        default:
            return state;
    }
}