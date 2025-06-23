import $ from 'jquery';
import jQuery from 'jquery';
import { appconfig, DEV_CONFIG } from './config';
import { store } from './store';
import * as Actions from './actions';
import createClient, { queries } from './utils/graphqlClient';
import { login } from './actions/auth';
import { tokenService } from './services/tokenService';
import Debug from 'debug';
import { gql } from '@apollo/client';

const debug = Debug('pmpos:queries');

const getToken = async () => {
    try {
        // Import tokenService here to avoid circular dependencies
        const { tokenService } = await import('./services/tokenService');
        return await tokenService.getValidAccessToken();
    } catch (error) {
        console.error('Token fetch failed:', error);
        throw error;
    }
};

var config = appconfig();

export async function postJSON(url, body) {
    const token = await getToken();
    if (!token) {
        throw new Error('No authentication token available');
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.errors) {
        throw new Error(data.errors[0]?.message || 'GraphQL Error');
    }
    
    return data;
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
        // Import tokenService here to avoid circular dependencies
        const { tokenService } = await import('./services/tokenService');
        return await tokenService.getValidAccessToken();
    } catch (error) {
        console.error('Authentication failed:', error);
        throw error;
    }
};

// Función para cargar el menú con cache
export const getMenu = async (callback, forceRefresh = false) => {
    try {
        // Import cache service dynamically to avoid circular imports
        const { default: cacheService } = await import('./services/cacheService');
        
        // Check cache first (unless forced refresh)
        if (!forceRefresh) {
            const cachedMenu = cacheService.getMenu();
            if (cachedMenu) {
                console.log('📦 Using cached menu');
                if (callback) callback(cachedMenu);
                return;
            }
        }

        console.log('🔄 Fetching menu from server...');
        const token = await ensureAuthenticated();
        
        // Use the proper SambaPOS GraphQL query
        const query = getMenuScript();
        console.log('📋 Using query:', query);
        
        const response = await fetch(appconfig().GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query })
        });
        
        const data = await response.json();
        console.log('📊 Menu response from server:', data);
        
        if (data.errors) {
            console.error('❌ GraphQL errors:', data.errors);
            
            // Try to use cached data as fallback
            const cachedMenu = cacheService.getMenu();
            if (cachedMenu) {
                console.log('📦 Using cached menu as fallback');
                if (callback) callback(cachedMenu);
            }
            return;
        }
        
        console.log('✅ Menu loaded from server');
        
        // Extract the menu data (should be data.data.menu)
        const menuData = data.data.menu;
        console.log('📊 Extracted menu data:', menuData);
        
        // Cache the menu
        cacheService.setMenu(menuData);
        
        if (callback) callback(menuData);
    } catch (error) {
        console.error('❌ Menu fetch error:', error);
        
        // Try to use cached data as fallback
        try {
            const { default: cacheService } = await import('./services/cacheService');
            const cachedMenu = cacheService.getMenu();
            if (cachedMenu) {
                console.log('📦 Using cached menu as fallback after error');
                if (callback) callback(cachedMenu);
            }
        } catch (cacheError) {
            console.warn('Could not access cache service:', cacheError);
        }
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

export function changeEntityOfTerminalTicket(terminalId, entityName, callback) {
    var query = getChangeEntityOfTerminalTicketScript(terminalId, entityName);
    $.postJSON(query, function (response) {
        if (response.errors) {
            // handle errors
        } else {
            if (callback) callback(response.data.changeEntityOfTerminalTicket);
        }
    });
}

export const getEntityScreenItems = async (screenName) => {
    try {
        const config = appconfig();
        const token = await ensureAuthenticated();

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
    return `{menu:getMenu(name:"${config.menuName}"){categories{id,name,color,foreground,menuItems{id,name,color,caption,foreground,productId,defaultOrderTags,product{name,barcode,groupCode,portions{id,name,price}}}}}}`;
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
    return `mutation {
        ticket:createTerminalTicket(
            terminalId:"${terminalId}"
        ) {
            uid
            type
            number
            date
            entities {
                name
                type
            }
            totalAmount
            remainingAmount
        }
    }`;
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

// Update the mutation function with correct parameters
function getChangeEntityOfTerminalTicketScript(terminalId, entityName) {
    return `mutation {
        changeEntityOfTerminalTicket(
            terminalId: "${terminalId}",
            entityType: "${config.entityTypeName}",
            entityName: "${entityName}"
        ) {
            id
            uid
            type
            number
            date
            totalAmount
            remainingAmount
            entities {
                name
                type
            }
        }
    }`;
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
    const config = appconfig();
    const query = `
        query GetTickets($isClosed: Boolean) {
            getTickets(isClosed: $isClosed) {
                id
                uid
                number
                date
                totalAmount
                remainingAmount
                states {
                    stateName
                    state
                }
                entities {
                    type
                    name
                }
                orders {
                    uid
                    productId
                    quantity
                    price
                    orderTags
                }
            }
        }
    `;

    try {
        const token = await ensureAuthenticated();
        const response = await fetch(config.GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                query,
                variables: { isClosed: false }
            })
        });

        const data = await response.json();
        if (data.errors) {
            debug('❌ GraphQL errors in getTicketByTable:', data.errors);
            return null;
        }

        const ticket = data.data?.getTickets?.find(ticket => 
            ticket.entities?.some(entity => 
                entity.type === config.entityTypeName && 
                entity.name === tableName
            )
        );

        if (ticket) {
            debug('✅ Found existing ticket for table:', { tableName, ticket });
            return ticket;
        } else {
            debug('🔍 No existing ticket found for table:', tableName);
            return null;
        }
    } catch (error) {
        debug('❌ Error getting ticket:', error);
        throw error;
    }
};

