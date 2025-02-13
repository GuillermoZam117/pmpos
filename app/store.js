import { createStore, applyMiddleware, compose, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import { Map } from 'immutable';
import { tokenService } from './services/tokenService';

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

// Action Types
export const AUTH_ACTIONS = {
    LOGIN_REQUEST: 'AUTH_LOGIN_REQUEST',
    LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
    LOGIN_FAILURE: 'AUTH_LOGIN_FAILURE',
    LOGOUT: 'AUTH_LOGOUT',
    SET_TOKEN: 'AUTH_SET_TOKEN',
    CLEAR_TOKEN: 'AUTH_CLEAR_TOKEN',
    AUTH_ERROR: 'AUTH_ERROR'
};

// Initial state
const initialState = {
    app: Map({
        message: Map({
            text: '',
            isOpen: false
        }),
        terminalId: '',
        ticket: null,
        isLoading: false,
        error: null
    }),
    auth: Map({
        token: null,
        expiryDate: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        accessToken: null,
        refreshToken: null
    })
};

// Reducers
const appReducer = (state = initialState.app, action) => {
    switch (action.type) {
        case 'SET_TERMINAL_ID':
            return state.set('terminalId', action.payload);
        default:
            return state;
    }
};

const authReducer = (state = initialState.auth, action) => {
    switch (action.type) {
        case AUTH_ACTIONS.LOGIN_REQUEST:
            return state.merge({
                isLoading: true,
                error: null
            });
        case AUTH_ACTIONS.LOGIN_SUCCESS:
            return state.merge({
                token: action.payload.token,
                expiryDate: action.payload.expiryDate,
                isAuthenticated: true,
                isLoading: false,
                error: null,
                accessToken: action.payload.accessToken,
                refreshToken: action.payload.refreshToken
            });
        case AUTH_ACTIONS.LOGIN_FAILURE:
            return state.merge({
                token: null,
                expiryDate: null,
                isAuthenticated: false,
                isLoading: false,
                error: action.payload,
                accessToken: null,
                refreshToken: null
            });
        case AUTH_ACTIONS.SET_TOKEN:
            return state.merge({
                token: action.payload.token,
                expiryDate: action.payload.expiryDate,
                isAuthenticated: true,
                error: null
            });
        case AUTH_ACTIONS.CLEAR_TOKEN:
            return state.merge({
                token: null,
                expiryDate: null,
                isAuthenticated: false,
                error: null
            });
        case AUTH_ACTIONS.AUTH_ERROR:
            return state.merge({
                error: action.payload,
                isAuthenticated: false
            });
        default:
            return state;
    }
};

const rootReducer = combineReducers({
    app: appReducer,
    auth: authReducer
});

// Create store with middleware
export const store = createStore(
    rootReducer,
    composeEnhancers(applyMiddleware(thunk))
);

// Enable HMR for reducers
if (module.hot) {
    module.hot.accept('./reducers', () => {
        store.replaceReducer(rootReducer);
    });
}

// Subscribe to store changes to sync with tokenService
store.subscribe(() => {
    const state = store.getState();
    const token = state.auth.get('token');
    const expiryDate = state.auth.get('expiryDate');
    
    if (token && expiryDate) {
        tokenService.setToken(token, new Date(expiryDate));
    }
});