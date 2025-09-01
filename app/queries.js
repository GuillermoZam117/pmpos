/**
 * QUERIES CLEAN - Versión limpia sin duplicados
 * Contiene solo las funciones esenciales para el funcionamiento del POS
 */

import { appconfig } from './config';
import Debug from 'debug';
import requestLogger, { loggedFetch, loggedGraphQL } from './utils/requestLogger';

const debug = Debug('pmpos:queries');

// Optional header injection for internal read-service (dev-only / internal nets)
const SEND_INTERNAL_KEY = process.env.REACT_APP_SEND_INTERNAL_KEY === 'true';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
const withInternalHeaders = (base = {}) => {
    if (SEND_INTERNAL_KEY && INTERNAL_API_KEY) {
        return { ...base, 'X-INTERNAL-API-KEY': INTERNAL_API_KEY };
    }
    return base;
};

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

    // Use logged fetch for structured logging
    const response = await loggedFetch(url, {
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

// -----------------------------
// Read-service wrappers (SQL read-service with GraphQL fallback)
// -----------------------------
export async function fetchActiveTickets() {
    const allowGqlFallback = process.env.REACT_APP_ALLOW_GQL_READ_FALLBACK === 'true';
    try {
        const resp = await loggedFetch('/internal-api/active-tickets', {
            method: 'GET',
            headers: withInternalHeaders({ 'Content-Type': 'application/json' })
        });
        if (resp.ok) return await resp.json();
        throw new Error(`HTTP ${resp.status}`);
    } catch (err) {
        if (!allowGqlFallback) {
            debug('❌ active-tickets SQL failed and GraphQL fallback disabled:', err.message);
            throw err; // Important: don't overwrite with []
        }
        const config = appconfig();
        const query = `query { getTickets(isClosed: false) { id uid number totalAmount remainingAmount entities { type name } orders { id name quantity price } states { stateName state } user { name } } }`;
        const result = await loggedGraphQL(config.GQLurl, { 
            query,
            headers: { 'Authorization': `Bearer ${await getToken()}` }
        });
        return result.data?.getTickets || [];
    }
}

export async function fetchTicketDetails(ticketId) {
    const allowGqlFallback = process.env.REACT_APP_ALLOW_GQL_READ_FALLBACK === 'true';
    try {
        const resp = await loggedFetch(`/internal-api/tickets/${encodeURIComponent(ticketId)}/details`, {
            method: 'GET',
            headers: withInternalHeaders({ 'Content-Type': 'application/json' })
        });
        if (resp.ok) return await resp.json();
        throw new Error(`HTTP ${resp.status}`);
    } catch (err) {
        if (!allowGqlFallback) {
            debug('❌ ticket details SQL failed and GraphQL fallback disabled:', err.message);
            return null;
        }
        const config = appconfig();
        const query = `query GetTicket($ticketId: String!) { ticket(id: $ticketId) { id uid number date totalAmount remainingAmount entities { name type } orders { id uid productId name caption quantity price portion orderTags priceTag calculatePrice locked tags { tag tagName price quantity } states { stateName state stateValue } } states { stateName state } tags { tagName tag } } }`;
        const result = await postJSON(config.GQLurl, { query, variables: { ticketId } });
        return result.data?.ticket || null;
    }
}

export async function fetchAutomationCommands(commandName = null) {
    try {
        const url = commandName ? `/internal-api/automation-commands?name=${encodeURIComponent(commandName)}` : '/internal-api/automation-commands';
        const resp = await loggedFetch(url, {
            method: 'GET',
            headers: withInternalHeaders({ 'Content-Type': 'application/json' })
        });
        if (resp.ok) return await resp.json();
        throw new Error(`HTTP ${resp.status}`);
    } catch (err) {
        debug('❌ automation-commands failed:', err.message);
        return [];
    }
}

export async function fetchAutomationReasons(commandName = 'Anular') {
    try {
        const resp = await loggedFetch(`/internal-api/automation-reasons?command=${encodeURIComponent(commandName)}`, {
            method: 'GET',
            headers: withInternalHeaders({ 'Content-Type': 'application/json' })
        });
        if (resp.ok) return await resp.json();
        throw new Error(`HTTP ${resp.status}`);
    } catch (err) {
        debug('❌ automation-reasons failed:', err.message);
        // Return fallback reasons if API fails
        return [
            { id: 1, reason: 'CAMBIO DE PRODUCTO', actionType: 'void' },
            { id: 2, reason: 'ERROR DEL MESERO', actionType: 'void' },
            { id: 3, reason: 'CAMBIO DE OPINION CLIENTE', actionType: 'void' },
            { id: 4, reason: 'NO LO QUISO', actionType: 'void' },
            { id: 5, reason: 'ERROR COCINA', actionType: 'void' },
            { id: 6, reason: 'EL CLIENTE SE FUE', actionType: 'void' }
        ];
    }
}

export async function fetchTables() {
    const allowGqlFallback = process.env.REACT_APP_ALLOW_GQL_READ_FALLBACK === 'true';
    try {
        const screen = encodeURIComponent(process.env.SAMBAPOS_ENTITY_SCREEN || '');
        const url = screen ? `/internal-api/tables?screen=${screen}` : '/internal-api/tables';
        const resp = await loggedFetch(url, {
            method: 'GET',
            headers: withInternalHeaders({ 'Content-Type': 'application/json' })
        });
        if (resp.ok) {
            const rows = await resp.json();
            // Map read-service shape -> UI shape expected by TableView/TableCard
            const mapped = (Array.isArray(rows) ? rows : []).map(r => ({
                id: r.EntityId ?? r.Id ?? r.entityId ?? r.id ?? null,
                name: String(r.EntityName ?? r.Name ?? r.entityName ?? r.name ?? ''),
                caption: String(r.Caption ?? r.EntityCaption ?? r.Name ?? r.name ?? ''),
                color: r.Color ?? null,
                labelColor: r.LabelColor ?? '#000000',
                status: r.Status ?? r.status ?? null,
                customData: r.CustomData ?? r.customData ?? null
            }));
            return mapped;
        }
        throw new Error(`HTTP ${resp.status}`);
    } catch (err) {
        if (!allowGqlFallback) {
            debug('❌ tables SQL failed and GraphQL fallback disabled:', err.message);
            return [];
        }
        const config = appconfig();
        const query = `query { getEntityScreenItems(name: \"MESAS\") { id name caption color labelColor state customData } }`;
        const result = await postJSON(config.GQLurl, { query });
        return result.data?.getEntityScreenItems || [];
    }
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
// DIAGNOSTIC QUERIES - Get real values from SambaPOS
// ============================================
export const getRealNames = async () => {
    debug('🔍 Querying real names from SambaPOS...');
    const token = await ensureAuthenticated();
    const config = appconfig();

    const query = `query {
        getTerminals { name }
        getDepartments { name }
        getTicketTypes { name } 
        getUsers { name }
    }`;

    try {
        const responseData = await loggedGraphQL(config.GQLurl, { 
            query,
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return responseData;

        const data = await response.json();
        console.log('Real SambaPOS names:', data);

        if (data.errors) {
            console.error('GraphQL errors:', data.errors);
            return null;
        }

        return data.data;
    } catch (error) {
        console.error('Failed to get real names:', error);
        return null;
    }
};

// ============================================
// TERMINAL MANAGEMENT
// ============================================
export const registerTerminalAsync = async (userOverride = null) => {
    debug('🖥️ Starting complete terminal registration...');
    const token = await ensureAuthenticated();
    const config = appconfig();

    // Payload fijo desde .env; user = autenticado
    const variables = {
        ticketType: process.env.SAMBAPOS_TICKET_TYPE || config.ticketTypeName || 'COMEDOR',
        terminal: process.env.SAMBAPOS_TERMINAL || config.terminalName || 'SERVIDOR',
        department: process.env.SAMBAPOS_DEPARTMENT || config.departmentName || 'MESAS',
        user: userOverride || process.env.SAMBAPOS_USERNAME || config.userName || 'graphiql'
    };

    debug('📋 Complete terminal registration:', {
        ...variables,
        endpoint: config.GQLurl
    });

    // SambaPOS GraphQL is more reliable with inline args (no variables)
    const safe = (s) => String(s).replace(/"/g, '\\"');
    const inlineMutation = `mutation { registerTerminal(ticketType: "${safe(variables.ticketType)}", terminal: "${safe(variables.terminal)}", department: "${safe(variables.department)}", user: "${safe(variables.user)}") }`;

    debug('📝 Sending terminal registration mutation (inline):', inlineMutation);

    // retry/backoff helper
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const maxAttempts = 3; // Reintentos SOLO ante 5xx
    let attempt = 0;
    let data = null;

    while (attempt < maxAttempts) {
        attempt += 1;
        debug(`🔁 Register terminal attempt ${attempt}/${maxAttempts}`);
        try {
            const response = await fetch(config.GQLurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ query: inlineMutation })
            });

            debug(`📡 Terminal registration response: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Terminal registration HTTP error:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText,
                    variables: variables,
                    attempt
                });

                // Solo reintentar en 5xx
                if (response.status >= 500 && response.status <= 599 && attempt < maxAttempts) {
                    const backoff = 500 * Math.pow(2, attempt - 1); // 500ms, 1000ms, ...
                    debug(`⏳ Waiting ${backoff}ms before retrying registerTerminal`);
                    await sleep(backoff);
                    continue;
                }

                throw new Error(`Terminal registration failed: HTTP ${response.status} - ${errorText}`);
            }

            data = await response.json();
            break; // success
        } catch (err) {
            // No reintentos para errores no HTTP (p. ej. red) según política 5xx-only
            console.error('❌ Exception during registerTerminal (no retry)', { err: err.message, attempt });
            throw err;
        }
    }
    debug('📦 Terminal registration response data:', data);

    if (data && data.errors) {
        const errorMsg = data.errors.map(e => e.message).join(', ');
        console.error('🚨 GraphQL errors during terminal registration:', errorMsg);
        console.error('Test in GraphiQL:', inlineMutation);

        throw new Error(`Terminal registration failed: ${errorMsg}. Check user "${variables.user}" exists in SambaPOS`);
    }

    const terminalId = data.data?.registerTerminal;

    if (!terminalId) {
        console.error('🚨 CRITICAL: Terminal registration returned no ID');
        console.error('Response data:', data);
        throw new Error('Terminal registration failed: No terminal ID returned. Check SambaPOS Message Server configuration.');
    }

    debug('✅ Terminal registered successfully:', terminalId);

    // Store terminalId for terminal ticket operations
    if (typeof window !== 'undefined') {
        window.currentTerminalId = terminalId;
        localStorage.setItem('currentTerminalId', terminalId);
    }

    return terminalId;
};

// Get stored terminal ID - Now delegates to terminalService
export const getCurrentTerminalId = () => {
    // Import terminalService dynamically to avoid circular imports
    const { terminalService } = require('./services/terminalService');
    return terminalService.getTerminalId();
};

// Terminal ticket operations following the documented flow
export const createTerminalTicket = async () => {
    debug('🎫 Creating terminal ticket...');
    const terminalId = getCurrentTerminalId();

    if (!terminalId) {
        throw new Error('No terminal ID found. Register terminal first.');
    }


    const token = await ensureAuthenticated();
    const config = appconfig();

    const query = `mutation CreateTerminalTicket($terminalId: String!) {
        createTerminalTicket(terminalId: $terminalId) {
            uid
            totalAmount
        }
    }`;

    try {
        const response = await fetch(config.GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                query,
                variables: { terminalId }
            })
        });

        const data = await response.json();

        if (data.errors) {
            console.error('🚨 GraphQL errors creating terminal ticket:', data.errors);
            throw new Error(`Terminal ticket creation failed: ${data.errors.map(e => e.message).join(', ')}`);
        }

        const ticket = data.data?.createTerminalTicket;
        debug('✅ Terminal ticket created:', ticket);
        return ticket;

    } catch (error) {
        debug('❌ Failed to create terminal ticket:', error);
        throw error;
    }
};

// Enhanced version that supports complex order objects
export const addOrderToTerminalTicketAsync = async (terminalId, orderPayload) => {
    debug('➕ Adding enhanced order to terminal ticket (inline, no variables):', { terminalId, orderPayload });

    if (!terminalId) {
        throw new Error('Terminal ID is required');
    }

    const token = await ensureAuthenticated();
    const config = appconfig();

    // Build inline mutation with only safe, required args
    const safe = (s) => String(s).replace(/"/g, '\\"');
    const productName = orderPayload.productName || orderPayload.name;
    const portion = orderPayload.portion || 'Normal';
    const quantity = parseInt(orderPayload.quantity || 1, 10);
    const inline = `mutation { addOrderToTerminalTicket(terminalId: "${safe(terminalId)}", productName: "${safe(productName)}", quantity: ${quantity}, portion: "${safe(portion)}") { totalAmount remainingAmount } }`;

    try {
        const response = await fetch(config.GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query: inline })
        });

        const data = await response.json();

        if (data.errors) {
            const msg = data.errors.map(e => e.message).join(', ');
            console.error('🚨 GraphQL errors adding order:', data.errors);
            // Auto-open terminal ticket and retry once on specific error
            if (/No ticket open on terminal/i.test(msg)) {
                debug('🟨 No ticket open. Creating terminal ticket and retrying addOrder...');
                const created = await createTerminalTicketAsync(terminalId);
                if (created) {
                    const retryResp = await fetch(config.GQLurl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ query: inline })
                    });
                    const retryData = await retryResp.json();
                    if (!retryData.errors) {
                        const result = retryData.data?.addOrderToTerminalTicket;
                        debug('✅ Order added after opening ticket:', result);
                        return result;
                    }
                    const retryMsg = retryData.errors.map(e => e.message).join(', ');
                    throw new Error(`Add order failed after opening ticket: ${retryMsg}`);
                }
            }
            throw new Error(`Add order failed: ${msg}`);
        }

        const result = data.data?.addOrderToTerminalTicket;
        debug('✅ Order added successfully:', result);
        return result;

    } catch (error) {
        debug('❌ Failed to add order:', error);
        throw error;
    }
};

// Legacy version for backward compatibility
export const addOrderToTerminalTicket = async (productName, portion, quantity = 1) => {
    debug('➕ Adding order to terminal ticket (inline, no variables):', { productName, portion, quantity });
    const terminalId = getCurrentTerminalId();

    if (!terminalId) {
        throw new Error('No terminal ID found. Register terminal first.');
    }


    const token = await ensureAuthenticated();
    const config = appconfig();
    const safe = (s) => String(s).replace(/"/g, '\\"');
    const q = parseInt(quantity, 10);
    const inline = `mutation { addOrderToTerminalTicket(terminalId: "${safe(terminalId)}", productName: "${safe(productName)}", quantity: ${q}, portion: "${safe(portion)}") { totalAmount } }`;

    try {
        const response = await fetch(config.GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query: inline })
        });

        const data = await response.json();

        if (data.errors) {
            console.error('🚨 GraphQL errors adding order:', data.errors);
            throw new Error(`Add order failed: ${data.errors.map(e => e.message).join(', ')}`);
        }

        const result = data.data?.addOrderToTerminalTicket;
        debug('✅ Order added, new total:', result?.totalAmount);
        return result;

    } catch (error) {
        debug('❌ Failed to add order:', error);
        throw error;
    }
};

export const getTerminalTicket = async () => {
    debug('📋 Getting terminal ticket...');
    const terminalId = getCurrentTerminalId();

    if (!terminalId) {
        throw new Error('No terminal ID found. Register terminal first.');
    }


    const token = await ensureAuthenticated();
    const config = appconfig();

    // Fetch essential fields; include order 'name' for reliable matching after add
    const safe = (s) => String(s).replace(/\"/g, '\\"');
    const inline = `query { getTerminalTicket(terminalId: \"${safe(terminalId)}\") { uid number totalAmount remainingAmount orders { uid name productId quantity price portion } } }`;

    try {
        const response = await fetch(config.GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query: inline })
        });

        const data = await response.json();

        if (data.errors) {
            console.error('🚨 GraphQL errors getting terminal ticket:', data.errors);
            throw new Error(`Get terminal ticket failed: ${data.errors.map(e => e.message).join(', ')}`);
        }

        const ticket = data.data?.getTerminalTicket;
        debug('✅ Terminal ticket retrieved:', ticket);
        return ticket;

    } catch (error) {
        debug('❌ Failed to get terminal ticket:', error);
        throw error;
    }
};

export const closeTerminalTicket = async () => {
    debug('🔒 Closing terminal ticket (inline, tolerant if none open)...');
    const terminalId = getCurrentTerminalId();

    if (!terminalId) {
        throw new Error('No terminal ID found. Register terminal first.');
    }


    const token = await ensureAuthenticated();
    const config = appconfig();
    const safe = (s) => String(s).replace(/\"/g, '\\"');
    const inline = `mutation { closeTerminalTicket(terminalId: \"${safe(terminalId)}\") }`;

    try {
        const response = await fetch(config.GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query: inline })
        });

        const data = await response.json();

        if (data.errors) {
            const msg = data.errors.map(e => e.message).join(', ');
            console.error('🚨 GraphQL errors closing terminal ticket:', data.errors);
            // If no open ticket, treat as success (idempotent close)
            if (/No ticket open on terminal/i.test(msg)) {
                debug('🟨 No open ticket on terminal upon close; treating as success.');
            } else {
                throw new Error(`Close terminal ticket failed: ${msg}`);
            }
        }

        debug('✅ Terminal ticket closed');

        // Clear stored terminal ID
        if (typeof window !== 'undefined') {
            delete window.currentTerminalId;
            localStorage.removeItem('currentTerminalId');
        }

        return data.data?.closeTerminalTicket ?? true;

    } catch (error) {
        debug('❌ Failed to close terminal ticket:', error);
        throw error;
    }
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

    // Import terminalService and check existing terminal
    const { default: terminalService } = await import('./services/terminalService');
    const terminalId = terminalService.getTerminalId();

    if (!terminalId) {
        console.log('🔍 No terminal registered, proceeding without terminal');
    } else {
        console.log('✅ Using existing terminal:', terminalId);
    }

    // Try multiple query formats for compatibility
    const menuName = config.menuName || 'MENU';

    const queries = [
        // Primary enhanced query format with variables
        {
            query: getMenuScript(),
            variables: { menuName }
        },
        // Alternative format 1 with menuName parameter
        {
            query: `query GetMenuAlt1($menuName: String!) { 
                menu(menuName: $menuName) { 
                    categories { 
                        id name caption color 
                        menuItems { 
                            id name caption productId 
                            product { id name portions { id name price } } 
                            portions { id name price } 
                            tags { id name } 
                        } 
                    } 
                } 
            }`,
            variables: { menuName }
        },
        // Alternative format 2 without variables (fallback)
        {
            query: `query { menu { categories { id name caption color menuItems { id name caption productId product { id name portions { id name price } } portions { id name price } tags { id name } } } } }`,
            variables: {}
        },
        // Simplified format (fallback)
        {
            query: `query { menu { categories { id name caption menuItems { id name caption portions { id name price } } } } }`,
            variables: {}
        }
    ];

    for (let i = 0; i < queries.length; i++) {
        const { query, variables } = queries[i];
        debug(`📋 Trying menu query format ${i + 1}...`);
        debug(`📝 Query variables:`, variables);

        try {
            const response = await fetch(config.GQLurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ query, variables })
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

    debug('❌ All menu query formats failed - checking diagnostics...');

    // Log configuration for debugging
    debug('🔧 Current configuration:', {
        GQLurl: config.GQLurl,
        token: token ? 'Present' : 'Missing',
        hostname: window.location?.hostname,
        isDevServer: /:8081$/.test(window.location?.host)
    });

    // Try to use cached menu as temporary fallback while diagnosing
    debug('🔍 Checking for cached menu as temporary fallback...');
    const cachedMenu = cacheService.getMenu();
    if (cachedMenu && cachedMenu.categories && cachedMenu.categories.length > 0) {
        debug('📦 Using cached menu as temporary fallback while diagnosing connection issues');
        debug('⚠️ WARNING: Using cached data. GraphQL connection needs to be fixed!');

        // Show user-friendly error message but still provide functionality
        console.warn(`
🚨 PMPOS: Using cached menu data - GraphQL connection failed
- Check SambaPOS server status
- Verify GraphQL endpoint: ${config.GQLurl}
- Confirm authentication token is valid
- Menu will work but data may be outdated
        `);

        if (callback) callback(cachedMenu);
        return cachedMenu;
    }

    // If no cache available, provide basic diagnostic information
    const diagnosticError = new Error(`
GraphQL Menu Loading Failed - Diagnostic Information:
- Endpoint: ${config.GQLurl}
- Authentication: ${token ? 'Token present' : 'No token available'}
- Network: Check if SambaPOS server is running
- All ${queries.length} query formats failed
- No cached menu available as fallback
    `.trim());

    debug('❌ No fallback available, throwing diagnostic error');
    throw diagnosticError;
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
    const cfg = appconfig();
    const safe = (s) => String(s).replace(/"/g, '\\"');
    const inline = `mutation { createTerminalTicket(terminalId: "${safe(terminalId)}") { id uid type remainingAmount totalAmount } }`;

    const response = await fetch(cfg.GQLurl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: inline })
    });

    const data = await response.json();

    if (data.errors) {
        console.error('🚨 GraphQL Errors in createTerminalTicket:', data.errors);
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
    const cfg = appconfig();
    const safe = (s) => String(s).replace(/"/g, '\\"');
    const type = cfg.entityTypeName;

    // Input validation: avoid sending malformed GraphQL requests
    if (!terminalId) {
        throw new Error('changeEntityOfTerminalTicketAsync requires terminalId');
    }
    if (!tableName && tableName !== 0) {
        throw new Error('changeEntityOfTerminalTicketAsync requires tableName');
    }

    // Prefer Discovery-correct type/name first; keep 'entity' as a fallback only
    const inlineTypeName = `mutation { changeEntityOfTerminalTicket(terminalId: \"${safe(terminalId)}\", type: \"${safe(type)}\", name: \"${safe(tableName)}\") { id entities { name type } } }`;
    const inlineEntity = `mutation { changeEntityOfTerminalTicket(terminalId: \"${safe(terminalId)}\", entity: \"${safe(tableName)}\") { id entities { name type } } }`;

    const exec = async (query) => {
        const res = await fetch(cfg.GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query })
        });
        const text = await res.text();
        let json;
        try {
            json = JSON.parse(text);
        } catch (e) {
            json = { errors: [{ message: `HTTP ${res.status}: ${text?.slice(0, 200) || 'Invalid JSON'}` }] };
        }
        if (!res.ok && (!json || !json.errors)) {
            json = { errors: [{ message: `HTTP ${res.status}: ${text?.slice(0, 200) || res.statusText}` }] };
        }
        return json;
    };

    // Try type/name first (Discovery)
    let data = await exec(inlineTypeName);

    // Handle no ticket open: open ticket and retry once with same query
    const handleNoTicketOpen = async (query) => {
        const openInline = `mutation { createTerminalTicket(terminalId: \"${safe(terminalId)}\") { id } }`;
        const openJson = await exec(openInline);
        if (!openJson.errors) {
            const retry = await exec(query);
            if (!retry.errors) return retry;
            throw new Error(retry.errors.map(e => e.message).join(', '));
        }
        throw new Error(openJson.errors.map(e => e.message).join(', '));
    };

    if (data.errors) {
        const msg = data.errors.map(e => e.message).join(', ');
        if (/No ticket open on terminal/i.test(msg)) {
            data = await handleNoTicketOpen(inlineTypeName);
        } else {
            // Fallback: try the 'entity' variant as a last resort
            let fallback = await exec(inlineEntity);
            if (fallback.errors) {
                const msg2 = fallback.errors.map(e => e.message).join(', ');
                if (/No ticket open on terminal/i.test(msg2)) {
                    fallback = await handleNoTicketOpen(inlineEntity);
                } else {
                    throw new Error(msg2 || msg);
                }
            }
            data = fallback;
        }
    }

    return data.data?.changeEntityOfTerminalTicket;
};

// ============================================
// AUTOMATION COMMANDS
// ============================================
export const executeAutomationCommandForTerminalTicketAsync = async (terminalId, name, value = '', orderUid = null) => {
    const token = await ensureAuthenticated();
    const cfg = appconfig();
    const safe = (s) => String(s).replace(/\"/g, '\\"');
    const args = [
        `terminalId: \"${safe(terminalId)}\"`,
        `name: \"${safe(name)}\"`,
        `value: \"${safe(value)}\"`
    ];
    if (orderUid) args.push(`orderUid: \"${safe(orderUid)}\"`);
    const inline = `mutation { executeAutomationCommandForTerminalTicket(${args.join(', ')}) { id } }`;

    const response = await fetch(cfg.GQLurl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: inline })
    });

    const data = await response.json();
    if (data.errors) {
        const msg = data.errors.map(e => e.message).join(', ');
        throw new Error(msg);
    }
    return data.data?.executeAutomationCommandForTerminalTicket;
};

