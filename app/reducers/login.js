import { Map } from 'immutable';
import * as types from '../constants/ActionTypes';

const initialState = Map({
    isAuthenticating: false,
    accessToken: '',
    refreshToken: '',
    error: null
});

export default function login(state = initialState, action) {
    switch (action.type) {
        case types.AUTHENTICATION_REQUEST:
            return state.merge({
                isAuthenticating: true,
                error: null
            });

        case types.AUTHENTICATION_SUCCESS:
            return state.merge({
                isAuthenticating: false,
                accessToken: action.accessToken,
                refreshToken: action.refreshToken,
                error: null
            });

        case types.AUTHENTICATION_FAILURE:
            return state.merge({
                isAuthenticating: false,
                accessToken: '',
                refreshToken: '',
                error: action.error
            });

        default:
            return state;
    }
}