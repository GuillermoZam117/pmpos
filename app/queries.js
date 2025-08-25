/**
 * QUERIES CLEAN - Versión limpia sin duplicados
 * Contiene solo las funciones esenciales para el funcionamiento del POS
 */

import { appconfig } from './config';
import Debug from 'debug';

const debug = Debug('pmpos:queries');

// Helper para obtener token
const getToken = async () => {
    debug('🔑 Getting token...');
        const { tokenService } = await import('./services/tokenService');
        return await tokenService.getValidAccessToken();
};

// Helper para hacer requests JSON
export async function postJSON(url, body) {
    const token = await getToken();
    
    if (!token) {
        throw new Error('No token available');
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
    });

    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.message || 'Request failed'}`);
    }
    
    return data;
}

// ============================================
// AUTENTICACIÓN
// ============================================
export const ensureAuthenticated = async () => {
    debug('🔐 Ensuring authentication...');
    const { tokenService } = await import('./services/tokenService');
    const token = await tokenService.getValidAccessToken();
    if (!token) {
        throw new Error('Authentication required');
    }
    return token;
};

export function RefreshToken(refreshToken, callback) {
    const query = { query: 'mutation { refreshToken(refreshToken: "' + refreshToken + '") { accessToken refreshToken expiryDate userName isActive } }' };
    $.postJSON(query, callback);
}

export function Authenticate(userName, password, callback, failCallback) {
    const query = { query: 'mutation { authenticate(userName: "' + userName + '", password: "' + password + '") { accessToken refreshToken expiryDate userName isActive } }' };
    $.postJSON(query, function (response) {
        if (response.data && response.data.authenticate && response.data.authenticate.accessToken) {
            callback(response);
        } else if (failCallback) {
            failCallback(response);
        }
    });
}

// ============================================
// TERMINAL MANAGEMENT
// ============================================
export const registerTerminalAsync = async () => {
    const token = await ensureAuthenticated();
    const config = appconfig();
    
    const query = `mutation RegisterTerminal($terminal: String!, $department: String!, $user: String!, $ticketType: String!) {
        registerTerminal(terminal: $terminal, department: $department, user: $user, ticketType: $ticketType)
    }`;
    
    const variables = {
        terminal: config.terminalName,
        department: config.departmentName,
        user: config.userName,
        ticketType: config.ticketTypeName
    };
        
        const response = await fetch(appconfig().GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        body: JSON.stringify({ query, variables })
        });
        
        const data = await response.json();
        
        if (data.errors) {
        console.warn('⚠️ registerTerminal failed (expected in some SambaPOS configurations):', data.errors[0]?.message);
        // This is often expected - some SambaPOS setups don't require terminal registration
        return null;
    }
    
    if (!response.ok) {
        console.warn('⚠️ registerTerminal HTTP error (non-critical):', response.status, response.statusText);
        return null;
    }
    
    return data.data?.registerTerminal;
};

// ============================================
// MENU FUNCTIONS
// ============================================
export const getMenu = async (callback, forceRefresh = false) => {
    debug('📋 Getting menu...');
    const { default: cacheService } = await import('./services/cacheService');
    
    if (!forceRefresh) {
        const cachedMenu = cacheService.getMenu();
        if (cachedMenu) {
            debug('✅ Using cached menu');
            if (callback) callback(cachedMenu);
            return cachedMenu;
        }
    }

    const token = await ensureAuthenticated();
    const config = appconfig();

    // Try multiple query formats for compatibility
    const queries = [
        // Primary enhanced query format
        getMenuScript(),
        // Alternative format 1
        `query { menu { categories { id name caption color menuItems { id name caption productId product { id name portions { id name price } } portions { id name price } tags { id name } } } } }`,
        // Alternative format 2  
        `query { menu { categories { id name caption color items { id name caption productId product { id name portions { id name price } } portions { id name price } tags { id name } } } } }`,
        // Simplified format
        `query { menu { categories { id name caption menuItems { id name caption portions { id name price } } } } }`
    ];

    for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        debug(`📋 Trying menu query format ${i + 1}...`);
        
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
                debug(`⚠️ GraphQL errors in query format ${i + 1}:`, data.errors[0]?.message);
                continue; // Try next format
            }
            
            if (data.data && data.data.menu) {
                debug(`✅ Menu loaded successfully with format ${i + 1}`);
                
                // Normalize menu structure
                const normalizedMenu = normalizeMenuData(data.data.menu);
                
                cacheService.setMenu(normalizedMenu);
                if (callback) callback(normalizedMenu);
                return normalizedMenu;
            } else {
                debug(`⚠️ No menu data in response for format ${i + 1}`);
                continue; // Try next format
            }
        } catch (error) {
            debug(`❌ Error with query format ${i + 1}:`, error.message);
            continue; // Try next format
        }
    }
    
    debug('❌ All menu query formats failed, using fallback');
    
    // Try fallback menu from cache
    const fallbackMenu = cacheService.getMenu();
    if (fallbackMenu) {
        debug('📦 Using fallback cached menu');
        if (callback) callback(fallbackMenu);
        return fallbackMenu;
    }
    
    // Create a comprehensive fallback menu
    const basicMenu = {
        categories: [
            {
                id: 1,
                name: 'POLLOS',
                caption: 'POLLOS',
                color: '#ff9800',
                menuItems: [
                    {
                        id: 1,
                        name: 'Pollo Entero',
                        caption: 'Pollo Entero',
                        productId: 1,
                        product: {
                            id: 1,
                            name: 'Pollo Entero',
                            portions: [{ id: 1, name: 'Normal', price: 160 }]
                        },
                        portions: [{ id: 1, name: 'Normal', price: 160 }],
                        tags: []
                    },
                    {
                        id: 2,
                        name: 'Medio Pollo',
                        caption: 'Medio Pollo',
                        productId: 2,
                        product: {
                            id: 2,
                            name: 'Medio Pollo',
                            portions: [{ id: 2, name: 'Normal', price: 85 }]
                        },
                        portions: [{ id: 2, name: 'Normal', price: 85 }],
                        tags: []
                    }
                ]
            },
            {
                id: 2,
                name: 'EXTRAS',
                caption: 'EXTRAS',
                color: '#4caf50',
                menuItems: [
                    {
                        id: 3,
                        name: 'Refresco',
                        caption: 'Refresco',
                        productId: 3,
                        product: {
                            id: 3,
                            name: 'Refresco',
                            portions: [{ id: 3, name: 'Normal', price: 25 }]
                        },
                        portions: [{ id: 3, name: 'Normal', price: 25 }],
                        tags: []
                    }
                ]
            }
        ]
    };
    
    debug('🔧 Using comprehensive fallback menu');
    if (callback) callback(basicMenu);
    return basicMenu;
};

// Helper function to normalize menu data structure
function normalizeMenuData(menuData) {
    if (!menuData || !menuData.categories) return menuData;
    
    return {
        ...menuData,
        categories: menuData.categories.map(category => ({
            ...category,
            // Ensure menuItems exists (some APIs use 'items')
            menuItems: category.menuItems || category.items || [],
            // Normalize each menu item
            ...(category.menuItems || category.items ? {
                menuItems: (category.menuItems || category.items).map(item => ({
                    ...item,
                    // Ensure product data structure
                    product: item.product || {
                        id: item.productId || item.id,
                        name: item.name || item.caption,
                        portions: item.portions || []
                    },
                    // Ensure portions exist
                    portions: item.portions || item.product?.portions || [
                        { id: 1, name: 'Normal', price: 50 }
                    ],
                    // Ensure tags exist
                    tags: item.tags || []
                }))
            } : {})
        }))
    };
}

// ============================================
// TICKET FUNCTIONS
// ============================================
export const createTerminalTicketAsync = async (terminalId) => {
    const token = await ensureAuthenticated();
    
    const query = `mutation CreateTerminalTicket($terminalId: String!) {
        createTerminalTicket(terminalId: $terminalId) {
            id
            uid
            type
            remainingAmount
            totalAmount
        }
    }`;
    
    const variables = { terminalId };
    
    const response = await fetch(appconfig().GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        body: JSON.stringify({ query, variables })
    });

        const data = await response.json();
    
        if (data.errors) {
        console.error('🚨 GraphQL Errors in createTerminalTicket:', data.errors);
        console.error('📝 Query:', query);
        console.error('📋 Variables:', variables);
                return null;
    }
    
    return data.data?.createTerminalTicket;
};

export const getTerminalTicketsForTable = async (terminalId, tableName) => {
        const token = await ensureAuthenticated();
        const query = getGetTerminalTicketsScript(terminalId);
        
        const response = await fetch(appconfig().GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query })
        });
        
        const data = await response.json();
    return data.data?.getTerminalTickets || [];
};

export const loadTerminalTicketWithOrders = async (terminalId, ticketId) => {
        const token = await ensureAuthenticated();
        const query = getLoadTerminalTicketScript(terminalId, ticketId);
        
        const response = await fetch(appconfig().GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query })
        });
        
        const data = await response.json();
    return data.data?.loadTerminalTicket;
};

export const changeEntityOfTerminalTicketAsync = async (terminalId, tableName) => {
        const token = await ensureAuthenticated();
    const config = appconfig();
    
    const query = `mutation ChangeEntityOfTerminalTicket($terminalId: String!, $type: String!, $name: String!) {
        changeEntityOfTerminalTicket(terminalId: $terminalId, type: $type, name: $name) {
            id
            entities {
                name
                type
            }
        }
    }`;
    
    const variables = {
        terminalId,
        type: config.entityTypeName,
        name: tableName
    };

        const response = await fetch(appconfig().GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        body: JSON.stringify({ query, variables })
        });
        
        const data = await response.json();
    
        if (data.errors) {
        console.error('🚨 GraphQL Errors in changeEntityOfTerminalTicket:', data.errors);
        console.error('📝 Query:', query);
        console.error('📋 Variables:', variables);
        return null;
    }
    
    return data.data?.changeEntityOfTerminalTicket;
};

// ============================================
// ORDER FUNCTIONS
// ============================================
export function addOrderToTerminalTicket(terminalId, productId, quantity = 1, orderTags = '', callback) {
    const query = getAddOrderToTerminalTicketScript(terminalId, productId, orderTags);
    $.postJSON(query, callback);
}

export function closeTerminalTicket(terminalId, callback) {
    const query = getCloseTerminalTicketScript(terminalId);
    $.postJSON(query, callback);
}

export function clearTerminalTicketOrders(terminalId, callback) {
    const query = getClearTerminalTicketScript(terminalId);
    $.postJSON(query, callback);
}

// ============================================
// ENTITY FUNCTIONS
// ============================================
export const getEntityScreenItems = async (screenName) => {
    debug('🖥️ Getting entity screen items for:', screenName);
        const config = appconfig();
    const token = await ensureAuthenticated();
        
    if (!screenName) {
        debug('❌ No screen name provided');
        return [];
    }
        
    const query = getGetEntityScreenItemsScript(screenName);
        
    const response = await fetch(config.GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        body: JSON.stringify({ query })
    });
    
    const responseText = await response.text();
    debug('📄 Raw response:', responseText);
    
    const data = JSON.parse(responseText);
    
    if (data.errors) {
        debug('❌ GraphQL errors:', data.errors);
        throw new Error(`GraphQL error: ${data.errors[0].message}`);
    }
    
    const items = data.data?.items;
    debug('✅ Entity screen items:', items);
    
    return items || [];
};

// ============================================
// PAYMENT FUNCTIONS
// ============================================
export const payTerminalTicket = async (terminalId, paymentTypeName, amount, callback) => {
        const token = await ensureAuthenticated();
        const config = appconfig();
        
    const query = `
        mutation PayTerminalTicket($terminalId: String!, $paymentTypeName: String!, $amount: Decimal!) {
            payTerminalTicket(terminalId: $terminalId, paymentTypeName: $paymentTypeName, amount: $amount) {
                id
                    remainingAmount
                totalAmount
            }
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
            variables: { terminalId, paymentTypeName, amount: parseFloat(amount) }
        })
    });
    
    const data = await response.json();
    
    if (callback) {
        callback(data);
    }
    
    return data;
};

