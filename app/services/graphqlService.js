// Unified GraphQL service: single entry-point for all GraphQL connectivity and queries
// Exposes low-level 'gql' executor, helpers, and a few common query wrappers.

import { resolveGqlUrl } from '../utils/gqlEndpoint';
import { appconfig } from '../config';
import requestDeduplicationService from './requestDeduplicationService';
import Debug from 'debug';

const debug = Debug('pmpos:graphql');

// Escape helper (inlined to avoid dependency spread)
export const gqlEscape = (s) => String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');

// Token helper (centralized)
export const getToken = async () => {
    const { tokenService } = await import('./tokenService');
    return await tokenService.getValidAccessToken();
};

// Low-level executor (single place doing fetch + timeout + auth)
export const gql = async (query, tokenOverride) => {
    // Create a cache key based on the query content
    const queryKey = `gql_${btoa(query.substring(0, 100))}_${tokenOverride || 'default'}`;

    return await requestDeduplicationService.execute(
        queryKey,
        async () => {
            const config = appconfig();
            const url = resolveGqlUrl(config);

            debug('📡 GQL query:', (query || '').substring(0, 120) + '…');

            const controller = new AbortController();
            const timeoutMs = 15000;
            const timeout = setTimeout(() => controller.abort(), timeoutMs);

            const token = tokenOverride || await getToken();

            try {
                const r = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ query }),
                    signal: controller.signal
                });

                const j = await r.json();

                if (j.errors) {
                    debug('❌ GraphQL Errors:', j.errors);
                    throw new Error(j.errors.map(e => e.message).join(', '));
                }
                debug('✅ GraphQL OK');
                return j.data;
            } catch (err) {
                if (err?.name === 'AbortError') {
                    throw new Error('GraphQL request timed out');
                }
                throw err;
            } finally {
                clearTimeout(timeout);
            }
        },
        1500 // Minimum 1.5 seconds between identical GraphQL requests
    );
};

// Backwards-compat alias
export const graphqlSimple = gql;

// Helper: convert $variables to inline values and execute
export const graphqlRequest = async (queryWithVariables, variables = {}) => {
    debug('📝 Original query template:', queryWithVariables);
    debug('📝 Variables provided:', variables);

    // If no variables, run original query
    if (!variables || Object.keys(variables).length === 0) {
        return await gql(queryWithVariables);
    }

    // Remove top-level operation variable definitions before inlining
    // Supports: `query ($x: String)` or `mutation Op($x:Int)`
    let query = queryWithVariables.replace(
        /^\s*(query|mutation)\s*[A-Za-z0-9_]*\s*\([^)]*\)\s*\{/,
        (_, op) => `${op} {`
    );

    // Inline variables
    Object.entries(variables).forEach(([key, value]) => {
        let replacement;
        if (typeof value === 'string') replacement = `"${gqlEscape(value)}"`;
        else if (typeof value === 'number') replacement = String(value);
        else if (typeof value === 'boolean') replacement = value ? 'true' : 'false';
        else if (value === null || value === undefined) replacement = 'null';
        else replacement = `"${gqlEscape(String(value))}"`;
        query = query.replace(new RegExp(`\\$${key}\\b`, 'g'), replacement);
        debug(`🔄 Replaced $${key} with ${replacement}`);
    });

    debug('📤 Final query to send:', query);
    return await gql(query);
};

// Contract:
// - All functions return raw data as provided by SambaPOS GraphQL
// - Any error throws with a concise message

export async function getUserByPin(pin) {
    const q = `query { getUser(pin: "${gqlEscape(pin)}") { name } }`;
    const d = await gql(q);
    return d?.getUser || null;
}

export async function getEntityScreenItems(name) {
    const q = `query { getEntityScreenItems(name: "${gqlEscape(name)}") { id name caption color labelColor } }`;
    const d = await gql(q);
    return d?.getEntityScreenItems || [];
}

export async function getOpenTickets() {
    const q = `query { getTickets(isClosed: false, orderBy: date) {
        id number totalAmount remainingAmount
        entities { type name }
        orders { id menuItemName quantity price }
        states { stateName state }
    } }`;
    const d = await gql(q);
    return d?.getTickets || [];
}

export async function getProducts() {
    const q = `query { getProducts { id name groupCode barcode portions { id name price } tags { name value } } }`;
    const d = await gql(q);
    return d?.getProducts || [];
}

export async function getMenu(name = 'MENU') {
    const q = `query { getMenu(name: "${gqlEscape(name)}") {
        categories { name menuItems { name product { id name portions { name price } } } }
    } }`;
    const d = await gql(q);
    return d?.getMenu || null;
}

export default {
    gql,
    graphqlSimple,
    gqlEscape,
    getToken,
    graphqlRequest,
    getUserByPin,
    getEntityScreenItems,
    getOpenTickets,
    getProducts,
    getMenu
};
