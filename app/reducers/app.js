import { Map } from 'immutable';
import * as types from '../constants/ActionTypes';

const initialState = Map({
    message: Map({ text: '', isOpen: false }),
    terminalId: '',
    ticket: null,
    isLoading: false,
    error: null
});

function setTerminalId(state, terminalId) {
    return state.set('terminalId', terminalId);
}

function setMessage(state, message) {
    return state.set('message', Map({ text: message, isOpen: true }));
}

function closeMessage(state) {
    return state.set('message', Map({ text: '', isOpen: false }));
}

function setTicket(state, ticket) {
    return state.set('ticket', ticket)
}

export default function app(state = initialState, action) {
    switch (action.type) {
        case 'SET_MESSAGE':
            return {
                ...state,
                message: action.payload
            };
        case types.CHANGE_TERMINALID:
            return setTerminalId(state, action.terminalId);
        case types.UPDATE_MESSAGE:
            return setMessage(state, action.message);
        case types.CLOSE_MESSAGE:
            return closeMessage(state);
        case types.SET_TICKET:
            return setTicket(state, action.ticket);
        default:
            return state;
    }
}