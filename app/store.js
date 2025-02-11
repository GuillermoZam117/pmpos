import { createStore, applyMiddleware, compose } from 'redux';
import { Map } from 'immutable';
import { thunk } from 'redux-thunk';
import rootReducer from './reducers';

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

// Create plain object initial state
const initialState = {
    app: Map({
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
        isFetching: false
    }),
    login: Map({
        isAuthenticating: false,
        accessToken: '',
        refreshToken: '',
        error: null
    }),
    menu: Map({
        selectedCategory: '',
        orderTagColors: Map({}),
        menu: null,
        menuItems: []
    }),
    entityList: Map({
        items: [],
        isFetching: false
    })
};

export const store = createStore(
    rootReducer,
    initialState,
    composeEnhancers(applyMiddleware(thunk))
);

// Add store to window for debugging
if (process.env.NODE_ENV !== 'production') {
    window.store = store;
}

// Enable HMR for reducers
if (module.hot) {
    module.hot.accept('./reducers', () => {
        const nextRootReducer = require('./reducers').default;
        store.replaceReducer(nextRootReducer);
    });
}