// Helper: update order tags for a specific order on a terminal ticket
export const updateOrderTagOnTerminalTicket = async (terminalId, orderUid, tagName, tagValue) => {
    const token = await ensureAuthenticated();
    const cfg = appconfig();
    const safe = (s) => String(s).replace(/"/g, '\\"');

    // Build inline mutation to update order tags (array of objects)
    const inline = `mutation { ticket: updateOrderOfTerminalTicket(terminalId: "${safe(terminalId)}", orderUid: "${safe(orderUid)}", orderTags: [{ tagName: "${safe(tagName)}", tag: "${safe(tagValue)}" }]) { id orders { uid tags { tagName tag } } } }`;

    const response = await fetch(cfg.GQLurl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: inline })
    });

    const data = await response.json();
    if (data.errors) {
        const msg = data.errors.map(e => e.message).join(', ');
        throw new Error(msg);
    }

    return data.data?.ticket || data.data?.updateOrderOfTerminalTicket || null;
};

// Convenience flow: try server Automation Command first, then patch the order tag if the server didn't set the tag value
export const executeComentarioWithFallback = async (terminalId, orderUid, commentValue) => {
    // 1) Try the Automation Command (server-side rule may handle tag creation)
    try {
        await executeAutomationCommandForTerminalTicketAsync(terminalId, 'COMENTARIO', commentValue, orderUid);
    } catch (err) {
        // If command fails, continue to attempt client-side tag update
        console.warn('Automation Command failed (continuing with fallback):', err.message || err);
    }

    // 2) Fetch current ticket and check if the order already has the tag with value
    const token = await ensureAuthenticated();
    const cfg = appconfig();
    const getQuery = `query { getTerminalTicket(terminalId: "${String(terminalId).replace(/"/g, '\\"')}") { orders { uid tags { tagName tag } } } }`;
    const resp = await fetch(cfg.GQLurl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: getQuery })
    });
    const json = await resp.json();

    const orders = json?.data?.getTerminalTicket?.orders || [];
    const target = orders.find(o => o.uid === orderUid);

    if (target) {
        const hasTagWithValue = Array.isArray(target.tags) && target.tags.some(t => t.tagName === 'COMENTARIO' && t.tag && String(t.tag).trim().length > 0);
        if (hasTagWithValue) {
            return { appliedBy: 'server', order: target };
        }
    }

    // 3) If no tag or tag empty, write it directly
    const updated = await updateOrderTagOnTerminalTicket(terminalId, orderUid, 'COMENTARIO', commentValue);
    return { appliedBy: 'client-fallback', updated };
};

