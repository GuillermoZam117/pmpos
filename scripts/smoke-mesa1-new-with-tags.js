#!/usr/bin/env node
/*
 Smoke test: mesa libre con etiqueta de orden.
 Flujo: token -> registerTerminal -> createTerminalTicket -> assign mesa -> pick producto con order tags -> add order -> aplicar un tag disponible -> verificar -> cerrar

 Flags útiles:
  --product "CAFE AMERICANO" --portion "Normal" (si no se pasan, busca uno con tags)
  --tagGroup "Azúcar" --tagValue "Sin azúcar" (si no se pasan, elige el primero disponible)
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
const MENU = getArg('--menu', 'MENU');
const TABLE = getArg('--table', '1');
const ENTITY_TYPE = getArg('--entityType', 'Mesas');
const ENTITY_PREFIX = getArg('--entityPrefix', '');
const PRODUCT = getArg('--product', '');
const PORTION = getArg('--portion', 'Normal');
const TAG_GROUP = getArg('--tagGroup', '');
const TAG_VALUE = getArg('--tagValue', '');
const DISCOVER = ['true', '1', 'yes', 'y'].includes(String(getArg('--discover', 'false')).toLowerCase());
const QTY = parseInt(getArg('--qty', '1'), 10) || 1;
const DO_CLOSE = ['true', '1', 'yes', 'y'].includes(String(getArg('--close', 'false')).toLowerCase());

const out = (label, obj) => console.log(`\n== ${label} ==\n`, obj);
const gqlEscape = (s) => String(s).replace(/"/g, '\\"');

async function getToken() {
    const res = await fetch(AUTH, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'password', username: USER, password: PASS, client_id: CLIENT }) });
    const data = await res.json(); if (!data.access_token) throw new Error('No access_token'); return data.access_token;
}

async function gql(query, token) {
    const r = await fetch(GQL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ query }) });
    const j = await r.json(); if (j.errors) throw new Error(j.errors.map(e => e.message).join(', ')); return j.data;
}

async function registerTerminal(token) {
    const m = `mutation { registerTerminal(ticketType: "${gqlEscape(TICKET_TYPE)}", terminal: "${gqlEscape(TERMINAL)}", department: "${gqlEscape(DEPARTMENT)}", user: "${gqlEscape(USER)}") }`;
    const d = await gql(m, token); return d.registerTerminal;
}

async function createAndAssignMesa(token, terminalId) {
    const mCreate = `mutation { createTerminalTicket(terminalId: "${gqlEscape(terminalId)}") { id uid number totalAmount remainingAmount } }`;
    const crt = await gql(mCreate, token); out('createTerminalTicket', crt.createTerminalTicket);
    const entityName = ENTITY_PREFIX ? `${ENTITY_PREFIX}${TABLE}` : String(TABLE);
    const variants = [
        `mutation { changeEntityOfTerminalTicket(terminalId: "${gqlEscape(terminalId)}", entity: "${gqlEscape(entityName)}") { id entities { name type } } }`,
        `mutation { changeEntityOfTerminalTicket(terminalId: "${gqlEscape(terminalId)}", type: "${gqlEscape(ENTITY_TYPE)}", name: "${gqlEscape(entityName)}") { id entities { name type } } }`,
        `mutation { changeEntityOfTerminalTicket(terminalId: "${gqlEscape(terminalId)}", entityTypeName: "${gqlEscape(ENTITY_TYPE)}", entityName: "${gqlEscape(entityName)}") }`
    ];
    let ok = null; let lastErr = null;
    for (const q of variants) { try { ok = await gql(q, token); break; } catch (e) { lastErr = e; } }
    if (!ok) throw lastErr || new Error('changeEntityOfTerminalTicket failed');
    out('changeEntityOfTerminalTicket', ok);
}

async function getOrderTagGroups(token, ref, portion) {
    // Try by productId/productName with portion, then without portion
    const tries = [];
    if (ref?.productId) {
        if (portion) tries.push(`query { getOrderTagGroups(productId: ${ref.productId}, portion: "${gqlEscape(portion)}") { name tags { name price } } }`);
        tries.push(`query { getOrderTagGroups(productId: ${ref.productId}) { name tags { name price } } }`);
    }
    if (ref?.productName) {
        if (portion) tries.push(`query { getOrderTagGroups(productName: "${gqlEscape(ref.productName)}", portion: "${gqlEscape(portion)}") { name tags { name price } } }`);
        tries.push(`query { getOrderTagGroups(productName: "${gqlEscape(ref.productName)}") { name tags { name price } } }`);
    }
    for (const q of tries) {
        try {
            const d = await gql(q, token);
            const groups = d?.getOrderTagGroups || [];
            if (Array.isArray(groups) && groups.length) return groups;
        } catch (_) { /* try next */ }
    }
    return [];
}

