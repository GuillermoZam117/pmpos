export const SET_CURRENT_TICKET = 'SET_CURRENT_TICKET';
export const CLEAR_CURRENT_TICKET = 'CLEAR_CURRENT_TICKET';

export const setCurrentTicket = (ticket) => ({
    type: SET_CURRENT_TICKET,
    payload: ticket
});

export const clearCurrentTicket = () => ({
    type: CLEAR_CURRENT_TICKET
});