import $ from 'jquery';
import jQuery from 'jquery';
import { appconfig } from './config';
import { store } from './store';
import * as Actions from './actions';
import createClient, { queries } from './utils/graphqlClient';
import { login } from './actions/auth';
import { jwtDecode } from 'jwt-decode';
import config from './config';

const config = appconfig();

const SESSION_DURATION = 1000 * 60 * 60; // 1 hour
const TOKEN_REFRESH_THRESHOLD = 1000 * 60 * 5; // 5 minutes

function isTokenExpired(token) {
    if (!token) return true;
    try {
        const decoded = jwtDecode(token);
        return decoded.exp * 1000 < Date.now();
    } catch (error) {
        console.error('Token decode error:', error);
        return true;
    }
}

$.postJSON = function (query, callback) {
    const accessToken = store.getState().login.get('accessToken');
    const refreshToken = store.getState().login.get('refreshToken');

    const data = JSON.stringify({ query: query });
    return jQuery.ajax({
        'type': 'POST',
        'url': config.GQLurl,
        headers: { 'Authorization': 'Bearer ' + accessToken },
        'contentType': 'application/json',
        'data': data,
        'dataType': 'json'
    })
        .done(response => { if (callback) callback(response) })
        .fail(response => {
            if (response.status === 401 && refreshToken) {
                console.log(refreshToken);
                RefreshToken(refreshToken, (response) => {
                    if (response.status === 200) {
                        $.postJSON(query, callback);
                        return;
                    }
                })
                window.location = '#/login';
                return;
            }
            if (response.status === 401 && !refreshToken) {
                window.location = '#/login';
                return
            }
            if (callback) callback(response.responseJSON)
        });
};

export function RefreshToken(refreshToken, callback) {
    store.dispatch(Actions.authenticationRequest());
    jQuery.ajax({
        'type': 'POST',
        'url': config.authUrl,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: $.param({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: 'pmpos', client_secret: 'test' })
    }).done(response => {
        store.dispatch(Actions.authenticationSuccess(response.access_token, response.refresh_token));
        callback(response);
    }).fail(response => {
        store.dispatch(Actions.authenticationFailure());
        callback(response);
    });
}

const appSettings = appconfig(); // Changed name to avoid conflict

export const authenticate = async () => {
    try {
        const response = await fetch(appSettings.authUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'password',
                username: appSettings.userName,
                password: appSettings.password,
                client_id: appSettings.clientId
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error_description || 'Authentication failed');
        }

        const data = await response.json();
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token
        };
    } catch (error) {
        console.error('Authentication error:', error);
        throw error;
    }
};

export const ensureAuthenticated = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        // Try to get new token
        const authResult = await authenticate();
        localStorage.setItem('access_token', authResult.accessToken);
        return authResult.accessToken;
    }
    return token;
};

// Add new function for session management
function setupSessionRefresh(sessionData) {
    const timeUntilRefresh = sessionData.expiresAt - Date.now() - TOKEN_REFRESH_THRESHOLD;
    
    setTimeout(async () => {
        try {
            await RefreshToken(sessionData.refreshToken, (response) => {
                if (response.status === 200) {
                    const newSessionData = {
                        ...sessionData,
                        accessToken: response.access_token,
                        refreshToken: response.refresh_token,
                        expiresAt: Date.now() + SESSION_DURATION
                    };
                    localStorage.setItem('session', JSON.stringify(newSessionData));
                    setupSessionRefresh(newSessionData);
                } else {
                    store.dispatch({ type: 'AUTHENTICATION_REQUIRED' });
                    window.location = '#/login';
                }
            });
        } catch (error) {
            console.error('Session refresh failed:', error);
            store.dispatch({ type: 'AUTHENTICATION_REQUIRED' });
            window.location = '#/login';
        }
    }, timeUntilRefresh);
}

// Add permission check helper
export const hasPermission = (requiredPermission) => {
    try {
        const session = JSON.parse(localStorage.getItem('session'));
        if (!session || !session.roles) return false;
        
        // Check if user has required role/permission
        return session.roles.some(role => 
            role === 'admin' || role === requiredPermission
        );
    } catch (error) {
        console.error('Permission check error:', error);
        return false;
    }
};

export const getMenu = async (callback, token) => {
    if (!token) {
        console.error('No token provided');
        return callback(null);
    }

    try {
        const response = await fetch(config.GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                query: `
                    query {
                        menu: getMenu(name: "${config.menuName}") {
                            id
                            name
                            categories {
                                id
                                name
                                menuItems {
                                    id
                                    name
                                    price
                                }
                            }
                        }
                    }
                `
            })
        });

        const result = await response.json();
        console.log('Menu response:', result);

        if (result.errors) {
            console.error('GraphQL errors:', result.errors);
            return callback(null);
        }

        callback(result.data?.menu);
    } catch (error) {
        console.error('Menu fetch error:', error);
        callback(null);
    }
};