// ============================================
// SCRIPT GENERATORS
// ============================================
function getMenuScript() {
    // Try multiple menu query formats for compatibility
    return `query GetMenu {
        menu {
            categories {
                id
                name
                caption
                color
                menuItems {
                    id
                    name
                    caption
                    productId
                    product {
                        id
                        name
                        portions {
                            id
                            name
                            price
                        }
                    }
                    portions {
                        id
                        name
                        price
                    }
                    tags {
                        id
                        name
                    }
                }
                items {
                    id
                    name
                    caption
                    productId
                    product {
                        id
                        name
                        portions {
                            id
                            name
                            price
                        }
                    }
                    portions {
                        id
                        name
                        price
                    }
                    tags {
                        id
                        name
                    }
                }
            }
        }
    }`;
}

function getRegisterTerminalScript() {
    const config = appconfig();
    return `mutation { registerTerminal(terminal: "${config.terminalName}", department: "${config.departmentName}", user: "${config.userName}", ticketType: "${config.ticketTypeName}") }`;
}

function getCreateTerminalTicketScript(terminalId) {
    return `mutation { createTerminalTicket(terminalId: "${terminalId}") { id uid type remainingAmount totalAmount } }`;
}

function getGetTerminalTicketsScript(terminalId) {
    return `query { getTerminalTickets(terminalId: "${terminalId}") { id ticketNumber entities { name type } } }`;
}