// List available Automation Command buttons for the active terminal ticket
export const getAutomationCommandButtonsForTerminalTicketAsync = async (terminalId, orderUids = null) => {
    const token = await ensureAuthenticated();
    const cfg = appconfig();
    const safe = (s) => String(s).replace(/\"/g, '\\"');
    const args = [`terminalId: \"${safe(terminalId)}\"`];
    if (orderUids && Array.isArray(orderUids) && orderUids.length > 0) {
        const ids = orderUids.map(u => `\"${safe(u)}\"`).join(',');
        args.push(`orderUids: [${ids}]`);
    }
    const inline = `query { getAutomationCommandButtonsForTerminalTicket(${args.join(', ')}) { name } }`;

    const response = await fetch(cfg.GQLurl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: inline })
    });
    const data = await response.json();
    if (data.errors) {
        const msg = data.errors.map(e => e.message).join(', ');
        throw new Error(msg);
    }
    return data.data?.getAutomationCommandButtonsForTerminalTicket || [];
};

// ============================================
// ORDER FUNCTIONS (Legacy)
// ============================================
export function addOrderToTerminalTicketLegacy(terminalId, productId, quantity = 1, orderTags = '', callback) {
    const query = getAddOrderToTerminalTicketScript(terminalId, productId, orderTags);
    $.postJSON(query, callback);
}

