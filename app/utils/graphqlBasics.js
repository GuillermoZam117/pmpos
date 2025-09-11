// Lightweight helpers to run basic GraphQL queries from the browser console
// Usage (in dev):
//   await window.gqlGetUser('1111')
//   await window.gqlGetMesas()
//   await window.gqlOpenTickets()
//   await window.gqlProducts()
//   await window.gqlMenu('MENU')

import { graphqlSimple, gqlEscape } from '../services/graphqlService';

const logGroup = (title, fn) => {
    try { console.group(title); } catch { }
    try { fn(); } finally { try { console.groupEnd(); } catch { } }
};

export async function gqlGetUser(pin) {
    const query = `query { getUser(pin: "${gqlEscape(pin)}") { name } }`;
    const data = await graphqlSimple(query);
    logGroup('🔑 getUser', () => {
        console.log('pin:', pin);
        console.log('result:', data?.getUser || null);
    });
    return data?.getUser || null;
}

export async function gqlGetMesas() {
    const query = `query { getEntityScreenItems(name: "MESAS") { id name caption color labelColor } }`;
    const data = await graphqlSimple(query);
    const items = data?.getEntityScreenItems || [];
    logGroup(`🗂️ MESAS (${items.length})`, () => {
        console.table((items || []).map(x => ({ id: x.id, name: x.name, caption: x.caption, color: x.color, labelColor: x.labelColor })));
    });
    return items;
}

export async function gqlOpenTickets() {
    const query = `query { getTickets(isClosed: false, orderBy: date) {
        id number totalAmount remainingAmount
        entities { type name }
        orders { id menuItemName quantity price }
        states { stateName state }
    } }`;
    const data = await graphqlSimple(query);
    const tickets = data?.getTickets || [];
    logGroup(`🎟️ Open Tickets (${tickets.length})`, () => {
        console.table(tickets.map(t => ({ id: t.id, number: t.number, total: t.totalAmount, remaining: t.remainingAmount })));
    });
    return tickets;
}

export async function gqlProducts() {
    const query = `query { getProducts { id name groupCode barcode portions { id name price } tags { name value } } }`;
    const data = await graphqlSimple(query);
    const products = data?.getProducts || [];
    logGroup(`📦 Products (${products.length})`, () => {
        console.table(products.slice(0, 20).map(p => ({ id: p.id, name: p.name, group: p.groupCode, barcode: p.barcode, portions: (p.portions || []).length })));
    });
    return products;
}

export async function gqlMenu(name = 'MENU') {
    const query = `query { getMenu(name: "${gqlEscape(name)}") {
        categories {
            name
            menuItems {
                name
                product { id name portions { name price } }
            }
        }
    } }`;
    const data = await graphqlSimple(query);
    const menu = data?.getMenu || null;
    logGroup('🍽️ Menu', () => {
        const cats = menu?.categories || [];
        console.log('categories:', cats.length);
        if (cats.length) {
            console.table(cats.map(c => ({ name: c.name, items: (c.menuItems || []).length })));
        }
    });
    return menu;
}

// Expose helpers in dev for quick testing from console
if (typeof window !== 'undefined') {
    window.gqlGetUser = gqlGetUser;
    window.gqlGetMesas = gqlGetMesas;
    window.gqlOpenTickets = gqlOpenTickets;
    window.gqlProducts = gqlProducts;
    window.gqlMenu = gqlMenu;
}

export default {
    gqlGetUser,
    gqlGetMesas,
    gqlOpenTickets,
    gqlProducts,
    gqlMenu
};
