#!/usr/bin/env node
/*
 Close-only smoke: load open ticket for mesa "1" and close it (no forced print).
 Usage:
   node scripts/smoke-mesa1-close.js \
     --base http://localhost:9000 \
     --user graphiql --pass graphiql --client graphiql \
     --terminal SERVIDOR --department MESAS --ticketType COMEDOR \
     --table 1 --entityType Mesas
*/

const args = process.argv.slice(2);
const getArg = (k, d) => { const i = args.indexOf(k); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

const BASE = getArg('--base', 'http://localhost:9000');
const GQL = getArg('--gql', `${BASE}/api/graphql`);
const AUTH = getArg('--auth', `${BASE}/Token`);
const USER = getArg('--user', 'graphiql');
const PASS = getArg('--pass', 'graphiql');
const CLIENT = getArg('--client', 'graphiql');
const TERMINAL = getArg('--terminal', 'SERVIDOR');
const DEPARTMENT = getArg('--department', 'MESAS');
const TICKET_TYPE = getArg('--ticketType', 'COMEDOR');
const TABLE = getArg('--table', '1');
const ENTITY_TYPE = getArg('--entityType', 'Mesas');
const ENTITY_PREFIX = getArg('--entityPrefix', '');

const out = (label, obj) => console.log(`\n== ${label} ==\n`, obj);
const gqlEscape = (s) => String(s).replace(/"/g, '\\"');

async function getToken() {
    const r = await fetch(AUTH, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'password', username: USER, password: PASS, client_id: CLIENT }) });
    const j = await r.json(); if (!j.access_token) throw new Error('No access_token'); return j.access_token;
}

async function gql(query, token) {
    const r = await fetch(GQL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ query }) });
    const j = await r.json(); if (j.errors) throw new Error(j.errors.map(e => e.message).join(', ')); return j.data;
}

async function findOpenTicketIdForTable(token, tableName) {
    const q = 'query { getTickets(isClosed: false) { id entities { name type } } }';
    const d = await gql(q, token); const list = d?.getTickets || [];
    for (const t of list) { if ((t.entities || []).some(e => e.name === tableName || e.name === String(tableName))) return String(t.id); }
    return null;
}

async function main() {
    out('Config', { BASE, GQL, USER, TERMINAL, TABLE, ENTITY_TYPE });
    const token = await getToken(); out('Token OK', token.slice(0, 12) + '...');

    // registerTerminal
    const mReg = `mutation { registerTerminal(ticketType: "${gqlEscape(TICKET_TYPE)}", terminal: "${gqlEscape(TERMINAL)}", department: "${gqlEscape(DEPARTMENT)}", user: "${gqlEscape(USER)}") }`;
    const reg = await gql(mReg, token); const terminalId = reg.registerTerminal;
    if (!terminalId) throw new Error('registerTerminal returned empty terminalId');
    out('registerTerminal -> terminalId', terminalId);

    // find open ticket for table and load
    const entityName = ENTITY_PREFIX ? `${ENTITY_PREFIX}${TABLE}` : TABLE;
    const openId = await findOpenTicketIdForTable(token, entityName);
    if (!openId) throw new Error('No open ticket for table');
    const mLoad = `mutation { loadTerminalTicket(terminalId: "${gqlEscape(terminalId)}", ticketId: "${gqlEscape(openId)}") { id number totalAmount remainingAmount } }`;
    const ld = await gql(mLoad, token); out('loadTerminalTicket', ld.loadTerminalTicket);

    // close -> SambaPOS auto-print if configured
    const mClose = `mutation { closeTerminalTicket(terminalId: "${gqlEscape(terminalId)}") }`;
    const closed = await gql(mClose, token); out('closeTerminalTicket', closed.closeTerminalTicket);

    console.log('\n✅ Smoke OK');
}

main().catch(e => { console.error('\n❌ Smoke FAILED:', e.message || e); process.exit(1); });
