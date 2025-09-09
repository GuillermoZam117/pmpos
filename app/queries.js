/**
 * QUERIES CLEAN - Versión limpia sin duplicados
 * Contiene solo las funciones esenciales para el funcionamiento del POS
 */

import { appconfig } from './config';
import { resolveGqlUrl } from './utils/gqlEndpoint';
import './services/legacyFallbackOff';
import './services/terminalResetOnStartup';
import './services/orderTagPreload';
import Debug from 'debug';
import { loggedFetch, loggedGraphQL } from './utils/requestLogger';
import { tokenService } from './services/tokenService';

const debug = Debug('pmpos:queries');

// Escape values for inline GraphQL strings
const gqlEscape = (s) => String(s)
    .replace(/\\/g, '\\\\')
    .replace(/\"/g, '"')
    .replace(/"/g, '\\"');

// Optional header injection for internal read-service (dev-only / internal nets)
const SEND_INTERNAL_KEY = process.env.REACT_APP_SEND_INTERNAL_KEY === 'true';
const INTERNAL_API_KEY = (typeof window !== 'undefined' && window.localStorage.getItem('INTERNAL_API_KEY')) || process.env.INTERNAL_API_KEY;
const READ_SERVICE_APIKEY = (typeof window !== 'undefined' && window.localStorage.getItem('READ_SERVICE_APIKEY')) || process.env.READ_SERVICE_APIKEY;
const withInternalHeaders = (base = {}) => {
    const key = READ_SERVICE_APIKEY || INTERNAL_API_KEY;
    if (key || (SEND_INTERNAL_KEY && INTERNAL_API_KEY)) {
        return { ...base, 'X-INTERNAL-API-KEY': key || INTERNAL_API_KEY, 'apikeyAuth': key || INTERNAL_API_KEY };
    }
    return base;
};

// Centralized fetch that retries once on 401 by refreshing tokens
const fetchWithAuthRetry = async (url, makeRequestOptions) => {
    // makeRequestOptions: () => ({ method, headers, body }) freshly built with current token
    const doRequest = async () => {
        const token = await getToken();
        const opts = makeRequestOptions(token);
        opts.headers = { ...opts.headers, 'Authorization': `Bearer ${token}` };
        return await fetch(url, opts);
    };

    let response = await doRequest();
    if (response.status === 401) {
        console.warn('🔄 Auth 401 detected. Clearing tokens and retrying with fresh token...');
        try {
            tokenService.clearTokens();
            await tokenService.requestNewTokens();
        } catch (e) {
            console.error('❌ Failed to refresh tokens after 401:', e.message);
            return response;
        }
        response = await doRequest();
    }
    return response;
};

// Helper para obtener token - UNIFIED approach
let tokenPromise = null; // Prevent concurrent token requests
const getToken = async () => {
    debug('🔑 Getting token...');

    // If a token request is already in progress, wait for it
    if (tokenPromise) {
        debug('⏳ Token request already in progress, waiting...');
        return await tokenPromise;
    }

    // Create a single token request that all concurrent calls will share
    tokenPromise = (async () => {
        try {
            const token = await tokenService.getValidAccessToken();
            if (!token) {
                console.error('❌ getToken: No token returned from tokenService');
                throw new Error('Authentication required - no token available');
            }
            debug('✅ getToken: Token obtained successfully');
            return token;
        } catch (error) {
            console.error('❌ getToken error:', error);
            throw error;
        } finally {
            // Reset promise when done (success or failure)
            tokenPromise = null;
        }
    })();

    return await tokenPromise;
};

// Helper para hacer requests JSON
export async function postJSON(url, body) {
    const token = await getToken();

    if (!token) {
        throw new Error('No token available');
    }

    // Use logged fetch for structured logging
    const response = await loggedFetch(resolveGqlUrl(appconfig()), {
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
        const url = commandName ? `/internal-api/automation-commands?name=${encodeURIComponent(commandName)}` : `/internal-api/automation-commands`;
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
        const url = screen ? `/internal-api/tables?screen=${screen}` : `/internal-api/tables`;
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
// DEPRECATED: Use getToken() instead to avoid concurrency issues
export const ensureAuthenticated = async () => {
    debug('🔐 Ensuring authentication... (using unified getToken)');
    return await getToken();
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
            const response = await fetchWithAuthRetry(resolveGqlUrl(config), (token) => ({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ query: inlineMutation })
            }));

            debug(`📡 Terminal registration response: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const errorText = await response.text();

                // HTTP 500 errors are expected in some SambaPOS configurations (per CLAUDE.md)
                if (response.status >= 500 && response.status <= 599) {
                    console.warn('⚠️ Terminal registration HTTP 500 (expected in some SambaPOS configurations):', {
                        status: response.status,
                        statusText: response.statusText,
                        variables: variables,
                        attempt
                    });

                    if (attempt < maxAttempts) {
                        const backoff = 500 * Math.pow(2, attempt - 1); // 500ms, 1000ms, ...
                        debug(`⏳ Waiting ${backoff}ms before retrying registerTerminal`);
                        await sleep(backoff);
                        continue;
                    }

                    // After all retries, treat as expected failure (not critical error)
                    console.warn('⚠️ Terminal registration failed after all retries (expected in some configurations)');
                    return null; // Return null instead of throwing
                } else {
                    // 4xx errors are configuration issues, should be logged as errors
                    console.error('❌ Terminal registration HTTP error:', {
                        status: response.status,
                        statusText: response.statusText,
                        body: errorText,
                        variables: variables,
                        attempt
                    });
                    throw new Error(`Terminal registration failed: HTTP ${response.status} - ${errorText}`);
                }
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
        console.warn('⚠️ Terminal registration returned no ID (may be expected in some configurations)');
        console.warn('Response data:', data);
        console.warn('This may indicate SambaPOS Message Server configuration issues, but app can continue without terminal');
        return null; // Return null instead of throwing - app can function without terminal
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
    const svc = require('./services/terminalService').default;
    return svc ? svc.getTerminalId() : null;
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
        const response = await fetchWithAuthRetry(resolveGqlUrl(config), (token) => ({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                query,
                variables: { terminalId }
            })
        }));

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

    const executeAddOrder = async (currentTerminalId) => {
        // Build inline mutation with only safe, required args
        const productName = orderPayload.productName || orderPayload.name;
        const portion = orderPayload.portion || 'Normal';
        const quantity = parseInt(orderPayload.quantity || 1, 10);
        const inline = `mutation { addOrderToTerminalTicket(terminalId: "${gqlEscape(currentTerminalId)}", productName: "${gqlEscape(productName)}", quantity: ${quantity}, portion: "${gqlEscape(portion)}") { totalAmount remainingAmount } }`;

        const response = await fetchWithAuthRetry(resolveGqlUrl(config), (token) => ({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query: inline })
        }));

        return await response.json();
    };

    try {
        // Try with current terminal ID
        let data = await executeAddOrder(terminalId);

        // Check for terminal errors and retry with re-registration
        const retryResult = await handleTerminalError(data, terminalId, executeAddOrder);
        if (retryResult) {
            data = retryResult;
        }

        if (data.errors) {
            const msg = data.errors.map(e => e.message).join(', ');
            console.error('🚨 GraphQL errors adding order:', data.errors);

            // Auto-open terminal ticket and retry once on specific error
            if (/No ticket open on terminal/i.test(msg)) {
                debug('🟨 No ticket open. Creating terminal ticket and retrying addOrder...');
                const created = await createTerminalTicketAsync(terminalId);
                if (created) {
                    const retryData = await executeAddOrder(terminalId);
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
    const inline = `mutation { addOrderToTerminalTicket(terminalId: "${gqlEscape(terminalId)}", productName: "${gqlEscape(productName)}", quantity: ${q}, portion: "${gqlEscape(portion)}") { totalAmount } }`;

    try {
        const response = await fetchWithAuthRetry(resolveGqlUrl(config), (token) => ({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query: inline })
        }));

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
        console.warn('⚠️ No terminal ID found, attempting to register terminal first...');
        // Try to register terminal if not found
        const user = tokenService.getCurrentUser();
        if (user?.name) {
            // Import terminalService dynamically to avoid circular imports
            const { default: terminalService } = await import('./services/terminalService');
            const newTerminalId = await terminalService.ensureTerminalRegistered(user.name);
            if (!newTerminalId) {
                throw new Error('No terminal ID found and registration failed.');
            }
            debug('✅ Terminal registered, retrying getTerminalTicket...');
        } else {
            throw new Error('No terminal ID found and no user available for registration.');
        }
    }

    const currentTerminalId = getCurrentTerminalId();
    if (!currentTerminalId) {
        throw new Error('Terminal registration failed - no terminal ID available.');
    }

    const token = await ensureAuthenticated();
    const config = appconfig();

    // Fetch essential fields; include order 'name' for reliable matching after add
    const inline = `query { getTerminalTicket(terminalId: "${gqlEscape(currentTerminalId)}") { uid number totalAmount remainingAmount orders { uid name productId quantity price portion orderStates } } }`;

    try {
        const response = await fetchWithAuthRetry(resolveGqlUrl(config), (token) => ({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query: inline })
        }));

        const data = await response.json();

        if (data.errors) {
            // Check if it's a "Terminal not found" error - this means our stored terminal ID is stale
            const isTerminalNotFound = data.errors.some(error =>
                error.message?.includes('Terminal not found') ||
                error.innerException?.Message?.includes('Terminal not found')
            );

            if (isTerminalNotFound) {
                console.warn('⚠️ Terminal not found on server (stale terminal ID), re-registering...');

                // Clear the stale terminal ID and try to re-register
                const user = tokenService.getCurrentUser();

                if (user?.name) {
                    // Import terminalService dynamically to avoid circular imports
                    const { default: terminalService } = await import('./services/terminalService');

                    // Clear stale terminal and force re-registration
                    terminalService.clearTerminal(user.name);
                    const newTerminalId = await terminalService.ensureTerminalRegistered(user.name);

                    if (newTerminalId) {
                        console.log('✅ Terminal re-registered successfully, retrying query...');
                        // Wait a moment for SambaPOS to process the terminal registration
                        await new Promise(resolve => setTimeout(resolve, 500));

                        // Retry with new terminal ID
                        const retryInline = `query { getTerminalTicket(terminalId: "${gqlEscape(newTerminalId)}") { uid number totalAmount remainingAmount orders { uid name productId quantity price portion orderStates } } }`;
                        const retryResponse = await fetchWithAuthRetry(resolveGqlUrl(config), (token) => ({
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ query: retryInline })
                        }));

                        const retryData = await retryResponse.json();
                        if (retryData.errors) {
                            console.warn('⚠️ Still getting errors after re-registration, returning null (no active terminal ticket)');
                            debug('Retry errors:', retryData.errors);
                            return null; // No active terminal ticket, which is acceptable
                        }

                        const ticket = retryData.data?.getTerminalTicket;
                        debug('✅ Terminal ticket retrieved after re-registration:', ticket);
                        return ticket;
                    } else {
                        console.warn('⚠️ Terminal re-registration failed, returning null (no active terminal ticket)');
                        return null; // No active terminal ticket
                    }
                } else {
                    console.warn('⚠️ No user available for terminal re-registration, returning null');
                    return null;
                }
            } else {
                // Other GraphQL errors that are not related to terminal not found
                console.error('🚨 GraphQL errors getting terminal ticket:', data.errors);
                throw new Error(`Get terminal ticket failed: ${data.errors.map(e => e.message).join(', ')}`);
            }
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

    const executeClose = async (currentTerminalId) => {
        const inline = `mutation { closeTerminalTicket(terminalId: "${gqlEscape(currentTerminalId)}") }`;

        const response = await fetchWithAuthRetry(resolveGqlUrl(config), (token) => ({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query: inline })
        }));

        return await response.json();
    };

    try {
        // Try with current terminal ID
        let data = await executeClose(terminalId);

        // Check for terminal errors and retry with re-registration
        const retryResult = await handleTerminalError(data, terminalId, executeClose);
        if (retryResult) {
            data = retryResult;
        }

        if (data.errors) {
            const msg = data.errors.map(e => e.message).join(', ');
            console.error('🚨 GraphQL errors closing terminal ticket:', data.errors);
            throw new Error(`Close terminal ticket failed: ${msg}`);
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
// TABLE TICKET FUNCTIONS
// ============================================

export const getTableTickets = async (tableId) => {
    debug('📋 Getting tickets for table:', tableId);

    if (!tableId) {
        throw new Error('Table ID is required');
    }

    const token = await ensureAuthenticated();
    const config = appconfig();

    // Use the same reliable approach as getActiveTickets - get all open tickets and filter by table entity
    const inline = `query { getTickets(isClosed: false) { 
        id uid number totalAmount remainingAmount orderStates
        entities { name type } 
        orders { id uid productId name quantity price portion
            states { stateName state stateValue }
        } 
        states { stateName state }
    } }`;

    try {
        const response = await fetchWithAuthRetry(resolveGqlUrl(config), (token) => ({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query: inline })
        }));

        const data = await response.json();

        if (data.errors) {
            console.error('🚨 GraphQL errors getting tickets:', data.errors);
            throw new Error(`Get tickets failed: ${data.errors.map(e => e.message).join(', ')}`);
        }

        const allTickets = data.data?.getTickets || [];

        // Filter tickets for the specific table (same logic as getTicketForMesa)
        const tableTickets = allTickets.filter(ticket => {
            if (!ticket.entities || ticket.entities.length === 0) return false;

            return ticket.entities.some(entity => {
                // Check both string and number formats
                const entityName = entity.name;
                return entityName === String(tableId) ||
                    entityName === `Mesa ${tableId}` ||
                    entityName === String(tableId).padStart(2, '0') ||
                    (entity.type === 'Table' && entityName.includes(String(tableId)));
            });
        });

        debug(`✅ Table tickets retrieved: ${tableTickets.length} tickets for table ${tableId}`, tableTickets);
        return tableTickets;

    } catch (error) {
        debug('❌ Failed to get table tickets:', error);
        throw error;
    }
};

export const loadTerminalTicketById = async (terminalId, ticketId) => {
    debug('🔄 Loading terminal ticket by ID:', { terminalId, ticketId });

    if (!terminalId || !ticketId) {
        throw new Error('Terminal ID and Ticket ID are required');
    }

    const token = await ensureAuthenticated();
    const config = appconfig();

    const inline = `mutation { loadTerminalTicket(terminalId: "${gqlEscape(terminalId)}", ticketId: "${ticketId}") { 
        id number totalAmount remainingAmount 
        date tags { tagName tag } 
        payments { name amount } 
        calculations { name calculationAmount } 
        states { stateName state } 
        entities { name type }
        orders { uid productId quantity price portion states { stateName state stateValue } } 
    } }`;

    try {
        const response = await fetchWithAuthRetry(resolveGqlUrl(config), (token) => ({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query: inline })
        }));

        const data = await response.json();

        if (data.errors) {
            console.error('🚨 GraphQL errors loading terminal ticket:', data.errors);
            throw new Error(`Load terminal ticket failed: ${data.errors.map(e => e.message).join(', ')}`);
        }

        const ticket = data.data?.loadTerminalTicket;
        debug('✅ Terminal ticket loaded by ID:', ticket);
        return ticket;

    } catch (error) {
        debug('❌ Failed to load terminal ticket by ID:', error);
        throw error;
    }
};

export const loadTerminalTicketForTable = async (terminalId, tableId) => {
    debug('🔄 Loading terminal ticket for table:', { terminalId, tableId });

    if (!terminalId || !tableId) {
        throw new Error('Terminal ID and Table ID are required');
    }

    const token = await ensureAuthenticated();
    const config = appconfig();

    const inline = `mutation { loadTerminalTicket(terminalId: "${gqlEscape(terminalId)}", tableId: ${parseInt(tableId)}) { 
        id number total tableId orderStates 
        terminal { id name } 
        orders { id quantity price productName productId productCode 
            modifiers { id name price } 
        } 
    } }`;

    try {
        const response = await fetchWithAuthRetry(resolveGqlUrl(config), (token) => ({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query: inline })
        }));

        const data = await response.json();

        if (data.errors) {
            console.error('🚨 GraphQL errors loading terminal ticket:', data.errors);
            throw new Error(`Load terminal ticket failed: ${data.errors.map(e => e.message).join(', ')}`);
        }

        const ticket = data.data?.loadTerminalTicket;
        debug('✅ Terminal ticket loaded:', ticket);
        return ticket;

    } catch (error) {
        debug('❌ Failed to load terminal ticket:', error);
        throw error;
    }
};

export const ensureTicketForTable = async (tableId) => {
    debug('🎯 Ensuring ticket for table using correct SambaPOS flow:', tableId);

    if (!tableId) {
        throw new Error('Table ID is required');
    }

    // Define the main operation
    const performEnsureTicket = async (terminalId) => {
        // Step 1: Check if there are existing closed tickets for this table
        debug('🔍 Checking for existing tickets on table:', tableId);
        const existingTickets = await getTableTickets(tableId);

        // Look for closed tickets with products
        const closedTicketsWithProducts = existingTickets.filter(ticket => {
            const hasProducts = ticket.orders && ticket.orders.length > 0;
            const hasValidStatus = ticket.orderStates && ticket.orderStates !== '{}';
            return hasProducts || hasValidStatus;
        });

        if (closedTicketsWithProducts.length > 0) {
            // FLOW FOR EXISTING TICKET: Load the most recent closed ticket
            const latestTicket = closedTicketsWithProducts.sort((a, b) => b.id - a.id)[0];
            debug('📦 Found existing ticket, loading:', latestTicket.id);

            // Use loadTerminalTicket(terminalId, ticketId) as per your documentation
            const loadedTicket = await loadTerminalTicketById(terminalId, String(latestTicket.id));
            return { ticket: loadedTicket };

        } else {
            // FLOW FOR NEW TICKET: Follow the complete creation process
            debug('✨ No existing tickets found, creating new ticket with complete flow');

            // Step 1: Create terminal ticket (without tableId as per your documentation)
            const newTicket = await createTerminalTicketAsync(terminalId);
            debug('✅ Step 1 - Terminal ticket created:', newTicket);

            // Step 2: Assign table to the ticket using changeEntityOfTerminalTicket
            await changeEntityOfTerminalTicketAsync(terminalId, tableId);
            debug('✅ Step 2 - Table assigned to ticket');

            // Step 3: Get the current ticket to return the updated data
            const currentTicket = await getTerminalTicket();
            debug('✅ Step 3 - Retrieved updated ticket:', currentTicket);

            return { ticket: currentTicket };
        }
    };

    // Execute with terminal error handling
    return await handleTerminalError(performEnsureTicket, 'ensureTicketForTable');
};// Helper function to determine order status (moved from POSViewMobile.jsx)
function determineOrderStatus(orderStatesJson) {
    if (!orderStatesJson) return 'NUEVO';

    try {
        // Parse the JSON string
        const parsed = typeof orderStatesJson === 'string' ? JSON.parse(orderStatesJson) : orderStatesJson;

        // Handle the format {"S":"Submitted"} or similar
        if (parsed && typeof parsed === 'object') {
            const stateValues = Object.values(parsed);
            if (stateValues.length > 0) {
                const status = stateValues[0];
                // Map SambaPOS states to our display states
                switch (status?.toLowerCase()) {
                    case 'submitted': return 'ENVIADO';
                    case 'preparing': return 'PREPARANDO';
                    case 'ready': return 'LISTO';
                    case 'served': return 'SERVIDO';
                    case 'cancelled': return 'CANCELADO';
                    default: return status || 'NUEVO';
                }
            }
        }
    } catch (e) {
        debug('❌ Error parsing order states:', e);
    }

    return 'NUEVO';
}

export const createTerminalTicketForTable = async (terminalId, tableId) => {
    debug('➕ Creating terminal ticket for table:', { terminalId, tableId });

    if (!terminalId || !tableId) {
        throw new Error('Terminal ID and Table ID are required');
    }

    const token = await ensureAuthenticated();
    const config = appconfig();

    const inline = `mutation { createTerminalTicket(terminalId: "${gqlEscape(terminalId)}", tableId: ${parseInt(tableId)}) { 
        id number total tableId orderStates 
        terminal { id name } 
        orders { id quantity price productName productId productCode 
            modifiers { id name price } 
        } 
    } }`;

    try {
        const response = await fetchWithAuthRetry(resolveGqlUrl(config), (token) => ({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query: inline })
        }));

        const data = await response.json();

        if (data.errors) {
            console.error('🚨 GraphQL errors creating terminal ticket:', data.errors);
            throw new Error(`Create terminal ticket failed: ${data.errors.map(e => e.message).join(', ')}`);
        }

        const ticket = data.data?.createTerminalTicket;
        debug('✅ Terminal ticket created:', ticket);
        return ticket;

    } catch (error) {
        debug('❌ Failed to create terminal ticket:', error);
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
            const response = await fetchWithAuthRetry(resolveGqlUrl(config), (token) => ({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ query, variables })
            }));

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
    // Enhanced debugging for terminal ID issue
    console.log('🔍 createTerminalTicketAsync called with:', {
        terminalId,
        hasTerminalId: !!terminalId,
        terminalIdType: typeof terminalId,
        terminalIdLength: terminalId?.length
    });

    if (!terminalId) {
        console.error('🚨 CRITICAL: No terminalId provided to createTerminalTicketAsync');
        throw new Error('Terminal ID is required but was not provided');
    }

    // Define the main operation
    const performCreateTicket = async (currentTerminalId) => {
        const token = await ensureAuthenticated();
        const cfg = appconfig();
        const gqlUrl = resolveGqlUrl(cfg);
        const inline = `mutation { createTerminalTicket(terminalId: "${gqlEscape(currentTerminalId)}") { id uid type remainingAmount totalAmount } }`;

        console.log('🔍 GraphQL mutation generated:', inline);

        const response = await fetchWithAuthRetry(gqlUrl, (token) => ({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query: inline })
        }));

        const data = await response.json();

        console.log('🔍 GraphQL response received:', {
            httpStatus: response.status,
            hasData: !!data.data,
            hasErrors: !!data.errors,
            dataKeys: data.data ? Object.keys(data.data) : null,
            errorCount: data.errors?.length || 0
        });

        if (data.errors) {
            console.error('🚨 GraphQL Errors in createTerminalTicket:', data.errors);

            // Log ALL errors with full details first
            console.error('🔍 COMPLETE ERROR DETAILS:');
            data.errors.forEach((error, index) => {
                console.error(`Error ${index + 1}:`, {
                    message: error.message,
                    locations: error.locations,
                    path: error.path,
                    extensions: error.extensions,
                    fullError: error
                });
            });

            // Enhanced error logging for terminal-specific issues
            const terminalErrors = data.errors.filter(e =>
                e.message.includes('terminal') || e.message.includes('Terminal')
            );

            if (terminalErrors.length > 0) {
                console.error('🚨 TERMINAL-SPECIFIC ERRORS:', terminalErrors);
                console.error('🔍 Terminal context for debugging:', {
                    terminalId: currentTerminalId,
                    hasValidToken: !!token,
                    endpoint: gqlUrl,
                    mutation: inline
                });

                // Log the complete error details
                terminalErrors.forEach((error, index) => {
                    console.error(`🚨 Error ${index + 1} Details:`, {
                        message: error.message,
                        locations: error.locations,
                        path: error.path,
                        extensions: error.extensions
                    });
                });
            }

            // For other non-terminal errors, throw the original error
            throw new Error(`Create terminal ticket failed: ${data.errors.map(e => e.message).join(', ')}`);
        }

        const result = data.data?.createTerminalTicket;
        console.log('✅ createTerminalTicket result:', result);

        return result;
    };

    // Execute with terminal error handling
    return await handleTerminalError(performCreateTicket, 'createTerminalTicketAsync');
};

export const getTerminalTicketsForTable = async (terminalId, tableName) => {
    const token = await ensureAuthenticated();
    const query = getGetTerminalTicketsScript(terminalId);

    const response = await fetchWithAuthRetry(resolveGqlUrl(appconfig()), (token) => ({
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query })
    }));

    const data = await response.json();
    return data.data?.getTerminalTickets || [];
};

export const loadTerminalTicketWithOrders = async (terminalId, ticketId) => {
    const token = await ensureAuthenticated();

    const executeQuery = async (currentTerminalId) => {
        const query = getLoadTerminalTicketScript(currentTerminalId, ticketId);
        const response = await fetchWithAuthRetry(resolveGqlUrl(appconfig()), (token) => ({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query })
        }));

        const data = await response.json();
        return data;
    };

    // Try with current terminal ID
    let data = await executeQuery(terminalId);

    // Check for terminal errors and retry with re-registration
    const retryResult = await handleTerminalError(data, terminalId, executeQuery);
    if (retryResult) {
        data = retryResult;
    }

    // If still has errors, throw
    if (data.errors) {
        console.error('❌ loadTerminalTicketWithOrders failed:', data.errors);
        throw new Error(`Load terminal ticket failed: ${data.errors.map(e => e.message).join(', ')}`);
    }

    return data.data?.loadTerminalTicket;
};

export const changeEntityOfTerminalTicketAsync = async (terminalId, tableName) => {
    // Input validation
    if (!terminalId) {
        throw new Error('changeEntityOfTerminalTicketAsync requires terminalId');
    }
    if (!tableName && tableName !== 0) {
        throw new Error('changeEntityOfTerminalTicketAsync requires tableName');
    }

    // Define the main operation
    const performChangeEntity = async (currentTerminalId) => {
        const token = await ensureAuthenticated();
        const cfg = appconfig();
        const type = cfg.entityTypeName;

        const exec = async (query) => {
            const res = await fetchWithAuthRetry(resolveGqlUrl(cfg), (token) => ({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ query })
            }));
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

        // Build inline variants
        const inlineTypeName = `mutation { changeEntityOfTerminalTicket(terminalId: "${gqlEscape(currentTerminalId)}", type: "${gqlEscape(type)}", name: "${gqlEscape(tableName)}") { id entities { name type } } }`;
        const inlineEntity = `mutation { changeEntityOfTerminalTicket(terminalId: "${gqlEscape(currentTerminalId)}", entity: "${gqlEscape(tableName)}") { id entities { name type } } }`;

        // Handle no ticket open: open ticket and retry once with same query
        const handleNoTicketOpen = async (query) => {
            console.log('🎫 No ticket open on terminal, creating new ticket...');
            const openInline = `mutation { createTerminalTicket(terminalId: "${gqlEscape(currentTerminalId)}") { id } }`;
            const openJson = await exec(openInline);
            if (!openJson.errors) {
                console.log('✅ New ticket created, retrying changeEntity...');
                const retry = await exec(query);
                if (!retry.errors) return retry;
                throw new Error(retry.errors.map(e => e.message).join(', '));
            }
            throw new Error(openJson.errors.map(e => e.message).join(', '));
        };

        // Try type/name first (Discovery)
        let data = await exec(inlineTypeName);

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

    // Execute with terminal error handling
    return await handleTerminalError(performChangeEntity, 'changeEntityOfTerminalTicketAsync');
};

// ============================================
// AUTOMATION COMMANDS
// ============================================
export const executeAutomationCommandForTerminalTicketAsync = async (terminalId, name, value = '', orderUid = null) => {
    const token = await ensureAuthenticated();
    const cfg = appconfig();
    const args = [
        `terminalId: "${gqlEscape(terminalId)}"`,
        `name: "${gqlEscape(name)}"`,
        `value: "${gqlEscape(value)}"`
    ];
    if (orderUid) args.push(`orderUid: "${gqlEscape(orderUid)}"`);
    const inline = `mutation { executeAutomationCommandForTerminalTicket(${args.join(', ')}) { id } }`;

    const response = await fetchWithAuthRetry(resolveGqlUrl(cfg), (token) => ({
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: inline })
    }));

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

    const response = await fetchWithAuthRetry(resolveGqlUrl(cfg), (token) => ({
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: inline })
    }));

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
    const resp = await fetchWithAuthRetry(resolveGqlUrl(cfg), (token) => ({
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: getQuery })
    }));
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

    const response = await fetchWithAuthRetry(resolveGqlUrl(cfg), (token) => ({
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: inline })
    }));
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

    const response = await fetchWithAuthRetry(resolveGqlUrl(config), (token) => ({
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query })
    }));

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

    const response = await fetchWithAuthRetry(resolveGqlUrl(config), (token) => ({
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: mutation, variables: { terminalId, paymentTypeName, amount: amt } })
    }));

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

    const response = await fetchWithAuthRetry(resolveGqlUrl(config), (token) => ({
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query, variables: { terminalId, calculationName, amount: amt } })
    }));

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

    const response = await fetchWithAuthRetry(resolveGqlUrl(config), (token) => ({
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query, variables: vars })
    }));

    const data = await response.json();
    if (data.errors) {
        throw new Error(data.errors.map(e => e.message).join(', '));
    }
    return data.data?.updateOrderOfTerminalTicket;
};

// Convenience wrapper to apply order tag(s) to an existing order on the terminal ticket
// tags: array of { tagName, tag, price?, quantity?, rate? }
export const applyOrderTagsToTerminalTicketAsync = async (terminalId, orderUid, tags = []) => {
    if (!terminalId) throw new Error('terminalId is required');
    if (!orderUid) throw new Error('orderUid is required');
    if (!Array.isArray(tags)) throw new Error('tags must be an array');

    const token = await ensureAuthenticated();
    const cfg = appconfig();

    // Build inline mutation (SambaPOS tends to be more reliable with inline args)
    const tagsArg = tags.map(t => {
        const name = gqlEscape(String(t.tagName ?? t.name ?? ''));
        const val = gqlEscape(String(t.tag ?? t.value ?? ''));
        const extras = [];
        if (t.price != null) extras.push(`price:${parseFloat(t.price)}`);
        if (t.quantity != null) extras.push(`quantity:${parseFloat(t.quantity)}`);
        if (t.rate != null) extras.push(`rate:${parseFloat(t.rate)}`);
        const extrasStr = extras.length ? `,${extras.join(',')}` : '';
        return `{tagName:"${name}",tag:"${val}"${extrasStr}}`;
    }).join(',');

    const inline = `mutation { updateOrderOfTerminalTicket(terminalId:"${gqlEscape(terminalId)}", orderUid:"${gqlEscape(orderUid)}", orderTags:[${tagsArg}]) { id totalAmount remainingAmount orders { uid tags { tagName tag } } } }`;

    const resp = await fetch(resolveGqlUrl(cfg), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: inline })
    });
    const data = await resp.json();
    if (data.errors) throw new Error(data.errors.map(e => e.message).join(', '));

    // Refresh ticket data after update
    await postTicketRefresh();

    return data.data?.updateOrderOfTerminalTicket;
};

export const getPaymentTypesAsync = async () => {
    debug('💳 Fetching payment types');
    const token = await ensureAuthenticated();
    const config = appconfig();
    const query = `query { getPaymentTypes { id name buttonHeader buttonColor processorSettings } }`;
    const resp = await fetchWithAuthRetry(resolveGqlUrl(config), (token) => ({
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query })
    }));
    const data = await resp.json();
    if (data.errors) throw new Error(data.errors.map(e => e.message).join(', '));
    return data.data?.getPaymentTypes || [];
};

export const getCalculationSelectorsAsync = async () => {
    debug('🧮 Fetching calculation selectors');
    const token = await ensureAuthenticated();
    const config = appconfig();
    const query = `query { getCalculationSelectors { name buttonHeader buttonColor } }`;
    const resp = await fetchWithAuthRetry(resolveGqlUrl(config), (token) => ({
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query })
    }));
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
    return `mutation { createTerminalTicket(terminalId: "${gqlEscape(terminalId)}") { id uid type remainingAmount totalAmount } }`;
}

function getGetTerminalTicketsScript(terminalId) {
    return `query { getTerminalTickets(terminalId: "${gqlEscape(terminalId)}") { id number entities { name type } } }`;
}

function getLoadTerminalTicketScript(terminalId, ticketId) {
    return `mutation { loadTerminalTicket(terminalId: "${gqlEscape(terminalId)}", ticketId: "${gqlEscape(ticketId)}") { id uid } }`;
}

function getClearTerminalTicketScript(terminalId) {
    return `mutation { clearTerminalTicketOrders(terminalId: "${gqlEscape(terminalId)}") { id } }`;
}

function getCloseTerminalTicketScript(terminalId) {
    return `mutation { closeTerminalTicket(terminalId: "${gqlEscape(terminalId)}") { id isClosed ticketNumber } }`;
}

function getAddOrderToTerminalTicketScript(terminalId, productId, orderTags) {
    return `mutation { addOrderToTerminalTicket(terminalId: "${gqlEscape(terminalId)}", productId: ${productId}, quantity: 1, orderTags: "${gqlEscape(orderTags)}") { id menuItemName quantity price } }`;
}

function getChangeEntityOfTerminalTicketScript(terminalId, entityName) {
    const config = appconfig();
    return `mutation { 
        changeEntityOfTerminalTicket(
            terminalId: "${gqlEscape(terminalId)}",
            type: "${gqlEscape(config.entityTypeName)}",
            name: "${gqlEscape(entityName)}"
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

    const response = await fetchWithAuthRetry(resolveGqlUrl(config), (token) => ({
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query })
    }));

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

// Cache y throttling para getAllOpenTickets para evitar consultas excesivas
let _lastTicketsCall = 0;
let _cachedTicketsResult = null;
const TICKETS_CACHE_TTL = 8000; // 8 segundos de cache interno
const MIN_CALL_INTERVAL = 3000; // Mínimo 3 segundos entre llamadas

/**
 * Gets ALL open tickets from any user - Used for mesa occupancy detection
 * This is the "source of truth" for which mesas are occupied
 * Now includes intelligent throttling and caching to prevent server overload
 */
export const getAllOpenTickets = async () => {
    const now = Date.now();

    // Throttling: Si la última llamada fue hace menos de 3 segundos, usar cache
    if (now - _lastTicketsCall < MIN_CALL_INTERVAL && _cachedTicketsResult !== null) {
        debug('🚫 Throttling rapid refresh calls');
        return _cachedTicketsResult;
    }

    // Cache: Si tenemos datos frescos (menos de 8 segundos), usarlos
    if (_cachedTicketsResult !== null && now - _lastTicketsCall < TICKETS_CACHE_TTL) {
        debug('📦 Using cached tickets data');
        return _cachedTicketsResult;
    }

    debug('🌍 Getting all open tickets for mesa occupancy...');
    _lastTicketsCall = now;
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
            } catch (_) { }
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
        _cachedTicketsResult = parsed; // Cache el resultado
        return parsed;
    } catch (err) {
        if (!allowGqlFallback) {
            debug('❌ getAllOpenTickets SQL failed and GraphQL fallback disabled:', err.message);
            _cachedTicketsResult = []; // Cache resultado vacío
            return [];
        }
        const token = await ensureAuthenticated();
        const config = appconfig();
        const query = `query GetAllOpenTickets { getTickets(isClosed: false) { id date lastUpdateDate entities { name type } states { stateName state } } }`;
        try {
            const response = await fetchWithAuthRetry(resolveGqlUrl(config), (token) => ({ method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ query }) }));
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

// Cache for isTicketPaid results to prevent excessive database calls
const ticketPaidCache = new Map();
const CACHE_EXPIRY_MS = 2000; // 2 seconds cache

// Performance tracking
let totalCalls = 0;
let cacheHits = 0;

// Simple debounce implementation for getMesaStatus calls
const debounceMap = new Map();
const debounce = (func, delay, key) => {
    const timeout = debounceMap.get(key);
    if (timeout) {
        clearTimeout(timeout);
    }

    return new Promise((resolve) => {
        const newTimeout = setTimeout(() => {
            debounceMap.delete(key);
            resolve(func());
        }, delay);
        debounceMap.set(key, newTimeout);
    });
};

// Function to clear the cache (useful for testing or memory management)
export const clearTicketPaidCache = () => {
    const hitRate = totalCalls > 0 ? (cacheHits / totalCalls * 100).toFixed(1) : 0;
    console.log(`🧹 Ticket paid cache cleared. Stats: ${totalCalls} calls, ${cacheHits} hits (${hitRate}% hit rate)`);
    ticketPaidCache.clear();
    totalCalls = 0;
    cacheHits = 0;
};

// Global helper to handle terminal re-registration for any GraphQL error
// Helper function for unified terminal error handling
const handleTerminalError = async (operationOrData, terminalIdOrFunctionName, retryFunction) => {
    // NEW PATTERN: handleTerminalError(performFunction, 'functionName')
    if (typeof operationOrData === 'function') {
        const performOperation = operationOrData;
        const functionName = terminalIdOrFunctionName;

        // Get current terminal ID
        const { default: terminalService } = await import('./services/terminalService');
        let terminalId = terminalService.getTerminalId();

        if (!terminalId) {
            const user = tokenService.getCurrentUser();
            if (user?.name) {
                terminalId = await terminalService.ensureTerminalRegistered(user.name);
            }
            if (!terminalId) {
                throw new Error('No terminal ID available');
            }
        }

        try {
            // Execute the operation with current terminal ID
            return await performOperation(terminalId);
        } catch (error) {
            // Check if it's a terminal-related error
            const errorMessage = error.message || '';
            const isTerminalError = errorMessage.includes('Terminal not found') ||
                errorMessage.includes('trying to resolve') ||
                errorMessage.includes('400');

            if (isTerminalError) {
                console.warn(`⚠️ Terminal error in ${functionName}, attempting re-registration...`, {
                    terminalId,
                    error: errorMessage
                });

                const user = tokenService.getCurrentUser();
                if (user?.name) {
                    // Clear stale terminal and force re-registration
                    terminalService.clearTerminal(user.name);
                    const newTerminalId = await terminalService.ensureTerminalRegistered(user.name);

                    if (newTerminalId && newTerminalId !== terminalId) {
                        console.log(`✅ Terminal re-registered for ${functionName}, retrying with new terminal ID:`, newTerminalId);
                        // Wait a moment for SambaPOS to process the terminal registration
                        await new Promise(resolve => setTimeout(resolve, 500));

                        // Retry the operation with new terminal ID
                        return await performOperation(newTerminalId);
                    }
                }
            }

            // Re-throw the original error if not terminal-related or re-registration failed
            throw error;
        }
    }

    // OLD PATTERN: handleTerminalError(data, terminalId, executeFunction) - for backward compatibility
    const data = operationOrData;
    const originalTerminalId = terminalIdOrFunctionName;

    if (!data.errors) return null;

    const isTerminalNotFound = data.errors.some(error =>
        error.message?.includes('Terminal not found') ||
        error.innerException?.Message?.includes('Terminal not found') ||
        error.message?.includes('trying to resolve') // Generic terminal-related errors
    );

    if (isTerminalNotFound) {
        console.warn('⚠️ Terminal error detected, attempting re-registration...', {
            originalTerminalId,
            errors: data.errors.map(e => e.message)
        });

        const user = tokenService.getCurrentUser();
        if (user?.name) {
            // Import terminalService dynamically to avoid circular imports
            const { default: terminalService } = await import('./services/terminalService');

            // Clear stale terminal and force re-registration
            terminalService.clearTerminal(user.name);
            const newTerminalId = await terminalService.ensureTerminalRegistered(user.name);

            if (newTerminalId && newTerminalId !== originalTerminalId) {
                console.log('✅ Terminal re-registered, retrying with new terminal ID:', newTerminalId);
                // Wait a moment for SambaPOS to process the terminal registration
                await new Promise(resolve => setTimeout(resolve, 500));

                // Retry the function with new terminal ID
                return await retryFunction(newTerminalId);
            }
        }
    }

    return null; // Re-registration failed or not applicable
};

// Helper: determine if a ticket is paid/closed with caching
const isTicketPaid = (ticket) => {
    if (!ticket) return false;

    totalCalls++;
    const ticketId = ticket.id || 'unknown';
    const cacheKey = `${ticketId}_${ticket.isClosed}_${JSON.stringify(ticket.states || [])}`;

    // Check cache first
    const cached = ticketPaidCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_EXPIRY_MS) {
        cacheHits++;
        return cached.result;
    }

    // Debug logging reduced to prevent log spam - only every 100th call or when cache stats are interesting
    if (totalCalls % 100 === 0) {
        const hitRate = totalCalls > 0 ? (cacheHits / totalCalls * 100).toFixed(1) : 0;
        console.log(`🔍 isTicketPaid stats: ${totalCalls} calls, ${cacheHits} hits (${hitRate}% hit rate), cache size: ${ticketPaidCache.size}`);
    }

    let result = false;

    // Check explicit closed flag first
    if (ticket.isClosed === true) {
        result = true;
    } else if (Array.isArray(ticket.states)) {
        // Check states for paid/closed status
        result = ticket.states.some(s => {
            const n = (s.stateName || '').toString().toLowerCase();
            const v = (s.state || s.stateValue || '').toString().toLowerCase();

            // Fixed logic: Check for exact paid/closed states, not partial matches
            return (n === 'status' || n === 'estado') && (
                v === 'pagado' ||
                v === 'paid' ||
                v === 'cerrado' ||
                v === 'closed' ||
                v === 'completado' ||
                v === 'completed'
            );
        });
    }

    // Cache the result
    ticketPaidCache.set(cacheKey, {
        result,
        timestamp: Date.now()
    });

    // Clean up old cache entries periodically
    if (ticketPaidCache.size > 1000) {
        const now = Date.now();
        for (const [key, value] of ticketPaidCache.entries()) {
            if (now - value.timestamp > CACHE_EXPIRY_MS * 2) {
                ticketPaidCache.delete(key);
            }
        }
    }

    return result;
};

export const getMesaStatus = (mesaNumber, allTickets) => {
    const mesaStr = String(mesaNumber).trim();

    // First, let's check what tickets we have for debugging
    const ticketsForThisMesa = (allTickets || []).filter(t => {
        const hasEntities = Array.isArray(t.entities);
        return hasEntities && t.entities.some(e => {
            const type = (e.type || '').toString().toLowerCase();
            const name = String(e.name || '').trim();
            const typeMatches = type.includes('mesa');
            const nameMatches = name === mesaStr;
            return typeMatches && nameMatches;
        });
    });

    if (ticketsForThisMesa.length > 0) {
        const firstTicket = ticketsForThisMesa[0];
        console.log(`🔍 DEBUG Mesa ${mesaStr}:`, {
            ticketId: firstTicket.id,
            remainingAmount: firstTicket.remainingAmount,
            isClosed: firstTicket.isClosed,
            states: firstTicket.states,
            isPaidCheck: isTicketPaid(firstTicket)
        });
    }

    // consider only unpaid tickets for mesa
    const ticket = (allTickets || []).find(t => {
        const isUnpaid = !isTicketPaid(t);
        const hasEntities = Array.isArray(t.entities);
        const matchingEntity = hasEntities && t.entities.some(e => {
            const type = (e.type || '').toString().toLowerCase();
            const name = String(e.name || '').trim();
            const typeMatches = type.includes('mesa');
            const nameMatches = name === mesaStr;
            return typeMatches && nameMatches;
        });

        return isUnpaid && matchingEntity;
    });

    console.log('🔍 Found ticket for mesa', mesaStr, ':', ticket?.id || 'none');

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
    // Only consider unpaid tickets for table view operations
    const ticketsForMesa = (allTickets || [])
        .filter(ticket => !isTicketPaid(ticket))
        .filter(ticket =>
            Array.isArray(ticket.entities) && ticket.entities.some(entity => {
                const type = (entity.type || '').toString().toLowerCase();
                const name = String(entity.name || '').trim();
                return type.includes('mesa') && name === mesaStr;
            })
        );

    if (ticketsForMesa.length === 0) return null;

    // Return most recently updated unpaid ticket
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
    const response = await fetchWithAuthRetry(resolveGqlUrl(cfg), (token) => ({
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query })
    }));
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
    const p = {
        name: name || process.env.SAMBAPOS_PRINT_JOB_NAME || 'Imprimir factura CAJA',
        ticketId: typeof ticketId === 'string' ? ticketId : String(ticketId),
        copies: parseInt(copies, 10) || 1,
        terminal: terminal || process.env.SAMBAPOS_TERMINAL || cfg.terminalName,
        department: department || process.env.SAMBAPOS_DEPARTMENT || cfg.departmentName,
        user: user || process.env.SAMBAPOS_USERNAME || cfg.userName
    };

    const inline = `mutation { executePrintJob(name: "${gqlEscape(p.name)}", ticketId: ${p.ticketId}, copies: ${p.copies}, terminal: "${gqlEscape(p.terminal)}", department: "${gqlEscape(p.department)}", user: "${gqlEscape(p.user)}") { name } }`;
    const response = await fetchWithAuthRetry(resolveGqlUrl(cfg), (token) => ({
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: inline })
    }));
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
            number
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
        const response = await fetchWithAuthRetry(resolveGqlUrl(config), (token) => ({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                query,
                variables: { terminalId, ticketId: String(ticketId) }
            })
        }));

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