export function closeTerminalTicketLegacy(terminalId, callback) {
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

    if (!terminalId) throw new Error('Terminal ID is required');
    if (!paymentTypeName) throw new Error('paymentTypeName is required');
    const amt = amount != null ? parseFloat(amount) : null;

    const mutation = `
        mutation PayTerminalTicket($terminalId: String!, $paymentTypeName: String!, $amount: Decimal) {
            payTerminalTicket(terminalId: $terminalId, paymentTypeName: $paymentTypeName, amount: $amount) {
                ticketId
                amount
                remainingAmount
                errorMessage
            }
        }
    `;

    const response = await fetch(config.GQLurl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: mutation, variables: { terminalId, paymentTypeName, amount: amt } })
    });

    const data = await response.json();

    if (callback) callback(data);

    return data;
};

// ============================================
// CALCULATIONS & ORDER UPDATE HELPERS
// ============================================
export const addCalculationToTerminalTicketAsync = async (terminalId, calculationName, amount) => {
    debug('🧮 Adding calculation to terminal ticket', { terminalId, calculationName, amount });
    const token = await ensureAuthenticated();
    const config = appconfig();
    if (!terminalId) throw new Error('Terminal ID is required');
    if (!calculationName) throw new Error('calculationName is required');
    const amt = amount != null ? parseFloat(amount) : 0;

    const query = `mutation AddCalc($terminalId:String!,$calculationName:String!,$amount:Decimal!){
        addCalculationToTerminalTicket(terminalId:$terminalId, calculationName:$calculationName, amount:$amount){
            id
            totalAmount
            remainingAmount
            calculations{ name calculationAmount }
        }
    }`;

    const response = await fetch(config.GQLurl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query, variables: { terminalId, calculationName, amount: amt } })
    });

    const data = await response.json();
    if (data.errors) {
        throw new Error(data.errors.map(e => e.message).join(', '));
    }
    return data.data?.addCalculationToTerminalTicket;
};

