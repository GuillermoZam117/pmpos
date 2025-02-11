import { combineReducers } from 'redux';
import { Map, fromJS } from 'immutable';
import loginReducer from './loginReducer';

// App slice initial state
const initialState = Map({
    isAuthenticated: false,
    menu: null,
    entities: [],
    currentTicket: null,
    terminalId: null,
    error: null,
    loading: false,
    selectedCategory: null
});

// App reducer
const appReducer = (state = initialState, action) => {
    console.log('📥 Action received:', action.type);
    
    switch (action.type) {
        case 'SET_TERMINAL_ID':
            return state.set('terminalId', action.terminalId);
        case 'SET_ENTITIES':
            return state.set('entities', fromJS(action.entities));
        case 'SET_MENU':
            return state.set('menu', fromJS(action.menu));
        case 'SET_SELECTED_CATEGORY':
            return state.set('selectedCategory', action.category);
        case 'SET_ERROR':
            return state.set('error', action.error);
        default:
            return state;
    }
};

// Combine reducers
const rootReducer = combineReducers({
    app: appReducer,
    login: loginReducer
});

// Debug middleware
const withDebug = (reducer) => (state, action) => {
    const prevState = {
        app: state?.app?.toJS?.() || state?.app,
        login: state?.login?.toJS?.() || state?.login
    };
    console.log('🏃‍♂️ Previous state:', prevState);
    
    const nextState = reducer(state, action);
    
    console.log('✨ Next state:', {
        app: nextState?.app?.toJS?.() || nextState?.app,
        login: nextState?.login?.toJS?.() || nextState?.login
    });
    
    return nextState;
};

export default withDebug(rootReducer);