export const getProductPortions = async (productId) => {
    try {
        const response = await fetch(config.GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await getToken()}`
            },
            body: JSON.stringify({
                query: `
                    query GetProductPortions($productId: ID!) {
                        portions: getProductPortions(productId: $productId) {
                            id
                            name
                            price
                        }
                    }
                `,
                variables: {
                    productId
                }
            })
        });

        const result = await response.json();
        
        if (result.errors) {
            console.error('GraphQL errors:', result.errors);
            throw new Error(result.errors[0].message);
        }

        return result.data.portions;
    } catch (error) {
        console.error('Failed to fetch product portions:', error);
        throw error;
    }
};

export function getProductOrderTags(productId, portion, callback) {
    const query = getProductOrderTagsScript(productId, portion);
    $.postJSON(query, function (response) {
        if (response.errors) {
            //handle
        } else {
            if (callback) callback(response.data.orderTags);
        }
    });
}

export function registerTerminal(callback) {
    const query = getRegisterTerminalScript();
    $.postJSON(query, function (response) {
        if (response.errors) {
            //handle
        } else {
            if (callback) callback(response.data.terminalId);
        }
    });
}

export function createTerminalTicket(terminalId, callback) {
    const query = getCreateTerminalTicketScript(terminalId);
    $.postJSON(query, function (response) {
        if (response.errors) {
            //handle
        } else {
            if (callback) callback(response.data.ticket);
        }
    });
}

export function clearTerminalTicketOrders(terminalId, callback) {
    const query = getClearTerminalTicketScript(terminalId);
    $.postJSON(query, function (response) {
        if (response.errors) {
            //handle
        } else {
            if (callback) callback(response.data.ticket);
        }
    });
}

export function closeTerminalTicket(terminalId, callback) {
    const query = getCloseTerminalTicketScript(terminalId);
    $.postJSON(query, function (response) {
        if (response.errors) {
            //handle
        } else {
            if (callback) callback(response.data.errorMessage);
        }
    });
}

export const getTerminalExists = async (terminalName, callback) => {
    try {
        const token = await ensureAuthenticated();
        const query = `
            query TerminalExists($terminalName: String!) {
                terminalExists(name: $terminalName)
            }
        `;
        const response = await fetch(config.GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                query,
                variables: { terminalName }
            })
        });
        const data = await response.json();
        if (data.errors) {
            console.error('GraphQL errors:', data.errors);
            return;
        }
        if (callback) callback(data.data.terminalExists);
    } catch (error) {
        console.error('Network error:', error);
    }
};

export function addOrderToTicket(ticket, productId, quantity = 1, callback) {
    const query = getAddOrderToTicketQuery(ticket, productId, quantity);
    $.postJSON(query, function (response) {
        if (response.errors) {
            // handle errors
        } else {
            if (callback) callback(response.data.ticket);
        }
    });
}

export function addOrderToTerminalTicket(terminalId, productId, quantity = 1, orderTags = '', callback) {
    const query = getAddOrderToTerminalTicketScript(terminalId, productId, orderTags);
    $.postJSON(query, function (response) {
        if (response.errors) {
            // handle errors
        } else {
            if (callback) callback(response.data.ticket);
        }
    });
}

export function changeEntityOfTerminalTicket(terminalId, type, name, callback) {
    const query = getChangeEntityOfTerminalTicketScript(terminalId, type, name);
    $.postJSON(query, function (response) {
        if (response.errors) {
            // handle errors
        } else {
            if (callback) callback(response.data.ticket);
        }
    });
}

export const getEntityScreenItems = async (screenName, callback) => {
    const token = await ensureAuthenticated();
    const query = `
        query {
            getEntityScreenItems(screen: "${screenName}") {
                id
                name
                caption
                type
                color
            }
        }
    `;
    try {
        const response = await fetch(config.GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query })
        });
        const data = await response.json();
        if (data.errors) {
            console.error('GraphQL errors:', data.errors);
            return;
        }
        if (callback) callback(data.data.getEntityScreenItems);
    } catch (error) {
        console.error('getEntityScreenItems fetch error:', error);
    }
};

export function updateOrderPortionOfTerminalTicket(terminalId, orderUid, portion, callback) {
    const query = getUpdateOrderPortionOfTerminalTicketScript(terminalId, orderUid, portion);
    $.postJSON(query, function (response) {
        if (response.errors) {
            // handle errors
        } else {
            if (callback) callback(response.data.ticket);
        }
    });
}

export function executeAutomationCommandForTerminalTicket(terminalId, orderUid, name, value, callback) {
    const query = getExecuteAutomationCommandForTerminalTicketScript(terminalId, orderUid, name, value);
    $.postJSON(query, function (response) {
        if (response.errors) {
            // handle errors
        } else {
            if (callback) callback(response.data.ticket);
        }
    });
}

export function updateOrderTagOfTerminalTicket(terminalId, orderUid, name, tag, callback) {
    const query = getUpdateOrderTagOfTerminalTicketScript(terminalId, orderUid, name, tag);
    $.postJSON(query, function (response) {
        if (response.errors) {
            // handle errors
        } else {
            if (callback) callback(response.data.ticket);
        }
    });
}

export function getOrderTagsForTerminal(terminalId, orderUid, callback) {
    const query = getGetOrderTagsForTerminalScript(terminalId, orderUid);
    $.postJSON(query, function (response) {
        if (response.errors) {
            callback([]);
        } else {
            if (callback) callback(response.data.orderTags);
        }
    });
}

export function getOrderTagColors(callback, token) {
    fetch(config.GQLurl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            query: `{
                colors:getOrderTagColors{
                    name,
                    value
                }
            }`
        })
    })
    .then(response => response.json())
    .then(result => callback(result.data?.colors))
    .catch(error => {
        console.error('Error fetching order tag colors:', error);
        callback(null);
    });
}

export function cancelOrderOnTerminalTicket(terminalId, orderUid, callback) {
    const query = getCancelOrderOnTerminalTicketScript(terminalId, orderUid);
    $.postJSON(query, function (response) {
        if (response.errors) {
            // handle errors
        } else {
            if (callback) callback(response.data.ticket);
        }
    });
}

export function broadcastMessage(msg, callback) {
    const query = getPostBroadcastMessageScript(msg);
    $.postJSON(query, function (response) {
        if (response.errors) {
            // handle errors
        } else {
            if (callback) callback(response.data.postBroadcastMessage);
        }
    });
}

export function getTerminalTickets(terminalId, callback) {
    const query = getGetTerminalTicketsScript(terminalId);
    $.postJSON(query, function (response) {
        if (response.errors) {
            if (callback) callback(undefined);
        } else {
            if (callback) callback(response.data.tickets);
        }
    });
}

export const getTables = async (callback, token) => {
    if (!token) {
        console.error('No token provided for getTables');
        return callback(null);
    }

    fetch(config.GQLurl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            query: `
                query {
                    tables: getTables {
                        id
                        number
                        status
                        isOpen
                        totalAmount
                    }
                }
            `
        })
    })
    .then(response => response.json())
    .then(result => {
        console.log('Tables response:', result);
        if (result.errors) {
            console.error('GraphQL errors:', result.errors);
            return callback(null);
        }
        callback(result.data?.tables);
    })
    .catch(error => {
        console.error('Tables fetch error:', error);
        callback(null);
    });
};

export const createTicket = async (ticketData, callback) => {
    try {
        const token = await ensureAuthenticated();
        const response = await fetch(config.GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                query: `
                    mutation {
                        createTicket(ticketData: ${JSON.stringify(ticketData)}) {
                            id
                            status
                            createdAt
                        }
                    }
                `
            })
        });
        const data = await response.json();
        if (data.errors) {
            console.error('Create Ticket errors:', data.errors);
            return callback(null);
        }
        callback(data.data?.createTicket);
    } catch (error) {
        console.error('Create Ticket error:', error);
        callback(null);
    }
};

export function getTerminalTicket(terminalId, callback) {
    const query = getGetTerminalTicketScript(terminalId);
    $.postJSON(query, function (response) {
        if (response.errors) {
            if (callback) callback(undefined);
        } else {
            if (callback) callback(response.data.ticket);
        }
    });
}

function getMenuScript() {
    return `{menu:getMenu(name:"${config.menuName}"){categories{id,name,color,foreground,menuItems{id,name,color,caption,foreground,productId,defaultOrderTags}}}}`;
}

function getProductPortionsScript(productId) {
    return `{portions:getProductPortions(productId:${productId}){id,name,price}}`;
}

function getProductOrderTagsScript(productId, portion) {
    return `{orderTags:getOrderTagGroups(productId:${productId},portion:"${portion}",hidden:false){name,tags{name}}}`;
}

function getGetOrderTagsForTerminalScript(terminalId, orderUid) {
    return `
    mutation tags{orderTags:getOrderTagsForTerminalTicketOrder(
        terminalId:"${terminalId}"
        orderUid:"${orderUid}")
    {name,tags{caption,color,labelColor,name}}}`;
}

function getRegisterTerminalScript() {
    return `mutation m{terminalId:registerTerminal(
        terminal:"${config.terminalName}",
        department:"${config.departmentName}",
        user:"${config.userName}",
        ticketType:"${config.ticketTypeName}")}`;
}

function getGetTerminalTicketScript(terminalId) {
    return `query q{
            ticket:getTerminalTicket(terminalId:"${terminalId}")
        ${getTicketResult()}}`;
}

function getLoadTerminalTicketScript(terminalId, ticketId) {
    return `mutation m{
            ticket:loadTerminalTicket(terminalId:"${terminalId}", ticketId:"${ticketId}")
        ${getTicketResult()}}`;
}

function getGetTerminalTicketsScript(terminalId) {
    return `query q{
            tickets:getTerminalTickets(terminalId:"${terminalId}")
        {id,date,lastOrderDate,remaining,number,entities{type,name}}}`;
}

function getClearTerminalTicketScript(terminalId) {
    return `mutation m{
            ticket:clearTerminalTicketOrders(terminalId:"${terminalId}")
        ${getTicketResult()}}`;
}

function getUpdateOrderPortionOfTerminalTicketScript(terminalId, orderUid, portion) {
    return `mutation m {ticket:updateOrderOfTerminalTicket(
        terminalId:"${terminalId}",orderUid:"${orderUid}",portion:"${portion}")
    ${getTicketResult()}}`;
}

function getUpdateOrderTagOfTerminalTicketScript(terminalId, orderUid, name, tag) {
    return `mutation m{ticket:updateOrderOfTerminalTicket(
        terminalId:"${terminalId}",
        orderUid:"${orderUid}",
        orderTags:[{tagName:"${name}",tag:"${tag}"}])
    ${getTicketResult()}}`;
}

function getExecuteAutomationCommandForTerminalTicketScript(terminalId, orderUid, name, value) {
    return `mutation m{ticket:executeAutomationCommandForTerminalTicket(
        terminalId:"${terminalId}",
        orderUid:"${orderUid}",
        name:"${name}",
        value:"${value}")
    ${getTicketResult()}}`;
}

function getCancelOrderOnTerminalTicketScript(terminalId, orderUid) {
    return `mutation m{ticket:cancelOrderOnTerminalTicket(terminalId:"${terminalId}",orderUid:"${orderUid}")
    ${getTicketResult()}}`;
}

function getCloseTerminalTicketScript(terminalId) {
    return `mutation m{
            errorMessage:closeTerminalTicket(terminalId:"${terminalId}")}`;
}

function getGetTerminalExistsScript(terminalId) {
    return `query q{
            result:getTerminalExists(terminalId:"${terminalId}")}`;
}

function getAddOrderToTerminalTicketScript(terminalId, productId, orderTags) {
    return `mutation m{
            ticket:addOrderToTerminalTicket(terminalId:"${terminalId}",
            productId:${productId}
            orderTags:"${orderTags}")
        ${getTicketResult()}}`;
}

function getChangeEntityOfTerminalTicketScript(terminalId, type, name) {
    return `mutation m{
            ticket:changeEntityOfTerminalTicket(terminalId:"${terminalId}",
            type:"${type}"
            name:"${name}")
        ${getTicketResult()}}`;
}

function getGetEntityScreenItemsScript(name) {
    return `query q{items:getEntityScreenItems(name:"${name}"){name,caption,color,labelColor}}`;
}

function getGetOrderTagColorsScript() {
    return '{colors:getOrderTagColors{name,value}}';
}

function getTicketResult() {
    return `{id,uid,type,number,date,totalAmount,remainingAmount,
  entities{name,type},      
  states{stateName,state},
  tags{tagName,tag},
    orders{
    id,
    uid,
    productId,
    name,
    quantity,
    portion,
    price,
    priceTag,
    calculatePrice,
    increaseInventory,
    decreaseInventory,
    locked,
    tags{
      tag,tagName,price,quantity,rate,userId
    },
    states{
      stateName,state,stateValue
    }}
}`;
}

function getAddOrderToTicketQuery(ticket, menuItem, quantity = 1) {
    var {totalAmount, remainingAmount, ...ticket2} = ticket;
    var ticketStr = JSON.stringify(ticket2);
    ticketStr = ticketStr.replace(/\"([^(\")"]+)\":/g, '$1:');

    return `
mutation m{ticket:addOrderToTicket(
  ticket:${ticketStr},menuItem:"${menuItem}",quantity:${quantity}
){id,uid,type,number,date,totalAmount,remainingAmount,
  states{stateName,state},
    orders{
    id,
    uid,
    name,
    quantity,
    portion,
    price,
    calculatePrice,
    increaseInventory,
    decreaseInventory,
    tags{
      tag,tagName,price,quantity,rate,userId
    },
    states{
      stateName,state,stateValue
    }}
}}`;
}

function getPostBroadcastMessageScript(msg) {
    msg = msg.replace(/"/g, '\\"');
    return 'mutation m {postBroadcastMessage(message:"' + msg + '"){message}}';
}