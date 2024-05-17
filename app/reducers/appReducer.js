const initialState = {
    terminalId: null,
    message: {
      text: '',
      isOpen: false
    },
    ticket: null,
  };
  
  const appReducer = (state = initialState, action) => {
    switch (action.type) {
      case 'CHANGE_TERMINAL_ID':
        return {
          ...state,
          terminalId: action.payload
        };
      case 'SET_TICKET':
        return {
          ...state,
          ticket: action.payload
        };
      case 'CLOSE_MESSAGE':
        return {
          ...state,
          message: {
            ...state.message,
            isOpen: false
          }
        };
      case 'UPDATE_MESSAGE':
        return {
          ...state,
          message: {
            text: action.payload,
            isOpen: true
          }
        };
      default:
        return state;
    }
  };
  
  export default appReducer;
  