// Robust wrapper: retry once after re-registering terminal if initial load fails
export const loadTicketToTerminalRobust = async (ticketId) => {
    try {
        return await loadTicketToTerminal(ticketId);
    } catch (err) {
        try {
            await registerTerminalAsync();
            return await loadTicketToTerminal(ticketId);
        } catch (err2) {
            throw err2;
        }
    }
};

/**
 * Smart table assignment: accepts either table name or numeric id.
 * Resolves the proper entity name before invoking changeEntityOfTerminalTicket.
 * Includes a fallback mutation form using `entity:` for legacy servers.
 */
export const changeEntityOfTerminalTicketSmart = async (terminalId, tableRef) => {
    if (!terminalId) throw new Error('Terminal ID is required');
    if (!tableRef && tableRef !== 0) throw new Error('table reference is required');

    // 1) Resolve table name if an ID-like value is provided
    let name = tableRef;
    try {
        const isIdLike = (v) => typeof v === 'number' || (typeof v === 'string' && /^\d+$/.test(v));
        if (isIdLike(tableRef)) {
            const tables = await fetchTables();
            const idNum = typeof tableRef === 'number' ? tableRef : parseInt(String(tableRef), 10);
            const match = (tables || []).find(t => Number(t.id) === idNum) || (tables || []).find(t => String(t.name) === String(tableRef));
            name = match?.name || match?.caption || String(tableRef);
        }
    } catch (_) {
        name = String(tableRef);
    }

    // 2) Primary path: type + name
    try {
        const assigned = await changeEntityOfTerminalTicketAsync(terminalId, name);
        await postTicketRefresh();
        return assigned;
    } catch (primaryErr) {
        // 3) Fallback path: use legacy `entity:` argument inline
        const cfg = appconfig();
        const inlineEntity = `mutation { changeEntityOfTerminalTicket(terminalId: "${gqlEscape(terminalId)}", entity: "${gqlEscape(name)}") { id entities { name type } } }`;
        const response = await fetchWithAuthRetry(resolveGqlUrl(cfg), (token) => ({
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ query: inlineEntity })
        }));
        const data = await response.json();
        if (data.errors) throw new Error(data.errors.map(e => e.message).join(', '));
        const assigned = data.data?.changeEntityOfTerminalTicket;
        await postTicketRefresh();
        return assigned;
    }
};