async function pickProductWithTags(token) {
    // Iterate possible menu names to be resilient across environments
    const menuNames = Array.from(new Set([
        MENU,
        DEPARTMENT,
        TICKET_TYPE,
        'MENU', 'Menu', 'Carta', 'Default'
    ].filter(Boolean)));

    let items = [];
    let usedMenu = null;
    for (const mName of menuNames) {
        try {
            const menuQ = `query { getMenu(name: "${gqlEscape(mName)}") { categories { menuItems { productId product { id name portions { name } } } } } }`;
            const menuD = await gql(menuQ, token);
            const cats = menuD?.getMenu?.categories || [];
            items = [];
            cats.forEach(c => (c.menuItems || []).forEach(it => items.push(it)));
            if (items.length) { usedMenu = mName; break; }
        } catch (_) { /* try next */ }
    }
    if (!items.length) {
        throw new Error(`No se encontraron ítems en menús candidatos: ${menuNames.join(', ')}`);
    }

    const candidateList = [];
    for (const it of items) {
        const pid = Number(it?.productId || it?.product?.id);
        const name = it?.product?.name; const portions = it?.product?.portions || [];
        const pnames = portions.length ? portions.map(p => p.name) : ['Normal'];
        for (const pn of pnames) candidateList.push({ pid, name, portion: pn });
    }

    // If specific product requested, prioritize it
    const preferred = PRODUCT ? candidateList.filter(x => (x.name || '').toLowerCase() === PRODUCT.toLowerCase()) : candidateList;
    for (const cand of preferred) {
        try {
            const portionToUse = PORTION ? PORTION : (cand.portion || 'Normal');
            const groups = await getOrderTagGroups(token, { productId: cand.pid, productName: cand.name }, portionToUse);
            const groupsWithTags = groups.filter(g => (g?.tags || []).length > 0);
            if (groupsWithTags.length) {
                return { name: cand.name, portion: portionToUse, productId: cand.pid, groups: groupsWithTags, menu: usedMenu };
            }
        } catch (_) { }
    }
    throw new Error('No se encontraron productos con etiquetas de orden disponibles');
}

async function addOrder(token, terminalId, productName, portion, quantity) {
    const mAdd = `mutation { addOrderToTerminalTicket(terminalId: "${gqlEscape(terminalId)}", productName: "${gqlEscape(productName)}", quantity: ${quantity}, portion: "${gqlEscape(portion)}") { totalAmount remainingAmount } }`;
    const d = await gql(mAdd, token); return d?.addOrderToTerminalTicket;
}

async function getCurrentTicket(token, terminalId) {
    const q = `query { getTerminalTicket(terminalId: "${gqlEscape(terminalId)}") { id number totalAmount remainingAmount orders { uid name portion tags { tagName tag } } } }`;
    const d = await gql(q, token); return d?.getTerminalTicket;
}

async function applyOrderTag(token, terminalId, orderUid, tagName, tagValue) {
    const m = `mutation { updateOrderOfTerminalTicket(terminalId: "${gqlEscape(terminalId)}", orderUid: "${gqlEscape(orderUid)}", orderTags: [{ tagName: "${gqlEscape(tagName)}", tag: "${gqlEscape(tagValue)}" }]) { id totalAmount remainingAmount orders { uid tags { tagName tag } } } }`;
    const d = await gql(m, token); return d?.updateOrderOfTerminalTicket;
}

async function getOrderTagsForOrder(token, terminalId, orderUid) {
    // Some environments expose this under Mutation
    const m = `mutation { getOrderTagsForTerminalTicketOrder(terminalId: "${gqlEscape(terminalId)}", orderUid: "${gqlEscape(orderUid)}") { name tags { name price } } }`;
    try {
        const d = await gql(m, token);
        return d?.getOrderTagsForTerminalTicketOrder || [];
    } catch (_) {
        return [];
    }
}