export const updateOrderOfTerminalTicketAsync = async (terminalId, orderUid, patch = {}) => {
    debug('✏️ Updating terminal ticket order', { terminalId, orderUid, patch });
    const token = await ensureAuthenticated();
    const config = appconfig();
    if (!terminalId) throw new Error('Terminal ID is required');
    if (!orderUid) throw new Error('orderUid is required');

    // Build variables and dynamic argument list based on provided patch keys
    const vars = { terminalId, orderUid };
    const argList = ['terminalId:$terminalId', 'orderUid:$orderUid'];

    const addOpt = (key, gqlType, valueTransform = (v) => v) => {
        if (patch[key] !== undefined && patch[key] !== null) {
            vars[key] = valueTransform(patch[key]);
            argList.push(`${key}:$${key}`);
            return `$${key}:${gqlType}`;
        }
        return null;
    };

    const varDefs = [
        '$terminalId:String!',
        '$orderUid:String!',
        addOpt('portion', 'String'),
        addOpt('quantity', 'Decimal', (v) => parseFloat(v)),
        addOpt('price', 'Decimal', (v) => parseFloat(v)),
        addOpt('priceTag', 'String'),
        addOpt('locked', 'Boolean'),
        addOpt('increaseInventory', 'Boolean'),
        addOpt('decreaseInventory', 'Boolean'),
        addOpt('calculatePrice', 'Boolean'),
        addOpt('disablePortionSelection', 'Boolean'),
        addOpt('name', 'String'),
        addOpt('taxTemplate', 'String'),
        addOpt('warehouseName', 'String'),
        addOpt('accountTransactionType', 'String'),
        addOpt('groupTagName', 'String'),
        addOpt('groupTagFormat', 'String'),
    ].filter(Boolean).join(',');

    // Order Tags if provided
    if (patch.orderTags) {
        vars.orderTags = patch.orderTags;
        argList.push('orderTags:$orderTags');
    }

    const query = `mutation UpdateOrder(${varDefs}${patch.orderTags ? ', $orderTags:[OrderTagInputType]' : ''}){
        updateOrderOfTerminalTicket(${argList.join(', ')}){
            id
            totalAmount
            remainingAmount
            orders{ uid quantity price portion }
        }
    }`;

    const response = await fetch(config.GQLurl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query, variables: vars })
    });

    const data = await response.json();
    if (data.errors) {
        throw new Error(data.errors.map(e => e.message).join(', '));
    }
    return data.data?.updateOrderOfTerminalTicket;
};

