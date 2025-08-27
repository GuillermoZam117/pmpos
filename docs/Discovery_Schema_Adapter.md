Discovery GraphQL Integration Notes

This document summarizes how the app adapts to your SambaPOS GraphQL schema discovered in DISCOVERY GRAPHQL.txt so flows are reliable and schema-safe.

Key Alignments
- terminalId everywhere: Mutations that operate on the “terminal ticket” take `terminalId` explicitly: `createTerminalTicket`, `loadTerminalTicket`, `addOrderToTerminalTicket`, `closeTerminalTicket`, `executeAutomationCommandForTerminalTicket`, `unregisterTerminal`.
- productName for orders: Use `productName:"..."` when adding orders to the terminal ticket, not `menuItem`.
- change entity: `changeEntityOfTerminalTicket(terminalId:"...", type:"Mesas", name:"12")`. The app first tries `entity:"..."` and falls back to `type/name` if needed.
- closed tickets: Use `getTicket(id: ...)` to inspect closed tickets; to modify closed-but-unpaid tickets, load with `loadTerminalTicket(terminalId:"...", ticketId:"...")`, add orders, then `closeTerminalTicket(terminalId:"...")`.
- print job: For reprints on closed tickets, use `executePrintJob(name, ticketId, copies, terminal, department, user)` with exact names.

Implemented Changes
- Inline mutations updated to pass `terminalId` and use `productName` (see `app/queries.js`).
- `executeAutomationCommandForTerminalTicketAsync` now accepts optional `orderUid` to target specific orders.
- Added closed-ticket flow helper in `ticketService.modifyClosedTicket({ terminalId, ticketId, orders })`:
  - `loadTerminalTicket` → add orders (productName/portion/quantity) → `closeTerminalTicket`.
- Terminal registration expects scalar response (the `terminalId`) and persists it per user; 3x retry on 5xx only.

Usage Examples
- Load and modify a closed ticket:
  1) `registerTerminal(...)` → obtain `terminalId`.
  2) `ticketService.modifyClosedTicket({ terminalId, ticketId: 27201, orders: [ { productName:"CUARTO POLLO", portion:"Normal", quantity:2 } ] })`.
  3) Verify with `getTicket(id: 27201) { totalAmount orders { uid name portion quantity } }`.
- Execute an order-level command on the active terminal ticket:
  - `executeAutomationCommandForTerminalTicketAsync(terminalId, "Void", "", orderUid)`.

Troubleshooting
- “No ticket open on terminal”: create/load the ticket first, then retry.
- NullReference/Argument errors: ensure `terminalId` is sent on terminal mutations and names are exact; prefer inline mutations for compatibility.
- Not visible in POS: refresh ticket view or re-open; verify via `getTicket(id: ...)`.

Fast Path (Optimized Command Flow)
- Goal: minimize round-trips; never list tickets on critical path.
- With ticket.id available:
  1) `loadTerminalTicket(terminalId, ticketId)`
  2) `addOrderToTerminalTicket(terminalId, productName, portion, quantity)`
  3) `closeTerminalTicket(terminalId)`
- Without ticket.id (only table/mesa known):
  1) `changeEntityOfTerminalTicket(terminalId, type:"Mesas", name:"<mesa>")` to bind the last unpaid
  2) `addOrderToTerminalTicket(...)`
  3) `closeTerminalTicket(terminalId)`
- Rationale: `getTickets(isClosed:false)` returns only open tickets in current workperiod; closed-but-unpaid won’t appear and would require a second call anyway.
- Observability: UI logs print which branch was used (ticket.id vs mesa binding).
