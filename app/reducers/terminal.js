import { Map } from 'immutable';

const initialState = Map({
    id: null,
    currentTicket: null
});

export default function terminalReducer(state = initialState, action) {
    switch (action.type) {
        case 'SET_TERMINAL_ID':
            return state.set('id', action.payload);
        case 'SET_CURRENT_TICKET':
            return state.set('currentTicket', action.payload);
        case 'CLEAR_TERMINAL':
            return initialState;
        default:
            return state;
    }
}