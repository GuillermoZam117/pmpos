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
  isFetching: false
});

export default function app(state = initialState, action) {
  switch (action.type) {
    case types.UPDATE_MESSAGE:
      return state.setIn(['message', 'text'], action.message)
                  .setIn(['message', 'isOpen'], true);
    case types.CLOSE_MESSAGE:
      return state.setIn(['message', 'text'], '')
                  .setIn(['message', 'isOpen'], false);
    case types.CHANGE_TERMINALID:
      return state.set('terminalId', action.terminalId);
    case types.SET_TICKET:
      return state.set('ticket', action.ticket);
    default:
      return state;
  }
}