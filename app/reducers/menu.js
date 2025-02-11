import { Map } from 'immutable';
import * as types from '../constants/ActionTypes';

const initialState = Map({
    selectedCategory: '',
    orderTagColors: {},
    menu: null,
    menuItems: []
});

export default function menu(state = initialState, action) {
    switch (action.type) {
        case types.SET_MENU:
            return state.set('menu', action.menu);
        case types.SET_MENU_ITEMS:
            return state.set('menuItems', action.items);
        default:
            return state;
    }
}