// Unified add-order helper (discovery-aligned with legacy fallback)
export const addOrderToTerminalTicketUnified = async (terminalId, orderPayload) => {
    const token = await ensureAuthenticated();
    const config = appconfig();
    if (!terminalId) throw new Error('Terminal ID is required');
    if (!orderPayload || typeof orderPayload !== 'object') throw new Error('order payload is required');

    const productName = orderPayload.productName || orderPayload.name || null;
    const quantity = orderPayload.quantity != null ? parseFloat(orderPayload.quantity) : 1;
    const portion = orderPayload.portion; // only include if provided; defaulting can break when product lacks that portion

    const productId = orderPayload.productId != null ? parseInt(orderPayload.productId, 10) : null;
    const orderTags = orderPayload.orderTags != null ? String(orderPayload.orderTags) : '';

    let inline;
    if (productName) {
        const portionArg = portion ? `, portion: "${gqlEscape(portion)}"` : '';
        inline = `mutation { addOrderToTerminalTicket(terminalId: "${gqlEscape(terminalId)}", productName: "${gqlEscape(productName)}", quantity: ${quantity}${portionArg}) { totalAmount remainingAmount } }`;
    } else if (productId != null) {
        inline = `mutation { addOrderToTerminalTicket(terminalId: "${gqlEscape(terminalId)}", productId: ${productId}, quantity: ${quantity}, orderTags: "${gqlEscape(orderTags)}") { totalAmount remainingAmount } }`;
    } else {
        throw new Error('order payload must include productName or productId');
    }

    const response = await fetchWithAuthRetry(resolveGqlUrl(config), (token) => ({
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: inline })
    }));

    const data = await response.json();
    if (data.errors) {
        throw new Error(data.errors.map(e => e.message).join(', '));
    }
    const result = data.data?.addOrderToTerminalTicket;
    // Notify SambaPOS to refresh listeners
    await postTicketRefresh();
    return result;
};