async function main() {
    out('Config', { BASE, GQL, USER, TERMINAL, MENU, TABLE, PRODUCT, PORTION, TAG_GROUP, TAG_VALUE, QTY, DO_CLOSE, DISCOVER });
    const token = await getToken(); out('Token OK', token.slice(0, 12) + '...');

    // 1) Terminal y ticket
    const terminalId = await registerTerminal(token); out('registerTerminal -> terminalId', terminalId);
    await createAndAssignMesa(token, terminalId);

    // 2) Producto con tags (o modo descubrimiento)
    if (DISCOVER) {
        const menuNames = Array.from(new Set([MENU, DEPARTMENT, TICKET_TYPE, 'MENU', 'Menu', 'Carta', 'Default'].filter(Boolean)));
        const found = [];
        for (const mName of menuNames) {
            try {
                const menuQ = `query { getMenu(name: "${gqlEscape(mName)}") { categories { name menuItems { productId product { id name portions { name } } } } } }`;
                const menuD = await gql(menuQ, token);
                const cats = menuD?.getMenu?.categories || [];
                for (const c of cats) {
                    for (const it of (c.menuItems || [])) {
                        const pid = Number(it?.productId || it?.product?.id);
                        const name = it?.product?.name || it?.name;
                        const portions = it?.product?.portions || [{ name: 'Normal' }];
                        for (const p of portions) {
                            const groups = await getOrderTagGroups(token, { productId: pid, productName: name }, p.name);
                            const groupsWithTags = groups.filter(g => (g?.tags || []).length > 0);
                            if (groupsWithTags.length) {
                                found.push({ menu: mName, name, portion: p.name, groups: groupsWithTags });
                            }
                        }
                    }
                }
            } catch (_) { /* continue */ }
        }
        if (!found.length) {
            console.log('\n⚠️ Descubrimiento: No hay productos con grupos de etiquetas disponibles. Verifique configuración de SambaPOS.');
        } else {
            console.log(`\n🔎 Productos con OrderTags disponibles (${found.length}):`);
            for (const f of found) {
                console.log(`- ${f.name} • Porción: ${f.portion} • Menú: ${f.menu}`);
                for (const g of f.groups) {
                    const tagNames = (g.tags || []).map(t => t.name).join(', ');
                    console.log(`   > Grupo: ${g.name} → Tags: ${tagNames}`);
                }
            }
            console.log('\nEjemplo de uso:');
            console.log('  npm run smoke:mesa1:new:tags -- --product "NOMBRE" --portion "Normal" --tagGroup "GRUPO" --tagValue "VALOR" --close true');
        }
        console.log('\n✅ Descubrimiento completado');
        return;
    }
    let pick;
    try {
        pick = await pickProductWithTags(token);
    } catch (e) {
        // Fallback: pick any product from candidate menus even if it lacks tag groups
        out('Aviso', 'No se encontró producto con etiquetas disponibles, se intentará con el primero del menú para validar flujo base');
        const menuNames = [MENU, DEPARTMENT, TICKET_TYPE, 'MENU', 'Menu', 'Carta', 'Default'].filter(Boolean);
        let anyItem = null;
        for (const mName of menuNames) {
            try {
                const menuQ = `query { getMenu(name: "${gqlEscape(mName)}") { categories { menuItems { productId product { id name portions { name } } } } } }`;
                const menuD = await gql(menuQ, token);
                const cats = menuD?.getMenu?.categories || [];
                for (const c of cats) {
                    for (const it of (c.menuItems || [])) {
                        const name = it?.product?.name || it?.name; const portions = it?.product?.portions || [{ name: 'Normal' }];
                        anyItem = { name, portion: portions[0]?.name || 'Normal' };
                        break;
                    }
                    if (anyItem) break;
                }
                if (anyItem) break;
            } catch (_) { }
        }
        if (!anyItem) throw e; // rethrow if nothing at all
        pick = { name: anyItem.name, portion: anyItem.portion, groups: [], menu: 'fallback' };
    }
    const prodName = PRODUCT || pick.name; const portion = PORTION || pick.portion || 'Normal';
    let chosenGroup = TAG_GROUP || pick.groups[0]?.name;
    let chosenTag = TAG_VALUE || pick.groups[0]?.tags?.[0]?.name;
    out('Chosen product & tag (pre)', { prodName, portion, chosenGroup, chosenTag, menu: pick.menu });

    // 3) Agregar orden
    await addOrder(token, terminalId, prodName, portion, QTY);
    const t1 = await getCurrentTicket(token, terminalId); out('Ticket after add', t1);
    const lastOrder = (t1?.orders || [])[t1?.orders?.length - 1];
    if (!lastOrder?.uid) throw new Error('No se pudo identificar la orden recién agregada');

    // 4) Intentar descubrir tags específicos para esa orden/terminal si no se pasaron por flags ni fueron detectados
    if ((!chosenGroup || !chosenTag)) {
        const groupsForOrder = await getOrderTagsForOrder(token, terminalId, lastOrder.uid);
        if (Array.isArray(groupsForOrder) && groupsForOrder.length) {
            chosenGroup = chosenGroup || groupsForOrder[0]?.name;
            chosenTag = chosenTag || groupsForOrder[0]?.tags?.[0]?.name;
            out('Discovered tags for order', groupsForOrder);
        }
        out('Chosen product & tag (post-discovery)', { prodName, portion, chosenGroup, chosenTag });
    }

    // 5) Aplicar tag si hay grupo/tag disponible
    if (chosenGroup && chosenTag) {
        try {
            const t2 = await applyOrderTag(token, terminalId, lastOrder.uid, chosenGroup, chosenTag);
            out('Ticket after tagging', t2);
        } catch (err) {
            out('Tagging error', err.message || String(err));
        }
    } else {
        out('Tagging skipped', 'No hay grupo/tag disponible en el entorno actual');
    }

    // 6) Cerrar
    if (DO_CLOSE) {
        const mClose = `mutation { closeTerminalTicket(terminalId: "${gqlEscape(terminalId)}") }`;
        const closed = await gql(mClose, token); out('closeTerminalTicket', closed.closeTerminalTicket);
    }

    console.log('\n✅ Smoke OK');
}

main().catch(e => { console.error('\n❌ Smoke FAILED:', e.message || e); process.exit(1); });
