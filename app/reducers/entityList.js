import { Map } from 'immutable';
import * as types from '../constants/ActionTypes';

const initialState = Map({
    items: [],
    isFetching: false
});

export default function entityList(state = initialState, action) {
    switch (action.type) {
        case types.LOAD_ENTITY_SCREEN_REQUEST:
            return state.set('isFetching', true);
        case types.LOAD_ENTITY_SCREEN_SUCCESS:
            return state.set('items', action.items)
                       .set('isFetching', false);
        default:
            return state;
    }
}