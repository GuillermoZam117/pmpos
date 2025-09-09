# PMPOS — Architecture, Flows, Discovery, and Ownership Map (Full)

This document details the end‑to‑end flows (especially occupied‑table discovery), ownership by file, function inventories (inputs/outputs/consumers), duplication hotspots, and alignment with the GraphQL Discovery contract. Use this to reason about bugs, consolidate logic, and plan changes safely.

## 1) System Overview

- UI: React 17 + Redux in `app/components`, state in `app/reducers`.
- Business/services: `app/services/*` orchestrate flows, enforce preconditions, and call data layer.
- Data layer:
  - `app/queries.js`: unified wrappers for SQL Read‑Service (heavy reads) and GraphQL mutations (terminal operations).
  - `app/utils/graphqlClient.js`: discovery‑style GraphQL queries with variables (useful for typed clients and tests).
- Legacy: `app/queries_old.js` (keep as reference; avoid new usage).
- Auth: `app/services/tokenService.js` provides Bearer tokens.
- Terminal: `app/services/terminalService.js` manages current `terminalId` and registration events.

## 2) Data Sources and Contract

- SQL Read‑Service (internal HTTP):
  - Strongly preferred for heavy reads (tables, active tickets, ticket details).
  - Wrapped by `fetchActiveTickets`, `fetchTables`, `fetchTicketDetails` in `queries.js`.
- GraphQL (SambaPOS):
  - Used for terminal session operations: create/load terminal ticket, change entity (table), add orders, close ticket, execute print.
  - Discovery contract (GraphQLClient): variables with explicit types; consistent return shapes (see section 6).

## 3) End‑to‑End Flows

3.1 App Initialization
- Owner: `app/components/App.jsx`
- Steps:
  - Authenticate (tokenService on‑demand).
  - Initialize `dataManager`: load Menu + Tables + Active Tickets (via SQL) and start SignalR.
  - Expose `window.refreshData(type)` for on‑demand refresh.

3.2 Occupied‑Table Discovery
- Owner: `app/services/ticketService.js#openTicket(tableName, user)`
- Preconditions:
  - Auth token available.
  - Terminal registered (or register on first use).
- Steps:
  1) `dataManager.refreshData('tickets')` → ensure fresh active tickets from SQL.
  2) `dataManager.getActiveTickets()`.
  3) `getTicketForMesa(tableName, allTickets)` → match by `entity.name === tableName` and `entity.type in ('Mesas','Mesa')`.
  4) `getCurrentTerminalId()` (if missing → `registerTerminalAsync()` → re‑get).
  5) `loadTicketToTerminal(ticket.id)` (GraphQL, uses `ticketId`).
  6) Return `{ success, ticket, url }` for navigation to POS.
- Failure handling:
  - If load fails with terminal/session issues → register terminal and retry once.
  - If not found in active tickets → optional legacy fallback.

3.3 New Ticket on Free Table
- Owner: `ticketService.createTicket` or `createAssignAddClose`
- Steps:
  1) Ensure terminalId.
  2) `createTerminalTicketAsync(terminalId)`.
  3) (Optional) `changeEntityOfTerminalTicketAsync(terminalId, tableName)`.
  4) Navigate to POS; optionally add first order.

3.4 Add Orders in POS
- Owner: `app/services/orderService.js` → `addOrderToTerminalTicketAsync`
- Contract: prefer `productName`, `quantity`, `portion`. Avoid `productId+orderTags` except for legacy wrappers.

3.5 Print and Close
- Owner: `executePrintJobAsync`, `closeTerminalTicket`
- Return normalization recommended for `closeTerminalTicket` to `{ success, errorMessage? }`.

3.6 Promote Local Tickets
- Owners: `ticketService.promoteLocalTicket`, `ticketService.promotePendingTicketsForUser`
- Steps: create on server → replay orders → assign table if present → clear local cache.

## 4) Controllers and Consumers

- `app/components/App.jsx`
  - Uses: `dataManager` (init + refresh), Redux dispatch.
  - Exposes: `window.refreshData(type)`.

- `app/components/POS/POSViewMobile.jsx`
  - Uses: `changeEntityOfTerminalTicketAsync(terminalId, tableName)` to bind the ticket to a table for printing/flow continuity.
  - Critical fix applied: changed calls to pass `String(tableId)` ensuring GraphQL receives a name (string). If `tableId` was already name/number string, behavior is consistent. For best accuracy, migrate to `tableName` variable if available.

- `app/components/PinPad.jsx`
  - Navigates to `/tables` after auth changes.

## 5) Services Inventory (Responsibilities, IO, Consumers)

- `ticketService.js`
  - `openTicket(tableName, user)`
    - In: `tableName` (string), `user`.
    - Out: `{ success, ticket, url, source? }`.
    - Consumes: `dataManager.refreshData/getActiveTickets`, `getTicketForMesa`, `getCurrentTerminalId`, `loadTicketToTerminal`, `registerTerminalAsync`, `createTerminalTicketAsync`, `closeTerminalTicket`.
  - `createAssignAddClose({ terminalId, tableName, order })`
    - In: `terminalId`, `tableName`, `order { productName, quantity?, portion? }`.
    - Out: `{ created, assigned, added, closed }`.
    - Consumes: `createTerminalTicketAsync`, `changeEntityOfTerminalTicketAsync`, `addOrderToTerminalTicketAsync`, `closeTerminalTicket`.
  - `modifyClosedTicket({ terminalId, ticketId, orders })`
    - In: `terminalId`, `ticketId`, `orders[]`.
    - Behavior: Load by ticketId and replay orders.
  - `createTicket`, `promoteLocalTicket`, `promotePendingTicketsForUser`.
  - `getTicketByTable(tableName)` (hybrid: SQL first, legacy fallback).
  - `getTicketUrl(ticketId, tableName)`.

