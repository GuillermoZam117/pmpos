import { Map } from 'immutable';
import * as types from '../constants/ActionTypes';

const initialState = Map({
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

export default function appReducer(state = initialState, action) {
  switch (action.type) {
    case types.UPDATE_MESSAGE:
      return state.setIn(['message', 'text'], action.message)
                  .setIn(['message', 'isOpen'], true);
    case types.CLOSE_MESSAGE:
      return state.setIn(['message', 'text'], '')
                  .setIn(['message', 'isOpen'], false);
    case types.CHANGE_TERMINALID:
      return state.set('terminalId', action.terminalId);
    case 'SET_TERMINAL_ID':
      return state.set('terminalId', action.payload);
    case types.SET_TICKET:
      return state.set('ticket', action.ticket);
    case 'SET_TICKET':
      return state.set('ticket', action.payload);
    case 'AUTHENTICATION_SUCCESS':
      return state.merge({
        isAuthenticated: true,
        error: null
      });
    case 'AUTHENTICATION_REQUIRED':
      return state.merge({
        isAuthenticated: false,
        error: 'Authentication required'
      });
    case 'AUTHENTICATION_FAILURE':
      return state.merge({
        isAuthenticated: false,
        error: action.error
      });
    default:
      return state;
  }
}