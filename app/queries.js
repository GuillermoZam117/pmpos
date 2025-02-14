import $ from 'jquery';
import jQuery from 'jquery';
import { appconfig, DEV_CONFIG } from './config';
import { store } from './store';
import * as Actions from './actions';
import createClient, { queries } from './utils/graphqlClient';
import { login } from './actions/auth';
import { tokenService } from './services/tokenService';
import { gql } from 'graphql-request';
import Debug from 'debug';

const debug = Debug('pmpos:queries');

const getStoredToken = () => {
    const token = localStorage.getItem('access_token');
    const expiry = localStorage.getItem('token_expiry');
    
    if (token && expiry && new Date(expiry) > new Date()) {
        return token;
    }
    return null;
};

var config = appconfig();

export function postJSON(query, callback) {
    const token = getStoredToken();
    
    return fetch(appconfig().GQLurl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query })
    })
    .then(response => response.json())
    .then(data => {
        if (data.errors) {
            console.error('GraphQL errors:', data.errors);
            throw new Error(data.errors[0].message);
        }
        if (callback) callback(data);
        return data;
    })
    .catch(error => {
        console.error('Query error:', error);
        throw error;
    });
}

$.postJSON = function (query, callback) {
    var accessToken = store.getState().login.get('accessToken');
    var refreshToken = store.getState().login.get('refreshToken');

    var data = JSON.stringify({ query: query });
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
        'url': config.GQLserv + '/Token',
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

export function Authenticate(userName, password, callback, failCallback) {
    jQuery.ajax({
        'type': 'POST',
        'url': config.GQLserv + '/Token',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: $.param({ grant_type: 'password', username: userName, password: password, client_id: 'pmpos', client_secret: 'test' })
    }).done(response => {
        callback(response.access_token, response.refresh_token);
    }).fail(response => {
        var error = response.responseText ? JSON.parse(response.responseText).error_description : undefined;
        if (!error) {
            error = response.statusText;
        }
        console.log('error', error);
        failCallback(response.status, error)
    });
}

export function getTerminalTicket(terminalId, callback) {
    var query = getGetTerminalTicketScript(terminalId);
    $.postJSON(query, function (response) {
        if (response.errors) {
            if (callback) callback(undefined);
        } else {
            if (callback) callback(response.data.ticket);
        }
    });
}

export function loadTerminalTicket(terminalId, ticketId, callback) {
    var query = getLoadTerminalTicketScript(terminalId, ticketId);
    $.postJSON(query, function (response) {
        if (response.errors) {
            if (callback) callback(undefined);
        } else {
            if (callback) callback(response.data.ticket);
        }
    });
}

export function getTerminalTickets(terminalId, callback) {
    var query = getGetTerminalTicketsScript(terminalId);
    $.postJSON(query, function (response) {
        if (response.errors) {
            if (callback) callback(undefined);
        } else {
            if (callback) callback(response.data.tickets);
        }
    });
}

export function postRefresh() {
    var query = 'mutation m{postTicketRefreshMessage(id:0){id}}';
    $.postJSON(query);
}

export const ensureAuthenticated = async () => {
    try {
        return await tokenService.getToken();
    } catch (error) {
        console.error('Authentication failed:', error);
        throw error;
    }
};

// Función para cargar el menú (ya existente, se validan datos)
export const getMenu = async (callback) => {
    try {
        const response = await fetch(appconfig().GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query: '{ menu { categories { name items { id name price } } } }' })
        });
        const data = await response.json();
        if (data.errors) {
            console.error('❌ GraphQL errors:', data.errors);
            return;
        }
        if (callback) callback(data.data.menu);
    } catch (error) {
        console.error('❌ Menu fetch error:', error);
    }
};

export function getProductPortions(productId, callback) {
    var query = getProductPortionsScript(productId);
    $.postJSON(query, function (response) {
        if (response.errors) {
            //handle
        } else {
            if (callback) callback(response.data.portions);
        }
    });
}

export function getProductOrderTags(productId, portion, callback) {
    var query = getProductOrderTagsScript(productId, portion);
    $.postJSON(query, function (response) {
        if (response.errors) {
            //handle
        } else {
            if (callback) callback(response.data.orderTags);
        }
    });
}

export function registerTerminal(callback) {
    var query = getRegisterTerminalScript();
    $.postJSON(query, function (response) {
        if (response.errors) {
            //handle
        } else {
            if (callback) callback(response.data.terminalId);
        }
    });
}

export function createTerminalTicket(terminalId, callback) {
    var query = getCreateTerminalTicketScript(terminalId);
    $.postJSON(query, function (response) {
        if (response.errors) {
            //handle
        } else {
            if (callback) callback(response.data.ticket);
        }
    });
}

export function clearTerminalTicketOrders(terminalId, callback) {
    var query = getClearTerminalTicketScript(terminalId);
    $.postJSON(query, function (response) {
        if (response.errors) {
            //handle
        } else {
            if (callback) callback(response.data.ticket);
        }
    });
}

export function closeTerminalTicket(terminalId, callback) {
    var query = getCloseTerminalTicketScript(terminalId);
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
        const response = await fetch(appconfig().GQLurl, {
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
            console.error('❌ GraphQL errors:', data.errors);
            return;
        }
        if (callback) callback(data.data.terminalExists);
    } catch (error) {
        console.error('❌ Network error:', error);
    }
};

export function addOrderToTicket(ticket, productId, quantity = 1, callback) {
    var query = getAddOrderToTicketQuery(ticket, productId, quantity);
    $.postJSON(query, function (response) {
        if (response.errors) {
            // handle errors
        } else {
            if (callback) callback(response.data.ticket);
        }
    });
}