// Normalized close-ticket helper: returns { success, errorMessage? }
export const closeTerminalTicketNormalized = async () => {
    const token = await ensureAuthenticated();
    const config = appconfig();
    const terminalId = getCurrentTerminalId();
    if (!terminalId) throw new Error('No terminal ID found');

    const inline = `mutation { errorMessage: closeTerminalTicket(terminalId: "${gqlEscape(terminalId)}") }`;

    const response = await fetchWithAuthRetry(resolveGqlUrl(config), (token) => ({
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: inline })
    }));

    const data = await response.json();
    if (data.errors) {
        const errMsg = data.errors.map(e => e.message).join(', ');
        return { success: false, errorMessage: errMsg };
    }
    const msg = data.data?.errorMessage || null;
    const res = { success: !msg, errorMessage: msg };
    await postTicketRefresh();
    return res;
};

// Notify SambaPOS clients (GraphQL broadcast) to refresh ticket/table status
export const postTicketRefresh = async () => {
    try {
        const token = await ensureAuthenticated();
        const cfg = appconfig();
        const inline = 'mutation { postTicketRefreshMessage(id:0){id} }';
        await fetchWithAuthRetry(resolveGqlUrl(cfg), (token) => ({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query: inline })
        }));
    } catch (_) { /* ignore */ }
};