export const getPaymentTypesAsync = async () => {
    debug('💳 Fetching payment types');
    const token = await ensureAuthenticated();
    const config = appconfig();
    const query = `query { getPaymentTypes { id name buttonHeader buttonColor processorSettings } }`;
    const resp = await fetch(config.GQLurl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query })
    });
    const data = await resp.json();
    if (data.errors) throw new Error(data.errors.map(e => e.message).join(', '));
    return data.data?.getPaymentTypes || [];
};

export const getCalculationSelectorsAsync = async () => {
    debug('🧮 Fetching calculation selectors');
    const token = await ensureAuthenticated();
    const config = appconfig();
    const query = `query { getCalculationSelectors { name buttonHeader buttonColor } }`;
    const resp = await fetch(config.GQLurl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query })
    });
    const data = await resp.json();
    if (data.errors) throw new Error(data.errors.map(e => e.message).join(', '));
    return data.data?.getCalculationSelectors || [];
};

// ============================================
// SCRIPT GENERATORS
// ============================================
function getMenuScript() {
    const config = appconfig();
    const menuName = config.menuName || 'MENU';

    debug('📋 Building menu query for menu name:', menuName);

    // Menu query with proper menuName parameter
    return `query GetMenu($menuName: String!) {
        menu(menuName: $menuName) {
            id
            name
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

// ============================================
// GLOBAL TICKETS (All Users) - Mesa Occupancy Detection
// ============================================

/**
 * Gets ALL open tickets from any user - Used for mesa occupancy detection
 * This is the "source of truth" for which mesas are occupied
 */
export const getAllOpenTickets = async () => {
    debug('🌍 Getting all open tickets for mesa occupancy...');
    const allowGqlFallback = process.env.REACT_APP_ALLOW_GQL_READ_FALLBACK === 'true';
    try {
        const rows = await fetchActiveTickets();
        const parsed = Array.isArray(rows) ? rows.map(r => {
            let states = [];
            try {
                if (r.TicketStates && typeof r.TicketStates === 'string') {
                    const js = JSON.parse(r.TicketStates);
                    if (Array.isArray(js)) {
                        states = js.map(s => ({ stateName: s.SN || s.stateName || 'Estado', state: s.S || s.state || '' }));
                    }
                }
            } catch (_) {}
            return {
                id: r.TicketId,
                number: r.TicketNumber,
                date: r.OpenedAt || r.Date,
                lastUpdateDate: r.LastUpdateTime || r.Date,
                entities: r.MesaNombre ? [{ type: 'Mesas', name: String(r.MesaNombre) }] : [],
                states
            };
        }) : [];
        debug(`✅ Found ${parsed.length} open tickets (read-service)`);
        return parsed;
    } catch (err) {
        if (!allowGqlFallback) {
            debug('❌ getAllOpenTickets SQL failed and GraphQL fallback disabled:', err.message);
            return [];
        }
        const token = await ensureAuthenticated();
        const config = appconfig();
        const query = `query GetAllOpenTickets { getTickets(isClosed: false) { id date lastUpdateDate entities { name type } states { stateName state } } }`;
        try {
            const response = await fetch(config.GQLurl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ query }) });
            const data = await response.json();
            if (data.errors) return [];
            const tickets = data.data?.getTickets || [];
            debug(`✅ Found ${tickets.length} open tickets from all users (GraphQL fallback)`);
            return tickets;
        } catch (error) {
            debug('❌ Failed to get all open tickets (GraphQL fallback):', error);
            return [];
        }
    }
};

// ============================================
// Read-service: Entities, Customers, Tickets (Generic)
// ============================================

export async function fetchEntitiesByType(type, search = null, limit = 200) {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (search) params.set('search', search);
    if (limit) params.set('limit', String(limit));
    const resp = await loggedFetch(`/internal-api/entities?${params.toString()}`, {
        method: 'GET',
        headers: withInternalHeaders({ 'Content-Type': 'application/json' })
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
}

export async function searchCustomers(term, limit = 50) {
    const params = new URLSearchParams({ term: term || '', limit: String(limit) });
    const resp = await loggedFetch(`/internal-api/customers/search?${params.toString()}`, {
        method: 'GET',
        headers: withInternalHeaders({ 'Content-Type': 'application/json' })
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
}

export async function fetchTicketsList({ isClosed = false, entityId = null, customerId = null, sinceMinutes = null, limit = 200 } = {}) {
    const params = new URLSearchParams();
    params.set('isClosed', String(!!isClosed));
    if (entityId) params.set('entityId', String(entityId));
    if (customerId) params.set('customerId', String(customerId));
    if (sinceMinutes) params.set('sinceMinutes', String(sinceMinutes));
    if (limit) params.set('limit', String(limit));
    const resp = await loggedFetch(`/internal-api/tickets?${params.toString()}`, {
        method: 'GET',
        headers: withInternalHeaders({ 'Content-Type': 'application/json' })
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
}

export async function fetchOpenTicketByEntityId(entityId) {
    const resp = await loggedFetch(`/internal-api/tickets/by-entity/${encodeURIComponent(entityId)}/current`, {
        method: 'GET',
        headers: withInternalHeaders({ 'Content-Type': 'application/json' })
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
}

export async function fetchTicketByNumber(number) {
    const resp = await loggedFetch(`/internal-api/tickets/number/${encodeURIComponent(number)}`, {
        method: 'GET',
        headers: withInternalHeaders({ 'Content-Type': 'application/json' })
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
}

export async function fetchTicketByUid(uid) {
    const resp = await loggedFetch(`/internal-api/tickets/uid/${encodeURIComponent(uid)}`, {
        method: 'GET',
        headers: withInternalHeaders({ 'Content-Type': 'application/json' })
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
}

/**
 * Gets mesa status based on global ticket data
 * Returns: 'LIBRE' | 'OCUPADO' | 'CUENTA'
 */
export const getMesaStatus = (mesaNumber, allTickets) => {
    const mesaStr = String(mesaNumber).trim();
    const ticket = allTickets.find(t =>
        Array.isArray(t.entities) && t.entities.some(e => {
            const type = (e.type || '').toString().toLowerCase();
            const name = String(e.name || '').trim();
            return type.includes('mesa') && name === mesaStr;
        })
    );

    if (!ticket) return 'LIBRE';

    // Prefer explicit ticket state for "Cuenta solicitada"
    const hasCuentaSolicitada = Array.isArray(ticket.states)
        && ticket.states.some(s => {
            const name = (s.stateName || '').toLowerCase();
            const value = (s.state || '').toLowerCase();
            return (name === 'status' || name === 'estado') && value.includes('cuenta');
        });

    if (hasCuentaSolicitada) return 'CUENTA';

    return 'OCUPADO';
};

/**
 * Gets the most recent ticket for a specific mesa
 * If multiple tickets exist for same mesa, returns the most recently updated
 */
export const getTicketForMesa = (mesaNumber, allTickets) => {
    const mesaStr = String(mesaNumber).trim();
    const ticketsForMesa = allTickets.filter(ticket =>
        Array.isArray(ticket.entities) && ticket.entities.some(entity => {
            const type = (entity.type || '').toString().toLowerCase();
            const name = String(entity.name || '').trim();
            return type.includes('mesa') && name === mesaStr;
        })
    );

    if (ticketsForMesa.length === 0) return null;

    // Return most recently updated ticket
    return ticketsForMesa.sort((a, b) =>
        new Date(b.lastUpdateDate || b.date) - new Date(a.lastUpdateDate || a.date)
    )[0];
};

/**
 * Calculates minutes elapsed since state change for a mesa
 * Returns object with time info for display
 */
export const getMesaTimeInfo = (mesaNumber, allTickets) => {
    const ticket = getTicketForMesa(mesaNumber, allTickets);
    if (!ticket) return null;

    const status = getMesaStatus(mesaNumber, allTickets);
    const now = new Date();

    // Use lastUpdateDate if available, otherwise use creation date
    const refRaw = ticket.lastUpdateDate || ticket.date;
    const referenceDate = refRaw ? new Date(refRaw) : null;
    const minutesElapsed = referenceDate && !isNaN(referenceDate.getTime())
        ? Math.floor((now - referenceDate) / 60000)
        : 0;

    switch (status) {
        case 'OCUPADO':
            return {
                text: `Ocupada hace ${minutesElapsed} min`,
                minutes: minutesElapsed,
                status: 'ocupado'
            };
        case 'CUENTA':
            return {
                text: `Cuenta solicitada hace ${minutesElapsed} min`,
                minutes: minutesElapsed,
                status: 'cuenta'
            };
        default:
            return null;
    }
};

/**
 * Enhanced mesa status with time information
 */
export const getMesaStatusWithTime = (mesaNumber, allTickets) => {
    const status = getMesaStatus(mesaNumber, allTickets);
    const timeInfo = getMesaTimeInfo(mesaNumber, allTickets);

    return {
        status,
        timeInfo,
        color: getMesaColor(status)
    };
};

/**
 * Color mapping for mesa status
 */
export const getMesaColor = (status) => {
    switch (status) {
        case 'LIBRE': return '#F5F1E6'; // crema/hueso
        case 'OCUPADO': return '#FFEB3B'; // amarillo sólido
        case 'CUENTA': return '#F44336'; // rojo sólido
        default: return '#F5F1E6';
    }
};

// ============================================
// CLOSED TICKETS HELPERS
// ============================================
export const getTicketById = async (ticketId) => {
    const token = await ensureAuthenticated();
    const cfg = appconfig();
    const id = typeof ticketId === 'string' ? ticketId : String(ticketId);
    const query = `query { getTicket(id: ${id}) { id number date totalAmount remainingAmount entities { name type } orders { uid productId quantity price portion } } }`;
    const response = await fetch(cfg.GQLurl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query })
    });
    const data = await response.json();
    if (data.errors) {
        const msg = data.errors.map(e => e.message).join(', ');
        throw new Error(msg);
    }
    return data.data?.getTicket || null;
};

export const executePrintJobAsync = async ({ name, ticketId, copies = 1, terminal = null, department = null, user = null }) => {
    const token = await ensureAuthenticated();
    const cfg = appconfig();
    const safe = (s) => String(s).replace(/\"/g, '\\"');
    const p = {
        name: name || process.env.SAMBAPOS_PRINT_JOB_NAME || 'Imprimir factura CAJA',
        ticketId: typeof ticketId === 'string' ? ticketId : String(ticketId),
        copies: parseInt(copies, 10) || 1,
        terminal: terminal || process.env.SAMBAPOS_TERMINAL || cfg.terminalName,
        department: department || process.env.SAMBAPOS_DEPARTMENT || cfg.departmentName,
        user: user || process.env.SAMBAPOS_USERNAME || cfg.userName
    };

    const inline = `mutation { executePrintJob(name: \"${safe(p.name)}\", ticketId: ${p.ticketId}, copies: ${p.copies}, terminal: \"${safe(p.terminal)}\", department: \"${safe(p.department)}\", user: \"${safe(p.user)}\") { name } }`;
    const response = await fetch(cfg.GQLurl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: inline })
    });
    const data = await response.json();
    if (data.errors) {
        const msg = data.errors.map(e => e.message).join(', ');
        throw new Error(msg);
    }
    return data.data?.executePrintJob || { name: p.name };
};

