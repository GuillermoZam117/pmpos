// Small action creators for app-level state
export const setTerminalInApp = (terminalId) => ({
    type: 'SET_TERMINAL_ID',
    payload: terminalId
});

export const closeMessage = () => ({ type: 'CLOSE_MESSAGE' });

export default {
    setTerminalInApp,
    closeMessage
};