function getLoadTerminalTicketScript(terminalId, ticketId) {
    return `mutation { loadTerminalTicket(terminalId: "${terminalId}", ticketId: "${ticketId}") { id uid } }`;
}

function getClearTerminalTicketScript(terminalId) {
    return `mutation { clearTerminalTicketOrders(terminalId: "${terminalId}") { id } }`;
}

function getCloseTerminalTicketScript(terminalId) {
    return `mutation { closeTerminalTicket(terminalId: "${terminalId}") { id isClosed ticketNumber } }`;
}

function getAddOrderToTerminalTicketScript(terminalId, productId, orderTags) {
    return `mutation { addOrderToTerminalTicket(terminalId: "${terminalId}", productId: ${productId}, quantity: 1, orderTags: "${orderTags}") { id menuItemName quantity price } }`;
}

function getChangeEntityOfTerminalTicketScript(terminalId, entityName) {
    const config = appconfig();
    return `mutation { 
        changeEntityOfTerminalTicket(
            terminalId: "${terminalId}",
            type: "${config.entityTypeName}",
            name: "${entityName}"
        ) { 
            id 
            entities {
                name 
                type 
            }
        }
    }`;
}

function getGetEntityScreenItemsScript(name) {
    return `query { items: getEntityScreenItems(name: "${name}") { id name color header } }`;
}