- `terminalService.js`
  - Maintains `terminalId`; notifies on registration.

- `orderService.js`
  - `addOrder(terminalId, name, quantity, portion)`; wrapper over `addOrderToTerminalTicketAsync`.

- `dataManager.js` (if present)
  - `init`, `getActiveTickets`, `refreshData(type)` for cache.

- `tokenService.js`
  - `getValidAccessToken`; used by both SQL and GraphQL callers.

## 6) Data Layer: Functions and Contracts

- `app/queries.js`
  - SQL Read‑Service:
    - `fetchActiveTickets()` → Active tickets from `/internal-api/active-tickets`.
    - `fetchTables()` → Tables from `/internal-api/tables`.
    - `fetchTicketDetails(ticketId)` → Details from `/internal-api/tickets/{id}/details`.
  - GraphQL Mutations/Reads:
    - `registerTerminalAsync(userOverride?)` → registers terminal (retries on 5xx).
    - `getCurrentTerminalId()` → read from storage/service.
    - `createTerminalTicketAsync(terminalId)` → `{ id, uid, type, totalAmount, remainingAmount }`.
    - `changeEntityOfTerminalTicketAsync(terminalId, tableName)` → uses `type`+`name`.
    - `addOrderToTerminalTicketAsync(terminalId, orderPayload)` → prefer `{ productName, quantity, portion }`.
    - `closeTerminalTicket()` → recommend wrapper normalization to `{ success, errorMessage? }`.
    - `loadTicketToTerminal(ticketId)` → variables `$terminalId`, `$ticketId`, returns `number` (aligned).
    - `getTicketById(ticketId)` → candidate to migrate to GraphQLClient with variables.

- `app/utils/graphqlClient.js` (Discovery)
  - `getTerminalTicket($terminalId)`
  - `createTerminalTicket($terminalId)`
  - `loadTerminalTicket($terminalId, $ticketId)`
  - `changeEntityOfTerminalTicket($terminalId, $type, $name)`
  - `closeTerminalTicket($terminalId)`

Return shapes are aligned to use `number` (not `ticketNumber`) and pass `ticketId` for loading.

## 7) Duplication and Misalignment

- Duplicated data layer: `queries_old.js` vs `queries.js` vs `graphqlClient.js`.
  - Action: retire imports from `queries_old.js`; keep `queries.js` + `graphqlClient.js` only.
- Field mismatch: `ticketNumber` vs `number`.
  - Fixed in `loadTicketToTerminal` and `getGetTerminalTicketsScript`. Audit consumers for `ticketNumber` usage.
- Misused parameter in UI: `tableId` passed to `changeEntityOfTerminalTicketAsync`.
  - Fix applied to send `String(tableId)`; prefer explicit `tableName` where available.
- Mixed signatures:
  - `changeEntityOfTerminalTicket`: use `type`+`name`; avoid `entity:` variant.
  - `addOrderToTerminalTicket`: prefer `productName`/`quantity`/`portion`.
  - `closeTerminalTicket`: normalize return.

## 8) Action Plan (Consolidation)

1) UI correctness
- Replace all `changeEntityOfTerminalTicketAsync(terminalId, tableId)` usages with `changeEntityOfTerminalTicketAsync(terminalId, tableName)` when variable exists. Interim safety applied: `String(tableId)`.
- Ensure UI reads `ticket.number` everywhere.

2) Data layer consistency
- Normalized `closeTerminalTicket` via `closeTerminalTicketNormalized()` to `{ success, errorMessage? }` and wired into services.
- Unified orders with `addOrderToTerminalTicketUnified()` (prefers `productName/quantity/portion`, falls back to `productId/orderTags`). Services import it as `addOrderToTerminalTicketAsync`.
- Migrate `getTicketById` to `graphqlClient.js` with variables.
- Remove remaining imports/usages of `queries_old.js`.

3) Robustness
- Before any mutation, if `getCurrentTerminalId()` is empty → `registerTerminalAsync()` and retry once.
- For `loadTicketToTerminal` failures related to terminal/session → re‑register and retry once.

## 9) Debugging Checklist

- Token present; terminal registered.
- `refreshData('tickets')` executed before discovery.
- `getTicketForMesa(tableName)` finds ticket.
- `loadTerminalTicket(terminalId, ticketId)` called with `ticketId`.
- `changeEntityOfTerminalTicket(terminalId, tableName)` uses NAME (string).
- `addOrderToTerminalTicket(terminalId, productName, qty, portion)` works.
- `closeTerminalTicket` returns success or errorMessage.

## 10) Appendix — Example Payloads

- Load ticket to terminal (GraphQL):
  - Variables: `{ terminalId: "POS01", ticketId: "1234" }`
  - Returns: `{ id, uid, number, totalAmount, remainingAmount, entities[], orders[] }`

- Change entity (table):
  - Variables: `{ terminalId: "POS01", type: "Mesas", name: "M12" }`

- Add order:
  - Variables: `{ terminalId: "POS01", productName: "Coca Cola", quantity: 1, portion: "Normal" }`
