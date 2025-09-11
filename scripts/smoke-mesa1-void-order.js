#!/usr/bin/env node
/*
 Smoke test: anular un pedido en mesa ocupada (default table "1").
 Flujo: token -> registerTerminal -> localizar ticket abierto de mesa -> loadTerminalTicket -> cancelar/anular última orden -> verificar -> cerrar ticket

 Uso:
   node scripts/smoke-mesa1-void-order.js \
     --base http://localhost:9000 \
     --user graphiql --pass graphiql --client graphiql \
     --terminal SERVIDOR --department MESAS --ticketType COMEDOR \
     --table 1 --entityType Mesas \
     --targetName "CAFE AMERICANO" --close true
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
const ENTITY_TYPE = getArg('--entityType', 'Mesas');
const TARGET_NAME = getArg('--targetName', ''); // nombre de producto a anular (opcional)
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
        if (!ticketId) return out('print skipped', 'no ticket id');
        const mPrint = `mutation { executePrintJob(name: "${gqlEscape(PRINT_JOB)}", ticketId: ${ticketId}, copies: ${COPIES}, terminal: "${gqlEscape(TERMINAL)}", department: "${gqlEscape(DEPARTMENT)}", user: "${gqlEscape(USER)}") { name } }`;
        const pr = await gql(mPrint, token);
        out('executePrintJob', pr.executePrintJob || { name: PRINT_JOB });
    }
}

async function findTableTicketId(token) {
    const q = 'query { getTickets(isClosed: false) { id entities { name type } } }';
    const d = await gql(q, token);
    const list = d?.getTickets || [];
    const entityName = String(TABLE);
    for (const t of list) {
        if ((t.entities || []).some(e => e.name === entityName)) return String(t.id);
    }
    return null;
}

function pickOrderToVoid(orders) {
    if (!Array.isArray(orders) || !orders.length) return null;
    if (TARGET_NAME) {
        const byName = orders.find(o => (o?.name || '').toLowerCase() === TARGET_NAME.toLowerCase());
        if (byName) return byName;
    }
    return orders[orders.length - 1]; // última orden por defecto
}

async function tryCancelOrder(token, terminalId, orderUid) {
    // 1) Intentar via cancelOrderOnTerminalTicket
    try {
        const m = `mutation { cancelOrderOnTerminalTicket(terminalId: "${gqlEscape(terminalId)}", orderUid: "${gqlEscape(orderUid)}") { success } }`;
        const d = await gql(m, token);
        if (d?.cancelOrderOnTerminalTicket?.success) {
            out('cancelOrderOnTerminalTicket', d.cancelOrderOnTerminalTicket);
            return true;
        }
    } catch (e) {
        out('cancelOrderOnTerminalTicket error', e.message || e);
    }

    // 2) Fallback: ejecutar comando de automatización "Anular"
    try {
        const m2 = `mutation { executeAutomationCommandForTerminalTicket(terminalId: "${gqlEscape(terminalId)}", name: "Anular", orderUid: "${gqlEscape(orderUid)}") { id } }`;
        const d2 = await gql(m2, token);
        out('executeAutomationCommand(Anular)', d2.executeAutomationCommandForTerminalTicket);
        return true;
    } catch (e2) {
        out('executeAutomationCommand(Anular) error', e2.message || e2);
    }

    // 3) Fallback: comando "Void" (en inglés)
    try {
        const m3 = `mutation { executeAutomationCommandForTerminalTicket(terminalId: "${gqlEscape(terminalId)}", name: "Void", orderUid: "${gqlEscape(orderUid)}") { id } }`;
        const d3 = await gql(m3, token);
        out('executeAutomationCommand(Void)', d3.executeAutomationCommandForTerminalTicket);
        return true;
    } catch (e3) {
        out('executeAutomationCommand(Void) error', e3.message || e3);
    }

    return false;
}

async function main() {
    out('Config', { BASE, GQL, USER, TERMINAL, TABLE, TARGET_NAME, DO_CLOSE });
    const token = await getToken();
    out('Token OK', token.slice(0, 12) + '...');

    // 1) registerTerminal
    const mReg = `mutation { registerTerminal(ticketType: "${gqlEscape(TICKET_TYPE)}", terminal: "${gqlEscape(TERMINAL)}", department: "${gqlEscape(DEPARTMENT)}", user: "${gqlEscape(USER)}") }`;
    const reg = await gql(mReg, token);
    const terminalId = reg.registerTerminal;
    if (!terminalId) throw new Error('registerTerminal returned empty terminalId');
    out('registerTerminal -> terminalId', terminalId);

    // 2) localizar ticket de la mesa y cargarlo
    const ticketId = await findTableTicketId(token);
    if (!ticketId) throw new Error('No hay ticket abierto para la mesa; ejecute primero el flujo de nuevo ticket');
    const mLoad = `mutation { loadTerminalTicket(terminalId: "${gqlEscape(terminalId)}", ticketId: "${gqlEscape(ticketId)}") { id number totalAmount remainingAmount orders { uid name quantity price portion } } }`;
    const loaded = await gql(mLoad, token);
    out('loadTerminalTicket', loaded.loadTerminalTicket);

    // 3) seleccionar la orden a anular
    const orders = loaded?.loadTerminalTicket?.orders || [];
    const toVoid = pickOrderToVoid(orders);
    if (!toVoid?.uid) throw new Error('No se encontró una orden para anular');
    out('Order to void', toVoid);

    // 4) anular/cancelar
    const cancelled = await tryCancelOrder(token, terminalId, toVoid.uid);
    if (!cancelled) throw new Error('No se pudo anular la orden con ninguna estrategia');

    // 5) verificar
    const qTicket = `query { getTerminalTicket(terminalId: "${gqlEscape(terminalId)}") { id number totalAmount remainingAmount orders { uid name quantity price portion } } }`;
    const tk = await gql(qTicket, token);
    out('getTerminalTicket (after void)', tk.getTerminalTicket);
    const currentTicketId = tk?.getTerminalTicket?.id ? String(tk.getTerminalTicket.id) : null;

    // 6) cerrar (y opcionalmente imprimir)
    await tryCloseAndPrint(terminalId, token, currentTicketId);

    console.log('\n✅ Smoke OK');
}

main().catch(e => { console.error('\n❌ Smoke FAILED:', e.message || e); process.exit(1); });
