#!/usr/bin/env node
/**
 * Smoke tests for flujos avanzados de GraphQL (pagos mixtos, cambio de entidad,
 * mover orden entre tickets). Usa args explícitos para no depender de datos fijos.
 *
 * Ejemplos:
 *   node scripts/smoke-graphql-advanced.js --gql http://localhost:9000/api/graphql \
 *     --terminal TERMINAL01 --ticket 123 --payment "Efectivo" --amount 50 \
 *     --entityType Mesas --entityName 12
 *
 *   node scripts/smoke-graphql-advanced.js --gql http://localhost:9000/api/graphql \
 *     --terminal TERMINAL01 --orderUid abc-uid --targetTicket 456 \
 *     --automation "Move Order To Ticket"
 */

const { argv, env, exit } = require('node:process');

// Soporta flags (--gql ...) y fallback posicional (gql terminal ticket payment amount)
const raw = argv.slice(2);
const flags = {};
const positionals = [];

for (let i = 0; i < raw.length; i++) {
  const token = raw[i];
  if (token.startsWith('--')) {
    const [k, v] = token.includes('=')
      ? token.split('=')
      : [token, raw[i + 1] && !raw[i + 1].startsWith('--') ? raw[++i] : undefined];
    flags[k] = v;
  } else {
    positionals.push(token);
  }
}

const pos = (idx, def) => positionals[idx] !== undefined ? positionals[idx] : def;
const arg = (key, def) => flags[key] !== undefined ? flags[key] : def;

const GQL = arg('--gql', env.SMOKE_GQL || pos(0, 'http://localhost:9000/api/graphql'));
const TERMINAL = arg('--terminal', env.SMOKE_TERMINAL || pos(1, ''));
const TICKET = arg('--ticket', env.SMOKE_TICKET || pos(2, ''));
const PAYMENT = arg('--payment', env.SMOKE_PAYMENT || pos(3, ''));
const AMOUNT = parseFloat(arg('--amount', env.SMOKE_AMOUNT || pos(4, '0'))) || undefined;
const ENTITY_TYPE = arg('--entityType', env.SMOKE_ENTITY_TYPE || '');
const ENTITY_NAME = arg('--entityName', env.SMOKE_ENTITY_NAME || '');
const ORDER_UID = arg('--orderUid', env.SMOKE_ORDER_UID || '');
const TARGET_TICKET = arg('--targetTicket', env.SMOKE_TARGET_TICKET || '');
const AUTOMATION = arg('--automation', env.SMOKE_AUTOMATION || 'Move Order To Ticket');
const TOKEN = arg('--token', env.SMOKE_TOKEN || '');

if (!TERMINAL) {
  console.error('Falta --terminal (id devuelto por registerTerminal)');
  exit(1);
}

const post = async (query) => {
  const res = await fetch(GQL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {})
    },
    body: JSON.stringify({ query })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  if (json.errors) throw new Error(json.errors.map(e => e.message).join(', '));
  return json.data;
};

const log = (label, payload) => {
  console.log(`\n== ${label} ==`);
  console.log(payload);
};

async function payPartial() {
  if (!PAYMENT || !AMOUNT || !TICKET) return;
  const q = `
    mutation {
      payTerminalTicket(
        terminalId: "${TERMINAL}",
        paymentTypeName: "${PAYMENT}",
        amount: ${AMOUNT}
      ) { ticketId amount remainingAmount errorMessage }
    }
  `;
  const data = await post(q);
  log('payTerminalTicket', data?.payTerminalTicket);
}

async function changeEntity() {
  if (!ENTITY_TYPE || !ENTITY_NAME) return;
  const q = `
    mutation {
      changeEntityOfTerminalTicket(
        terminalId: "${TERMINAL}",
        entityTypeName: "${ENTITY_TYPE}",
        entityName: "${ENTITY_NAME}"
      ) { id entities { type name } }
    }
  `;
  const data = await post(q);
  log('changeEntityOfTerminalTicket', data?.changeEntityOfTerminalTicket);
}

async function moveOrder() {
  if (!ORDER_UID || !TARGET_TICKET) return;
  const q = `
    mutation {
      executeAutomationCommandForTerminalTicket(
        terminalId: "${TERMINAL}",
        orderUid: "${ORDER_UID}",
        name: "${AUTOMATION}",
        value: "${TARGET_TICKET}"
      ) { id }
    }
  `;
  const data = await post(q);
  log('executeAutomationCommandForTerminalTicket', data?.executeAutomationCommandForTerminalTicket);
}

async function main() {
  console.log(`Endpoint: ${GQL}`);
  console.log(`Terminal: ${TERMINAL}`);

  if (PAYMENT && AMOUNT && TICKET) {
    await payPartial().catch(e => log('payTerminalTicket ERROR', e.message));
  } else {
    log('payTerminalTicket', 'Saltado (requiere --payment, --amount, --ticket)');
  }

  if (ENTITY_TYPE && ENTITY_NAME) {
    await changeEntity().catch(e => log('changeEntityOfTerminalTicket ERROR', e.message));
  } else {
    log('changeEntityOfTerminalTicket', 'Saltado (requiere --entityType y --entityName)');
  }

  if (ORDER_UID && TARGET_TICKET) {
    await moveOrder().catch(e => log('executeAutomationCommandForTerminalTicket ERROR', e.message));
  } else {
    log('executeAutomationCommandForTerminalTicket', 'Saltado (requiere --orderUid y --targetTicket)');
  }
}

main().catch(e => { console.error(e); exit(1); });