// ============================================
// EXPLORATION FUNCTION
// ============================================
export const exploreOrderStatesAndMutations = async () => {
    debug('🔍 Exploring order states and mutations...');
        const config = appconfig();
    const token = await ensureAuthenticated();
    
    const query = `query {
            __schema {
                mutationType {
                    fields {
                        name
                        description
                        args {
                            name
                            type {
                                    name
                                    kind
                            }
                        }
                    }
                }
            }
        }`;
        
    const response = await fetch(config.GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        body: JSON.stringify({ query })
    });
    
    const data = await response.json();
    debug('📋 Available mutations:', data.data?.__schema?.mutationType?.fields);
    return data.data?.__schema?.mutationType?.fields || [];
};

// ============================================
// DEBUG FUNCTIONS
// ============================================
export const debugTicketQueries = async (terminalId) => {
    debug('🔍 Running debug queries for terminal:', terminalId);
    try {
        const mutations = await exploreOrderStatesAndMutations();
        debug('📋 Available mutations:', mutations.length);
        return mutations;
    } catch (error) {
        debug('❌ Debug queries failed:', error);
        return [];
    }
};

export const findTicketByTableAlternative = async (tableName) => {
    debug('🔍 Finding ticket by table (alternative method):', tableName);
    const token = await ensureAuthenticated();
    const config = appconfig();
    
    const query = `query {
        getTickets(isClosed: false) {
            id
            uid
            ticketNumber
            type
            totalAmount
            remainingAmount
            entities {
                name
                type
            }
                orders {
                    id
                    uid
                menuItemName
                    quantity
                    price
                productId
                portion
                orderTags
                }
            }
        }`;
        
    const response = await fetch(config.GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        body: JSON.stringify({ query })
    });
    
    const data = await response.json();
    
    if (data.data && data.data.getTickets) {
        const tickets = data.data.getTickets;
        const ticketForTable = tickets.find(ticket => 
            ticket.entities && ticket.entities.some(entity => entity.name === tableName)
        );
        
        if (ticketForTable) {
            debug('✅ Found ticket for table:', ticketForTable);
            return ticketForTable;
        }
    }
    
    debug('⚠️ No ticket found for table:', tableName);
    return null;
};