// Function to load existing ticket with complete data including orders
export const loadExistingTicket = async (ticketId, terminalId) => {
    const config = appconfig();
    const token = await ensureAuthenticated();
    
    const query = `
        mutation LoadTicket($terminalId: String!, $ticketId: String!) {
            ticket: loadTerminalTicket(terminalId: $terminalId, ticketId: $ticketId) {
                id
                uid
                number
                date
                totalAmount
                remainingAmount
                entities {
                    name
                    type
                }
                orders {
                    uid
                    productId
                    quantity
                    price
                    orderTags
                }
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
            body: JSON.stringify({ 
                query,
                variables: { terminalId, ticketId }
            })
        });

        const data = await response.json();
        if (data.errors) {
            debug('❌ GraphQL errors in loadExistingTicket:', data.errors);
            throw new Error(data.errors[0].message);
        }

        const ticket = data.data?.ticket;
        if (ticket) {
            debug('✅ Loaded existing ticket with orders:', ticket);
            return ticket;
        } else {
            throw new Error('Ticket not found');
        }
    } catch (error) {
        debug('❌ Error loading existing ticket:', error);
        throw error;
    }
};

// Remove duplicate registerTerminal function and consolidate mutations
const TICKET_MUTATIONS = {
    registerTerminal: gql`
        mutation RegisterTerminal($terminalId: String!) {
            registerTerminal(
                terminal: $terminalId,
                ticketType: "TICKET",
                department: "RESTAURANT",
                user: "ADMIN"
            )
        }
    `,

    createTicket: gql`
        mutation CreateTicket($input: CreateTicketInput!) {
            createTicket(input: $input) {
                id
                uid
                type
                number
                date
                totalAmount
                remainingAmount
                entities {
                    name
                    type
                }
            }
        }
    `
};

// Add success handler function for navigation
export async function handleTicketCreated(ticket, tableId, navigate) {
    debug('✅ Ticket created successfully:', ticket);
    return navigate('/pos', { 
        state: { 
            ticket,
            tableId,
            isNew: true
        }
    });
}

// Remove duplicate declarations and keep only this one
function getAssignTableMutation(terminalId, tableName) {
    const config = appconfig();
    return `mutation {
        ticket:changeEntityOfTerminalTicket(
            terminalId:"${terminalId}",
            entityType:"${config.entityTypeName}",
            entityName:"${tableName}"
        )
        ${getTicketResult()}
    }`;
}

// Update createEmptyTicket function - Remove invalid changeEntityOfTerminalTicket call
export async function createEmptyTicket(tableId) {
    debug('Creating empty ticket for table:', tableId);
    
    try {
        // Fix: Use await to get token properly
        const token = await ensureAuthenticated();
        if (!token) {
            throw new Error('Not authenticated');
        }

        // Get configuration
        const config = appconfig();

        // 1. Register terminal (based on official documentation)
        const registerMutation = `
            mutation {
                registerTerminal(
                    terminal: "${config.terminalName}",
                    ticketType: "${config.ticketTypeName}", 
                    department: "${config.departmentName}",
                    user: "${config.userName}"
                )
            }
        `;

        const registerResult = await postJSON(config.GQLurl, {
            query: registerMutation
        });

        if (!registerResult?.data?.registerTerminal) {
            throw new Error('Failed to register terminal');
        }

        const terminalId = registerResult.data.registerTerminal;
        debug(`✅ Terminal registered: ${terminalId}`);

        // 2. Create ticket (following official documentation pattern)
        const ticketMutation = `
            mutation {
                createTerminalTicket(
                    terminalId: "${terminalId}"
                ) {
                    uid
                    type
                    number
                    date
                    totalAmount
                    remainingAmount
                    entities {
                        name
                        type
                    }
                }
            }
        `;

        const ticketResult = await postJSON(config.GQLurl, {
            query: ticketMutation
        });

        if (!ticketResult?.data?.createTerminalTicket) {
            throw new Error('Failed to create ticket');
        }

        const ticket = ticketResult.data.createTerminalTicket;
        debug('✅ Ticket created:', ticket);

        // For now, return the ticket with table info added manually
        // Table assignment might need to be handled differently through SambaPOS automation rules
        const finalTicket = {
            ...ticket,
            terminalId: terminalId,
            tableId: tableId,
            entities: [{
                name: tableId,
                type: config.entityTypeName
            }]
        };
        
        debug('✅ Ticket prepared for table:', tableId);
        return finalTicket;

    } catch (error) {
        debug('❌ Error creating ticket:', error);
        throw error;
    }
}