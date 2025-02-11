import $ from 'jquery';
import jQuery from 'jquery';
import { appconfig } from './config';
import { store } from './store';
import * as Actions from './actions';
import createClient, { queries } from './utils/graphqlClient';
import { login } from './actions/auth';

var config = appconfig();

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

export function Authenticate(userName, password, callback, failCallback) {
    jQuery.ajax({
        'type': 'POST',
        'url': config.authUrl,
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
    // Verifica si ya hay un token en el state
    const state = store.getState();
    const currentToken = state.login?.get('accessToken');
    if (currentToken) {
        return currentToken;
    }
    // Si no hay token, usa el método "authenticate" (que usa /Token y x-www-form-urlencoded)
    const token = await authenticate();
    return token;
};

// Función para cargar el menú (ya existente, se validan datos)
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

export const getEntityScreenItems = async (screenName, callback) => {
    // Se asegura de obtener un token válido
    const token = await ensureAuthenticated();
    // Se construye la consulta GraphQL
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
        const response = await fetch(appconfig().GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query })
        });
        const data = await response.json();
        if (data.errors) {
            console.error('❌ GraphQL errors:', data.errors);
            return;
        }
        if (callback) callback(data.data.getEntityScreenItems);
    } catch (error) {
        console.error('❌ getEntityScreenItems fetch error:', error);
    }
};

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

// Función para autenticación de usuarios
export async function authenticateUser(username, password, callback) {
  // Se construye el body en formato URL encoded con los parámetros requeridos
  const params = new URLSearchParams();
  params.append('grant_type', 'password');
  params.append('username', username);      // usuario proporcionado
  params.append('password', password);       // contraseña proporcionada
  params.append('client_id', 'graphiql');      // valor fijo según lo indicado

  try {
    const response = await fetch(appconfig().authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
    
    const result = await response.json();
    
    if (result.error || result.errors) {
      console.error('❌ Authentication errors:', result.error || result.errors);
      return;
    }
    
    if (!result.token && !result.data) {
      console.error('❌ Respuesta inválida en autenticación:', result);
      return;
    }
    
    // Dependiendo de la respuesta del backend, obtenemos el token:
    const authData = result.token ? result : result.data.authenticate;
    
    if (callback) callback(authData);
  } catch (error) {
    console.error('❌ Authentication fetch error:', error);
  }
};

// Función para cargar las mesas
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

// Función para crear un ticket
export const createTicket = async (ticketData, callback) => {
    const query = `
      mutation {
          createTicket(ticketData: ${JSON.stringify(ticketData)}) {
              id
              status
              createdAt
          }
      }
    `;
    try {
        const response = await fetch(appconfig().GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query })
        });
        const data = await response.json();
        if (data.errors) {
            console.error('❌ Create Ticket errors:', data.errors);
            return;
        }
        if (callback) callback(data.data.createTicket);
    } catch (error) {
        console.error('❌ Create Ticket fetch error:', error);
    }
};

export const authenticate = async () => {
    try {
        const response = await fetch(config.authUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'password',
                username: 'graphiql',
                password: 'graphiql',
                client_id: 'graphiql'
            })
        });
        
        const result = await response.json();
        if (!response.ok) {
            throw new Error(`Authentication failed: ${result.error_description || 'Unknown error'}`);
        }
        
        // Guardar token en localStorage y store
        localStorage.setItem('access_token', result.access_token);
        store.dispatch({
            type: 'AUTHENTICATION_SUCCESS',
            payload: {
                accessToken: result.access_token,
                refreshToken: result.refresh_token
            }
        });
        
        return result.access_token;
    } catch (error) {
        console.error('Authentication error:', error);
        throw error;
    }
};

export const validateUserPin = async (pin) => {
    const query = `
        query ValidatePin($pin: String!) {
            validateUserPin(pin: $pin) {
                isValid
                user {
                    id
                    name
                    permissions
                }
            }
        }
    `;

    // Implementar la llamada a GraphQL usando el token
    // ...
};

export const getToken = async (username, password) => {
    try {
        const response = await fetch(config.authUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `grant_type=password&username=${username}&password=${password}`
        });

        if (!response.ok) {
            throw new Error('Auth failed');
        }

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('Error getting token:', error);
        throw error;
    }
};

export const validatePin = async (pin, callback) => {
    try {
        const response = await fetch(config.GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: `
                    query {
                        getUser(pin: "${pin}") {
                            pin
                            name
                        }
                    }
                `
            })
        });

        const result = await response.json();
        console.log('GraphQL Response:', result);

        if (result.errors) {
            console.error('GraphQL errors:', result.errors);
            return callback(null);
        }

        callback(result.data?.getUser);
    } catch (error) {
        console.error('PIN validation error:', error);
        callback(null);
    }
};

// 1. Obtener y guardar token inicial
export const authenticate = async () => {
    try {
        const response = await fetch(config.authUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'password',
                username: 'graphiql',
                password: 'graphiql',
                client_id: 'graphiql'
            })
        });
        
        const result = await response.json();
        if (!response.ok) {
            throw new Error(`Authentication failed: ${result.error_description || 'Unknown error'}`);
        }
        
        // Guardar token en localStorage y store
        localStorage.setItem('access_token', result.access_token);
        store.dispatch({
            type: 'AUTHENTICATION_SUCCESS',
            payload: {
                accessToken: result.access_token,
                refreshToken: result.refresh_token
            }
        });
        
        return result.access_token;
    } catch (error) {
        console.error('Authentication error:', error);
        throw error;
    }
};

// 2. Validar PIN
export const validatePin = async (pin, callback) => {
    try {
        const response = await fetch(config.GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: `
                    query {
                        getUser(pin: "${pin}") {
                            pin
                            name
                        }
                    }
                `
            })
        });

        const result = await response.json();
        console.log('PIN validation response:', result);

        if (result.errors) {
            console.error('PIN validation errors:', result.errors);
            return callback(null);
        }

        callback(result.data?.getUser);
    } catch (error) {
        console.error('PIN validation error:', error);
        callback(null);
    }
};

// 3. Cargar mesas
export const getTables = async (callback, token) => {
    if (!token) {
        console.error('No token provided for getTables');
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
        });

        const result = await response.json();
        console.log('Tables response:', result);
        
        if (result.errors) {
            console.error('Tables query errors:', result.errors);
            return callback(null);
        }

        callback(result.data?.tables);
    } catch (error) {
        console.error('Tables fetch error:', error);
        callback(null);
    }
};

// 4. Crear ticket para una mesa
export const createTerminalTicket = async (terminalId, callback) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
        const response = await fetch(config.GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                query: `
                    mutation {
                        ticket: createTerminalTicket(terminalId: "${terminalId}") {
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
                            states {
                                stateName
                                state
                            }
                            orders {
                                id
                                uid
                                name
                                quantity
                                price
                            }
                        }
                    }
                `
            })
        });

        const result = await response.json();
        if (result.errors) {
            console.error('Create ticket errors:', result.errors);
            return callback(null);
        }

        callback(result.data?.ticket);
    } catch (error) {
        console.error('Create ticket error:', error);
        callback(null);
    }
};

// ... Las demás funciones existentes se mantienen igual ...
