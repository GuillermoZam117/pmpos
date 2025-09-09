#!/usr/bin/env node
/*
 Simple smoke test runner for PMPOS flows against your running services.
 Usage:
   node scripts/smoke-pos-flows.js \
     --read http://localhost:4005 \
     --gql  http://localhost:9000/api/graphql \
     --pin  1111 \
     [--name "GUILLERMO SISTEMAS"]
*/

const args = require('node:process').argv.slice(2);
const getArg = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const READ = getArg('--read', 'http://localhost:4005');
const GQL = getArg('--gql', 'http://localhost:9000/api/graphql');
const PIN = getArg('--pin', '');
const NAME = getArg('--name', '');

async function main() {
  const out = (label, obj) => console.log(`\n== ${label} ==\n`, obj);

  // 1) Read-service health
  try {
    const r = await fetch(`${READ}/internal-api/health`);
    const j = await r.json();
    out('read-service /health', j);
  } catch (e) {
    out('read-service /health ERROR', e.message || e);
  }

  // 2) List admins
  try {
    const r = await fetch(`${READ}/internal-api/users/admins`);
    const j = await r.json();
    out('admins', j);
  } catch (e) {
    out('admins ERROR', e.message || e);
  }

  // 3) Validate admin by PIN
  if (PIN) {
    try {
      const r = await fetch(`${READ}/internal-api/validate-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: PIN })
      });
      const j = await r.json();
      out('validate-admin by PIN', j);
    } catch (e) {
      out('validate-admin by PIN ERROR', e.message || e);
    }
  }

  // 4) Validate admin by NAME
  if (NAME) {
    try {
      const r = await fetch(`${READ}/internal-api/validate-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: NAME })
      });
      const j = await r.json();
      out('validate-admin by NAME', j);
    } catch (e) {
      out('validate-admin by NAME ERROR', e.message || e);
    }
  }

  // 5) GraphQL basic checks (token handled by your proxy)
  try {
    const q = 'query { getMenu(name: "MENU") { categories { name menuItems { name product { id portions { name price } } } } } }';
    const r = await fetch(GQL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q })
    });
    const j = await r.json();
    out('GraphQL getMenu (basic)', { ok: !!j.data, categories: j.data?.getMenu?.categories?.length });
  } catch (e) {
    out('GraphQL getMenu ERROR', e.message || e);
  }

  // 6) Order tags probe for one product/portion if possible
  try {
    const qp = 'query { getMenu(name: "MENU") { categories { menuItems { product { id portions { name } } } } } }';
    const r1 = await fetch(GQL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: qp }) });
    const j1 = await r1.json();
    const cats = j1?.data?.getMenu?.categories || [];
    let pid, portion;
    for (const c of cats) {
      for (const it of (c.menuItems || [])) {
        if (it.product?.id && it.product?.portions?.length) {
          pid = it.product.id; portion = it.product.portions[0].name; break;
        }
      }
      if (pid) break;
    }
    if (pid) {
      const qt = `query { getOrderTagGroups(productId: ${pid}, portion: "${portion}") { name tags { name price } } }`;
      const r2 = await fetch(GQL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: qt }) });
      const j2 = await r2.json();
      out('GraphQL order tags for first product', j2?.data?.getOrderTagGroups || []);
    } else {
      out('GraphQL order tags', 'No product found to probe');
    }
  } catch (e) {
    out('GraphQL order tags ERROR', e.message || e);
  }
}

main().catch(e => { console.error(e); process.exit(1); });

