import { createStore, applyMiddleware, combineReducers } from 'redux';
import { thunk } from 'redux-thunk';
import { Map } from 'immutable';

// Initial states
const initialAppState = Map({
    message: Map({
        text: '',
        isOpen: false
    }),
    terminalId: '',
    ticket: null,
    isLoading: false,
    error: null,
    items: [],
    ticketsNeedsRefresh: false,
    isFetching: false,
    isAuthenticated: false
});

const initialLoginState = Map({
    accessToken: null,
    refreshToken: null,
    isLoading: false,
    error: null
});

// Reducers
const app = (state = initialAppState, action) => {
    switch (action.type) {
        case 'SET_TERMINAL_ID':
            return state.set('terminalId', action.payload);
        case 'SET_TICKET':
            return state.set('ticket', action.payload);
        default:
            return state;
    }
};

const login = (state = initialLoginState, action) => {
    switch (action.type) {
        case 'AUTHENTICATION_SUCCESS':
            return state.merge({
                accessToken: action.payload.accessToken,
                refreshToken: action.payload.refreshToken,
                isLoading: false
            });
        default:
            return state;
    }
};

const rootReducer = combineReducers({
    app,
    login
});

export const configureStore = () => {
    const store = createStore(
        rootReducer,
        applyMiddleware(thunk)
    );

    if (module.hot) {
        module.hot.accept('./reducers', () => {
            store.replaceReducer(rootReducer);
        });
    }

    return store;
};

export const store = configureStore();