/**
 * Loads a ticket from another user into current terminal session
 * This allows operating on tickets created by other users
 */
export const loadTicketToTerminal = async (ticketId) => {
    debug('🔄 Loading external ticket to terminal session:', ticketId);
    const terminalId = getCurrentTerminalId();

    if (!terminalId) {
        throw new Error('No terminal ID found. Register terminal first.');
    }

    const token = await ensureAuthenticated();
    const config = appconfig();

    const query = `mutation LoadTerminalTicket($terminalId: String!, $ticketId: String!) {
        loadTerminalTicket(terminalId: $terminalId, ticketId: $ticketId) {
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
            console.error('🚨 GraphQL errors loading ticket to terminal:', data.errors);
            throw new Error(`Load ticket failed: ${data.errors.map(e => e.message).join(', ')}`);
        }

        const ticket = data.data?.loadTerminalTicket;
        debug('✅ Ticket loaded to terminal session:', ticket);
        return ticket;

    } catch (error) {
        debug('❌ Failed to load ticket to terminal:', error);
        throw error;
    }
};

// DEPRECATED: Use dataManager.getActiveTickets() instead
export const findTicketByTableAlternative = async (tableName) => {
    debug('⚠️ DEPRECATED: Use dataManager.getActiveTickets() instead');
    // Return null to force migration to new system
    return null;
};
