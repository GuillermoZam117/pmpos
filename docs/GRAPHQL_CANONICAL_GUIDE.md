# GraphQL Canonical Guide

## Proposito y alcance
- Esta guia consolida las fuentes mas recientes (2025-09-10) para GraphQL: `GRAPHQL_AUDIT_REPORT.md`, `GRAPHQL_DISCOVERY_INTEGRATION.md`, `documentacion nueva graphql/flujos_operativos_2_9_samba_pos_graph_ql.md` y `documentacion nueva graphql/DISCOVERY GRAPHQL.txt`.
- Se usa como referencia unica para flujos de tickets/pagos, discovery y convenciones de queries/mutations. Mantenerla actualizada al cerrar cada sprint.

## Fuente de verdad en codigo
- Executor unico: `app/services/graphqlService.js` (`gql`, `graphqlRequest`, `gqlEscape`, `getToken`).
- Endpoint: `app/utils/gqlEndpoint.js` usa `app/config.js` y `.env` (`SAMBAPOS_API_URL`, `SAMBAPOS_API_PORT`).
- Queries canonicas: `app/graphql/queries.js`; importar desde servicios (`paymentService.js`, `ticketService.js`, `orderService.js`, `menuService.js`).
- Auth: `tokenService.getValidAccessToken()`; evitar clientes alternos (`graphql-simple`, `graphql-helper`).

## Flujos cubiertos (probados manualmente segun docs mas recientes)
- Pagos: `payTerminalTicket` parcial/mixto, `executePayment`, `closeTerminalTicket`.
- Ticket/entidad: `loadTerminalTicket`, `changeEntityOfTerminalTicket`, `getTerminalTicket`.
- Movimientos: mover orden via `executeAutomationCommandForTerminalTicket` (split entre tickets).
- Calculations: descuentos/propinas/cargos.
- Reopen: flujo de reabrir ticket pagado.
- Discovery: consultas basicas y payloads validados en `documentacion nueva graphql/DISCOVERY GRAPHQL.txt`.
- Modos de venta (`app/config/salesModes.js`): `mesas`, `mostrador`, `reparto` mapean `department/ticket/entity`; la pantalla de login permite elegirlos y sobreescribir parámetros antes de registrar terminal.
- Reparto (delivery) usa `getEntities(type:\"Clientes\", search:\"…\")` para autocompletar clientes antes de llamar a `createTerminalTicket` y `changeEntityOfTerminalTicket`. Presets en `salesModes` ya contienen `entityTypeName`.

## Gaps actuales
- Automatizacion: flujos 2–9 sin smoke dedicado; hoy solo ejemplos manuales. No hay validacion automatica del esquema en `docs/sambapos_schema.md` ni de payloads en `docs/sambapos_payload_examples.md`.
- Duplicados: `GRAPHQL_AUDIT_REPORT.md` reporta queries repetidas entre servicios/utilidades; consolidar todo en `app/graphql/queries.js`.
- CI: los comandos de humo existen (mesa1) pero no cubren flujos avanzados; no hay job CI que los ejecute.

## Plan de sprint propuesto
1) Consolidar queries: mover cualquier literal de servicios/utilidades a `app/graphql/queries.js` y eliminar copias señaladas por el audit.
2) Smoke automatizados: agregar comandos para pagos mixtos, changeEntity, move order, calculations y reopen usando los payloads recientes; documentar parametros por entorno (nombres exactos de payment/entity/automation command).
3) Tests de contrato: crear prueba rapida que valide el schema/payloads minimos contra un endpoint de staging o mock (usar `docs/sambapos_schema.md` y `docs/sambapos_payload_examples.md`).
4) Documentacion: enlazar esta guia desde `README.md` y `AGENTS.md`; marcar fecha/owner en cada actualizacion.
