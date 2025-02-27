import * as types from '../constants/ActionTypes';

export const changeSelectedCategory = (category) => ({
    type: types.CHANGE_SELECTED_CATEGORY,
    category,
});

export const setTerminalId = (terminalId) => ({
    type: types.SET_TERMINAL_ID,
    terminalId,
});

export const updateMessage = (message) => ({
    type: types.UPDATE_MESSAGE,
    message,
});

export const closeMessage = () => ({
    type: types.CLOSE_MESSAGE,
});

export const setTicket = (ticket) => ({
    type: types.SET_TICKET,
    ticket,
});

export const ticketsNeedsRefresh = () => ({
    type: types.TICKETS_NEEDS_REFRESH,
});

export const ticketsRefreshed = () => ({
    type: types.TICKETS_REFRESHED,
});

export const setOrderTagColors = (colors) => ({
    type: types.SET_ORDER_TAG_COLORS,
    colors,
});

export const setMenu = (menu) => ({
    type: types.SET_MENU,
    menu,
});

export const setMenuItems = (menuItems) => ({
    type: types.SET_MENU_ITEMS,
    menuItems,
});

export const loadEntityScreenRequest = (screen) => ({
    type: types.LOAD_ENTITY_SCREEN_REQUEST,
    screen,
});

export const loadEntityScreenSuccess = (screen, items) => ({
    type: types.LOAD_ENTITY_SCREEN_SUCCESS,
    screen,
    items,
});

export const loadEntityScreenFailure = (screen, error) => ({
    type: types.LOAD_ENTITY_SCREEN_FAILURE,
    screen,
    error,
});

export const loadMyTicketsRequest = () => ({
    type: types.LOAD_MYTICKETS_REQUEST,
});

export const loadMyTicketsSuccess = (items) => ({
    type: types.LOAD_MYTICKETS_SUCCESS,
    items,
});

export const loadMyTicketsFailure = (error) => ({
    type: types.LOAD_MYTICKETS_FAILURE,
    error,
});

// Authentication Actions
export const authenticationRequest = (credentials) => ({
    type: types.AUTHENTICATION_REQUEST,
    credentials
});

export const authenticationSuccess = (tokens) => ({
    type: types.AUTHENTICATION_SUCCESS,
    ...tokens
});

export const authenticationFailure = (error) => ({
    type: types.AUTHENTICATION_FAILURE,
    error
});

// Add these exports to existing actions
export const loadDepartmentRequest = () => ({
    type: 'LOAD_DEPARTMENT_REQUEST'
});

export const loadDepartmentSuccess = (department) => ({
    type: 'LOAD_DEPARTMENT_SUCCESS',
    department
});

export const loadDepartmentFailure = (error) => ({
    type: 'LOAD_DEPARTMENT_FAILURE',
    error
});