export function addOrderToTerminalTicket(terminalId, productId, quantity = 1, orderTags = '', callback) {
    var query = getAddOrderToTerminalTicketScript(terminalId, productId, orderTags);
    $.postJSON(query, function (response) {
        if (response.errors) {
            // handle errors
        } else {
            if (callback) callback(response.data.ticket);
        }
    });
}

export function changeEntityOfTerminalTicket(terminalId, type, name, callback) {
    var query = getChangeEntityOfTerminalTicketScript(terminalId, type, name);
    $.postJSON(query, function (response) {
        if (response.errors) {
            // handle errors
        } else {
            if (callback) callback(response.data.ticket);
        }
    });
}

export const getEntityScreenItems = async (screenName) => {
    try {
        const config = appconfig();
        const token = localStorage.getItem('access_token');

        console.log('📊 GraphQL Request:', {
            url: config.GQLurl,
            screenName,
            token: token ? '✓' : '✗'
        });

        // Use the existing query helper function
        const query = getGetEntityScreenItemsScript(screenName);

        const response = await fetch(config.GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query })
        });

        const responseText = await response.text();
        console.log('📊 Server Response:', responseText);

        try {
            const data = JSON.parse(responseText);
            
            if (!response.ok) {
                throw new Error(`Server error (${response.status}): ${data.exceptionMessage || response.statusText}`);
            }

            if (data.errors) {
                throw new Error(data.errors[0].message);
            }

            // Use the correct response path based on the query helper
            const items = data.data?.items;
            if (!items) {
                throw new Error('No items found in response');
            }

            return items;
        } catch (parseError) {
            console.error('❌ Parse Error:', parseError);
            throw new Error(`Failed to process response: ${parseError.message}`);
        }
    } catch (error) {
        console.error('❌ GraphQL Error:', error);
        throw error;
    }
};

function getGetEntityScreenItemsScript(name) {
    return `query q{
        items:getEntityScreenItems(name:"${name}"){
            name,
            caption,
            color,
            labelColor,
            state,
            id
        }
    }`;
}

export function updateOrderPortionOfTerminalTicket(terminalId, orderUid, portion, callback) {
    var query = getUpdateOrderPortionOfTerminalTicketScript(terminalId, orderUid, portion);
    $.postJSON(query, function (response) {
        if (response.errors) {
            // handle errors
        } else {
            if (callback) callback(response.data.ticket);
        }
    });
}

export function executeAutomationCommandForTerminalTicket(terminalId, orderUid, name, value, callback) {
    var query = getExecuteAutomationCommandForTerminalTicketScript(terminalId, orderUid, name, value);
    $.postJSON(query, function (response) {
        if (response.errors) {
            // handle errors
        } else {
            if (callback) callback(response.data.ticket);
        }
    });
}

export function updateOrderTagOfTerminalTicket(terminalId, orderUid, name, tag, callback) {
    var query = getUpdateOrderTagOfTerminalTicketScript(terminalId, orderUid, name, tag);
    $.postJSON(query, function (response) {
        if (response.errors) {
            // handle errors
        } else {
            if (callback) callback(response.data.ticket);
        }
    });
}

export function getOrderTagsForTerminal(terminalId, orderUid, callback) {
    var query = getGetOrderTagsForTerminalScript(terminalId, orderUid);
    $.postJSON(query, function (response) {
        if (response.errors) {
            callback([]);
        } else {
            if (callback) callback(response.data.orderTags);
        }
    });
}

export function getOrderTagColors(callback) {
    var query = getGetOrderTagColorsScript();
    $.postJSON(query, function (response) {
        if (response.errors) {
            // handle errors
        } else {
            if (callback) callback(response.data.colors);
        }
    });
}

export function cancelOrderOnTerminalTicket(terminalId, orderUid, callback) {
    var query = getCancelOrderOnTerminalTicketScript(terminalId, orderUid);
    $.postJSON(query, function (response) {
        if (response.errors) {
            // handle errors
        } else {
            if (callback) callback(response.data.ticket);
        }
    });
}

export function broadcastMessage(msg, callback) {
    var query = getPostBroadcastMessageScript(msg);
    $.postJSON(query, function (response) {
        if (response.errors) {
            // handle errors
        } else {
            if (callback) callback(response.data.postBroadcastMessage);
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

function getCreateTerminalTicketScript(terminalId) {
    return `mutation m{
            ticket:createTerminalTicket(terminalId:"${terminalId}")
        ${getTicketResult()}}`;
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
    const {totalAmount, remainingAmount, ...ticket2} = ticket;
    return `
        mutation {
            addOrderToTicket(
                ticket: ${JSON.stringify(ticket2)},
                menuItem: ${JSON.stringify(menuItem)},
                quantity: ${quantity}
            ) {
                id
                number
                entities {
                    name
                    type
                }
            }
        }
    `;
}

// Add ticket queries
export const getTicketByTable = async (tableName) => {
    const query = `
        query GetTickets($isClosed: Boolean) {
            getTickets(isClosed: $isClosed) {
                id
                number
                states {
                    stateName
                    state
                }
                entities {
                    type
                    name
                }
            }
        }
    `;

    try {
        const response = await postJSON(query, { isClosed: false });
        return response.data?.getTickets?.find(ticket => 
            ticket.entities?.some(entity => 
                entity.type === 'Mesas' && 
                entity.name === tableName
            )
        );
    } catch (error) {
        debug('❌ Error getting ticket:', error);
        throw error;
    }
};