// Re-export aliases to keep component imports working without duplication


// DEPRECATED: Use dataManager.getActiveTickets() instead
export const findTicketByTableAlternative = async (tableName) => {
    debug('⚠️ DEPRECATED: Use dataManager.getActiveTickets() instead');
    // Return null to force migration to new system
    return null;
};

// ======================================================
// Robust flow: register -> load ticket -> add orders -> close
// Mirrors the manual steps provided for modifying an existing ticket
// ======================================================
export const modifyExistingTicketFlow = async ({
    user = 'CAJERO',
    ticketType = 'COMEDOR',
    terminal = 'SERVIDOR',
    department = 'MESAS',
    ticketId,
    orders = []
}) => {
    if (!ticketId) throw new Error('ticketId is required');

    const cfg = appconfig();
    const gqlUrl = resolveGqlUrl(cfg);

    const run = async () => {
        // 1) Register terminal (inline, no variables) – tolerant to 500
        const regInline = `mutation { registerTerminal(ticketType: "${gqlEscape(ticketType)}", terminal: "${gqlEscape(terminal)}", department: "${gqlEscape(department)}", user: "${gqlEscape(user)}") }`;
        const regResp = await fetchWithAuthRetry(gqlUrl, (token) => ({
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ query: regInline })
        }));
        // Ignore non-OK only for 5xx once – we’ll still try to proceed
        if (!regResp.ok && regResp.status < 500) {
            const txt = await regResp.text();
            throw new Error(`registerTerminal failed: ${regResp.status} ${txt}`);
        }

        // Track terminal id through terminalService
        const { default: terminalService } = await import('./services/terminalService');
        const activeUser = tokenService.getCurrentUser()?.name || user;
        const terminalId = await terminalService.ensureTerminalRegistered(activeUser);
        if (!terminalId) throw new Error('No terminal ID available after registerTerminal');

        // 2) Load ticket into terminal
        const loadInline = `mutation { loadTerminalTicket(terminalId: "${gqlEscape(terminalId)}", ticketId: "${gqlEscape(String(ticketId))}") { id uid number } }`;
        const loadResp = await fetchWithAuthRetry(gqlUrl, (token) => ({
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ query: loadInline })
        }));
        const loadJson = await loadResp.json();
        if (loadJson.errors) throw new Error(loadJson.errors.map(e => e.message).join(', '));

        // Tiny delay to ensure terminal context
        await new Promise(r => setTimeout(r, 200));

        // 3) Add orders sequentially
        for (const o of orders) {
            const pn = o.productName || o.name;
            const pq = parseInt(o.quantity || 1, 10);
            const pp = o.portion || 'Normal';
            const addInline = `mutation { addOrderToTerminalTicket(terminalId: "${gqlEscape(terminalId)}", productName: "${gqlEscape(pn)}", quantity: ${pq}, portion: "${gqlEscape(pp)}") { totalAmount remainingAmount } }`;
            const addResp = await fetchWithAuthRetry(gqlUrl, (token) => ({
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ query: addInline })
            }));
            const addJson = await addResp.json();
            if (addJson.errors) {
                // If terminal error, try once to re-register and retry this one order
                const msg = addJson.errors.map(e => e.message).join(', ');
                if (/Terminal not found/i.test(msg)) {
                    terminalService.clearTerminal(activeUser);
                    const newId = await terminalService.ensureTerminalRegistered(activeUser);
                    if (!newId) throw new Error('Re-registration failed during add order');
                    const retryInline = `mutation { addOrderToTerminalTicket(terminalId: "${gqlEscape(newId)}", productName: "${gqlEscape(pn)}", quantity: ${pq}, portion: "${gqlEscape(pp)}") { totalAmount remainingAmount } }`;
                    const retryResp = await fetchWithAuthRetry(gqlUrl, (token) => ({
                        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ query: retryInline })
                    }));
                    const retryJson = await retryResp.json();
                    if (retryJson.errors) throw new Error(retryJson.errors.map(e => e.message).join(', '));
                } else {
                    throw new Error(`addOrder failed: ${msg}`);
                }
            }
        }

        // 4) Close terminal ticket (idempotent)
        const closeInline = `mutation { closeTerminalTicket(terminalId: "${gqlEscape(terminalId)}") }`;
        const closeResp = await fetchWithAuthRetry(gqlUrl, (token) => ({
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ query: closeInline })
        }));
        const closeJson = await closeResp.json();
        if (closeJson.errors) throw new Error(closeJson.errors.map(e => e.message).join(', '));

        // Notify listeners to refresh
        try { await postTicketRefresh(); } catch { }

        return { success: true };
    };

    // Run via generic terminal error handler for extra safety
    return await handleTerminalError(run, 'modifyExistingTicketFlow');
};
