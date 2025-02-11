import { combineReducers } from 'redux';
import app from './app';
import menu from './menu';
import entityList from './entityList';
import login from './login';

const rootReducer = combineReducers({
    app,
    menu,
    entityList,
    login
});

export default rootReducer;