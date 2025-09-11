#!/usr/bin/env node
/*
 Smoke test: mesa ocupada (default table "1").
 Flow: get token -> registerTerminal -> find ticket by loading latest for table -> loadTerminalTicket -> add order -> get ticket

 Usage:
   node scripts/smoke-mesa1-add-order.js \
     --base http://localhost:9000 \
     --user graphiql --pass graphiql --client graphiql \
     --terminal SERVIDOR --department MESAS --ticketType COMEDOR \
     --table 1 --entityType Mesa --entityPrefix "" \
     --product "CERVEZA" --portion "Normal" --qty 1
*/

const args = process.argv.slice(2);
const getArg = (k, d) => {
    const i = args.indexOf(k);
    return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

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
const ENTITY_TYPE = getArg('--entityType', '');
const ENTITY_PREFIX = getArg('--entityPrefix', '');
const PRODUCT = getArg('--product', '');
const PORTION = getArg('--portion', 'Normal');
const QTY = parseInt(getArg('--qty', '1'), 10) || 1;
const DO_CLOSE = ['true', '1', 'yes', 'y'].includes(String(getArg('--close', 'false')).toLowerCase());
const DO_PRINT = ['true', '1', 'yes', 'y'].includes(String(getArg('--print', 'false')).toLowerCase());
const PRINT_JOB = getArg('--printJob', 'Imprimir factura CAJA');
const COPIES = parseInt(getArg('--copies', '1'), 10) || 1;

const out = (label, obj) => console.log(`\n== ${label} ==\n`, obj);
const gqlEscape = (s) => String(s).replace(/"/g, '\\"');

async function getToken() {
    const res = await fetch(AUTH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'password', username: USER, password: PASS, client_id: CLIENT })
    });
    const data = await res.json();
    if (!data.access_token) throw new Error('No access_token');
    return data.access_token;
}

async function gql(query, token) {
    const r = await fetch(GQL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ query }) });
    const j = await r.json();
    if (j.errors) throw new Error(j.errors.map(e => e.message).join(', '));
    return j.data;
}

async function tryCloseAndPrint(terminalId, token, ticketId) {
    if (DO_CLOSE) {
        const mClose = `mutation { closeTerminalTicket(terminalId: "${gqlEscape(terminalId)}") }`;
        const closed = await gql(mClose, token);
        out('closeTerminalTicket', closed.closeTerminalTicket);
    }
    if (DO_PRINT) {
        // If we closed, reuse the known ticketId; otherwise, re-query to ensure we have id
        const id = ticketId;
        if (!id) return out('print skipped', 'no ticket id');
        const mPrint = `mutation { executePrintJob(name: "${gqlEscape(PRINT_JOB)}", ticketId: ${id}, copies: ${COPIES}, terminal: "${gqlEscape(TERMINAL)}", department: "${gqlEscape(DEPARTMENT)}", user: "${gqlEscape(USER)}") { name } }`;
        const pr = await gql(mPrint, token);
        out('executePrintJob', pr.executePrintJob || { name: PRINT_JOB });
    }
}

async function findTableTicketId(token) {
    // Heuristic: getTickets(isClosed: false) and filter by entity name
    const q = 'query { getTickets(isClosed: false) { id entities { name type } } }';
    const d = await gql(q, token);
    const list = d?.getTickets || [];
    const entityName = ENTITY_PREFIX ? `${ENTITY_PREFIX}${TABLE}` : TABLE;
    for (const t of list) {
        if ((t.entities || []).some(e => e.name === entityName || e.name === String(TABLE))) return String(t.id);
    }
    return null;
}

async function pickFirstProduct(token) {
    try {
        const q = 'query { getMenu(name: "MENU") { categories { menuItems { product { id name portions { name } } } } } }';
        const d = await gql(q, token);
        const cats = d?.getMenu?.categories || [];
        for (const c of cats) {
            for (const it of (c.menuItems || [])) {
                const p = it.product;
                if (p?.name) return { name: p.name, portion: p.portions?.[0]?.name || PORTION };
            }
        }
    } catch { }
    return null;
}

async function main() {
    out('Config', { BASE, GQL, USER, TERMINAL, TABLE, PRODUCT, PORTION, QTY });
    const token = await getToken();
    out('Token OK', token.slice(0, 12) + '...');

    // 1) registerTerminal
    const mReg = `mutation { registerTerminal(ticketType: "${gqlEscape(TICKET_TYPE)}", terminal: "${gqlEscape(TERMINAL)}", department: "${gqlEscape(DEPARTMENT)}", user: "${gqlEscape(USER)}") }`;
    const reg = await gql(mReg, token);
    const terminalId = reg.registerTerminal;
    if (!terminalId) throw new Error('registerTerminal returned empty terminalId');
    out('registerTerminal -> terminalId', terminalId);

    // 2) locate table ticket and load
    const ticketId = await findTableTicketId(token);
    if (!ticketId) throw new Error('No open ticket for table; run the new-flow smoke first');
    const mLoad = `mutation { loadTerminalTicket(terminalId: "${gqlEscape(terminalId)}", ticketId: "${gqlEscape(ticketId)}") { id number totalAmount remainingAmount orders { uid name quantity price portion } } }`;
    const loaded = await gql(mLoad, token);
    out('loadTerminalTicket', loaded.loadTerminalTicket);

    // 3) add another order
    let prodName = PRODUCT; let portion = PORTION;
    if (!prodName) {
        const pick = await pickFirstProduct(token);
        if (!pick) throw new Error('No product provided and failed to pick one from menu');
        prodName = pick.name; portion = pick.portion || portion;
        out('Picked product from menu', { prodName, portion });
    }
    const mAdd = `mutation { addOrderToTerminalTicket(terminalId: "${gqlEscape(terminalId)}", productName: "${gqlEscape(prodName)}", quantity: ${QTY}, portion: "${gqlEscape(portion)}") { totalAmount remainingAmount } }`;
    const add = await gql(mAdd, token);
    out('addOrderToTerminalTicket', add.addOrderToTerminalTicket);

    // 4) verify
    const qTicket = `query { getTerminalTicket(terminalId: "${gqlEscape(terminalId)}") { id number totalAmount remainingAmount orders { uid name quantity price portion } } }`;
    const tk = await gql(qTicket, token);
    out('getTerminalTicket (after add)', tk.getTerminalTicket);
    const currentTicketId = tk?.getTerminalTicket?.id ? String(tk.getTerminalTicket.id) : null;
    await tryCloseAndPrint(terminalId, token, currentTicketId);

    console.log('\n✅ Smoke OK');
}

main().catch(e => { console.error('\n❌ Smoke FAILED:', e.message || e); process.exit(1); });
