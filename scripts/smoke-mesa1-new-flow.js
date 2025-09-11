#!/usr/bin/env node
/*
 Smoke test: mesa libre (default table "1").
 Flow: get token -> registerTerminal -> createTerminalTicket -> assign table -> add order -> get ticket -> close -> verify

 Usage (PowerShell):
   node scripts/smoke-mesa1-new-flow.js \
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
const ENTITY_TYPE = getArg('--entityType', ''); // e.g. Mesa / Mesas / Table
const ENTITY_TYPE_NAME = getArg('--entityTypeName', ''); // explicit entityTypeName if schema expects it
const ENTITY_PREFIX = getArg('--entityPrefix', ''); // e.g. "MESA "
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
        body: new URLSearchParams({
            grant_type: 'password',
            username: USER,
            password: PASS,
            client_id: CLIENT
        })
    });
    const data = await res.json();
    if (!data.access_token) throw new Error('No access_token');
    return data.access_token;
}

async function gql(query, token) {
    const r = await fetch(GQL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query })
    });
    const j = await r.json();
    if (j.errors) throw new Error(j.errors.map(e => e.message).join(', '));
    return j.data;
}

async function findLatestClosedTicketIdForTable(token, tableName) {
    const q = 'query { getTickets(isClosed: true) { id entities { name type } } }';
    const d = await gql(q, token);
    const list = d?.getTickets || [];
    const matches = list.filter(t => (t.entities || []).some(e => e.name === tableName || e.name === String(tableName)));
    if (!matches.length) return null;
    matches.sort((a, b) => (b.id || 0) - (a.id || 0));
    return String(matches[0].id);
}

async function findOpenTicketIdForTable(token, tableName) {
    const q = 'query { getTickets(isClosed: false) { id entities { name type } } }';
    const d = await gql(q, token);
    const list = d?.getTickets || [];
    for (const t of list) {
        if ((t.entities || []).some(e => e.name === tableName || e.name === String(tableName))) {
            return String(t.id);
        }
    }
    return null;
}

async function tryChangeEntity(terminalId, entityName, token) {
    const variants = [];
    // 1) entity:"<name>"
    variants.push(`mutation { changeEntityOfTerminalTicket(terminalId: "${gqlEscape(terminalId)}", entity: "${gqlEscape(entityName)}") { id entities { name type } } }`);
    // 2) type/name (Discovery adapter uses this)
    const typeOrDefault = ENTITY_TYPE || 'Mesas';
    variants.push(`mutation { changeEntityOfTerminalTicket(terminalId: "${gqlEscape(terminalId)}", type: "${gqlEscape(typeOrDefault)}", name: "${gqlEscape(entityName)}") { id entities { name type } } }`);
    // 3) entityTypeName/entityName (per docs)
    const typeNameOrDefault = ENTITY_TYPE_NAME || ENTITY_TYPE || 'Mesas';
    variants.push(`mutation { changeEntityOfTerminalTicket(terminalId: "${gqlEscape(terminalId)}", entityTypeName: "${gqlEscape(typeNameOrDefault)}", entityName: "${gqlEscape(entityName)}") }`);

    let lastErr = null;
    for (const q of variants) {
        try {
            const d = await gql(q, token);
            return d;
        } catch (e) {
            lastErr = e;
        }
    }
    throw lastErr || new Error('All changeEntityOfTerminalTicket variants failed');
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
    out('Config', { BASE, GQL, AUTH, USER, TERMINAL, DEPARTMENT, TICKET_TYPE, TABLE, ENTITY_TYPE, PRODUCT, PORTION, QTY });

    const token = await getToken();
    out('Token OK', token.slice(0, 12) + '...');

    // 1) registerTerminal
    const mReg = `mutation { registerTerminal(ticketType: "${gqlEscape(TICKET_TYPE)}", terminal: "${gqlEscape(TERMINAL)}", department: "${gqlEscape(DEPARTMENT)}", user: "${gqlEscape(USER)}") }`;
    const reg = await gql(mReg, token);
    const terminalId = reg.registerTerminal;
    if (!terminalId) throw new Error('registerTerminal returned empty terminalId');
    out('registerTerminal -> terminalId', terminalId);

    // 2) Prefer existing open ticket for the table; else create new and assign entity
    const entityName = ENTITY_PREFIX ? `${ENTITY_PREFIX}${TABLE}` : TABLE;
    const openId = await findOpenTicketIdForTable(token, entityName);
    if (openId) {
        const mLoad = `mutation { loadTerminalTicket(terminalId: "${gqlEscape(terminalId)}", ticketId: "${gqlEscape(openId)}") { id number totalAmount remainingAmount orders { uid name quantity price portion } entities { name type } } }`;
        const ld = await gql(mLoad, token);
        out('loadTerminalTicket (existing)', ld.loadTerminalTicket);
    } else {
        const mCreate = `mutation { createTerminalTicket(terminalId: "${gqlEscape(terminalId)}") { id uid number totalAmount remainingAmount } }`;
        const crt = await gql(mCreate, token);
        out('createTerminalTicket', crt.createTerminalTicket);

        const assign = await tryChangeEntity(terminalId, entityName, token);
        out('changeEntityOfTerminalTicket', assign);
    }

    // 4) addOrderToTerminalTicket (choose product)
    let prodName = PRODUCT;
    let portion = PORTION;
    if (!prodName) {
        const pick = await pickFirstProduct(token);
        if (!pick) throw new Error('No product provided and failed to pick one from menu');
        prodName = pick.name; portion = pick.portion || portion;
        out('Picked product from menu', { prodName, portion });
    }
    const mAdd = `mutation { addOrderToTerminalTicket(terminalId: "${gqlEscape(terminalId)}", productName: "${gqlEscape(prodName)}", quantity: ${QTY}, portion: "${gqlEscape(portion)}") { totalAmount remainingAmount } }`;
    const add = await gql(mAdd, token);
    out('addOrderToTerminalTicket', add.addOrderToTerminalTicket);

    // 5) getTerminalTicket -> verify
    const qTicket = `query { getTerminalTicket(terminalId: "${gqlEscape(terminalId)}") { id uid number totalAmount remainingAmount orders { uid name quantity price portion } entities { name type } } }`;
    const tk = await gql(qTicket, token);
    out('getTerminalTicket (after add)', tk.getTerminalTicket);

    // 6) Optional close (SambaPOS auto-prints on submit/close if configured)
    if (DO_CLOSE) {
        const mClose = `mutation { closeTerminalTicket(terminalId: "${gqlEscape(terminalId)}") }`;
        const closed = await gql(mClose, token);
        out('closeTerminalTicket', closed.closeTerminalTicket);
    }

    // 7) (optional) print closed ticket by resolving latest closed ticket for table
    if (DO_PRINT && DO_CLOSE) {
        const tableName = ENTITY_PREFIX ? `${ENTITY_PREFIX}${TABLE}` : TABLE;
        // small delay to allow server to persist ticket
        await new Promise(r => setTimeout(r, 500));
        const ticketId = await findLatestClosedTicketIdForTable(token, tableName);
        if (!ticketId) throw new Error('Could not resolve closed ticket id for printing');
        const mPrint = `mutation { executePrintJob(name: "${gqlEscape(PRINT_JOB)}", ticketId: ${ticketId}, copies: ${COPIES}, terminal: "${gqlEscape(TERMINAL)}", department: "${gqlEscape(DEPARTMENT)}", user: "${gqlEscape(USER)}") { name } }`;
        const pr = await gql(mPrint, token);
        out('executePrintJob', pr.executePrintJob || { name: PRINT_JOB });
    }

    console.log('\n✅ Smoke OK');
}

main().catch(e => { console.error('\n❌ Smoke FAILED:', e.message || e); process.exit(1); });
