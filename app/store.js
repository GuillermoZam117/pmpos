import { createStore } from 'redux';
import { Map } from 'immutable';
import rootReducer from './reducers';

const initialState = {
  app: Map({
    message: Map({
      text: '',
      isOpen: false
    }),
    terminalId: '',
    ticket: null,
    isLoading: false,
    error: null
  })
};

export const store = createStore(
  rootReducer,
  initialState,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
);