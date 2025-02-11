import { createStore, applyMiddleware, compose } from 'redux';
import { thunk } from 'redux-thunk';  // Updated import
import rootReducer from './reducers';
import { createLogger } from 'redux-logger';

// Redux DevTools configuration
const composeEnhancers = 
    typeof window === 'object' && 
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ? 
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
        trace: true,
        traceLimit: 25
    }) : compose;

// Configure logger
const logger = createLogger({
    collapsed: true,
    diff: true,
    colors: {
        title: () => '#08f',
        prevState: () => '#999',
        action: () => '#03A9F4',
        nextState: () => '#4CAF50',
        error: () => '#F20404',
    }
});

// Create store with middleware
export const store = createStore(
    rootReducer,
    composeEnhancers(
        applyMiddleware(
            thunk,
            logger
        )
    )
);

// Development helpers
if (process.env.NODE_ENV !== 'production') {
    window.store = store;
    window.getState = store.getState;
}

// HMR support
if (module.hot) {
    module.hot.accept('./reducers', () => {
        const nextRootReducer = require('./reducers').default;
        store.replaceReducer(nextRootReducer);
    });
}