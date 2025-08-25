# Repository Guidelines

## Project Structure & Module Organization
- Source: `app/` — React 17 + Redux app. Key areas: `components/` (UI, PascalCase files), `reducers/`, `services/` (GraphQL, SignalR, auth), `constants/`, `styles/`, `assets/`.
- Entry & config: `app/index.jsx`, `app/index.html`, `webpack.config.js`, `babel.config.js`.
- Tests: `tests/` — Karma + Mocha specs named `*_test.js`.
- Build output: `dist/` (production bundle), `coverage/` (created after tests).
- Scripts & tools: `scripts/`, `.eslintrc`, `.env.development`, `.env.production`.

## Build, Test, and Development Commands
- `npm start`: Run dev server with HMR at webpack-dev-server.
- `npm run debug`: Dev server with extra debug flags.
- `npm run debug:api`: Local API/GraphQL debug helper.
- `npm run build`: Production build to `dist/`.
- `npm test`: Run Karma/Mocha once and produce coverage to `coverage/`.
- `npm run test:tdd`: Watch mode for tests.
- `npm run test:lint`: ESLint over `app/` and `tests/`.
- `npm run clean`: Remove `dist/`.
- `npm run analyze` / `npm run stats`: Bundle analysis helpers.

## Coding Style & Naming Conventions
- Indentation: 2 spaces; line width ~100 where reasonable.
- Quotes: single quotes (ESLint enforced). Allow `console.*` for diagnostics.
- Components: PascalCase files in `app/components` (e.g., `POSView.jsx`).
- Modules/functions: camelCase; constants UPPER_SNAKE_CASE (`ActionTypes.js`).
- Keep side effects in `services/` and state in reducers/actions.

## Testing Guidelines
- Frameworks: Karma + Mocha with webpack preprocessor; headless via PhantomJS.
- Location & naming: place specs under `tests/` as `*_test.js`.
- Coverage: HTML report in `coverage/` (no hard thresholds). Prefer tests for reducers, services, and critical UI flows.
- Commands: `npm test` for CI, `npm run test:tdd` during development.

## Commit & Pull Request Guidelines
- Commits: short, imperative subject (“Fix TableView error”), optional bullets for details. English or Spanish are fine. Reference issues when relevant.
- Branches: `feature/...`, `fix/...`, `chore/...`.
- PRs: clear description, rationale, test results, and screenshots/GIFs for UI. Link related issues and note any config/env changes.

## Architecture Overview
- UI: React 17 with MUI components under `app/components/`; routing via `react-router`.
- State: Redux store (`app/store.js`) with reducers in `app/reducers/` and action creators in `app/actions/`.
- Data: GraphQL via `@apollo/client` and `graphql-request`; setup in `app/apollo.js` and `app/utils/graphqlClient.js`; queries in `app/queries.js`.
- Realtime: SignalR client in `app/signalr.js`; domain-specific calls live in `app/services/*`.
- Auth: JWT handling in `app/services/tokenService.js`; guarded routes via `app/components/PrivateRoute.jsx`.
- Errors & caching: `app/components/ErrorBoundary.jsx`, `app/utils/errorHandler.js`, and `app/services/cacheService.js`.

## Security & Configuration Tips
- Do not commit secrets. Use `.env.*` (ignored by Git) and `dotenv`/webpack for injection.
- GraphQL and POS endpoints live in `app/config.js` and `app/utils/sambapos-config.js`; keep environment-specific values in env files.

## Ticket Creation Runbook
- Verifica config: `terminalName`, `departmentName`, `userName`, `ticketTypeName`, `entityTypeName` en `app/config.js` deben existir en SambaPOS.
- Registro de terminal: cliente `graphiql` o `pmpos` creado en `Users > Applications`. Message Server en modo API (`port+`).
- Flujo: `registerTerminalAsync()` → `createTerminalTicketAsync(terminalId)` → `changeEntityOfTerminalTicket(terminalId, mesa)`.
- Logs: abre consola y filtra `pmpos:queries` y `pmpos:tables` para ver errores GraphQL/HTTP.
- Si falla `registerTerminal`: suele ser por nombres no coincidentes o cliente no registrado. Corrige y reintenta; no depender del `fallback_*` salvo pruebas.

## Conocimiento y Reglas del Proyecto
- Configuración GraphQL (SambaPOS): habilitar API en Message Server poniendo `+` al final del puerto (ej. `9000+`). Endpoint: `http://<server>:<port>/api/graphql`. Registrar clientes `pmpos` y `graphiql` en `Users > Applications`.
- Autenticación: obtener token en `http://<server>:<port>/Token` (form-data: `grant_type=password`, `username`, `password`, `client_id=pmpos`). Usar `Authorization: Bearer <access_token>`. Renovar con `grant_type=refresh_token`.
- Acceso remoto: ejecutar el servicio con usuario Administrador y abrir puertos en firewall si falla fuera de `localhost`.
- Limitaciones conocidas del API: algunos endpoints devuelven `500` en ciertas instalaciones (`registerTerminal`, `getPaymentTypes`, `getTickets`, `createTerminalTicket`, `changeEntityOfTerminalTicket`). Tratar como warnings y usar fallbacks (ver `app/services/*`, `app/utils/cacheService.js`).
- Flujo recomendado de tickets: `registerTerminal` → `createTerminalTicket` → `addOrderToTerminalTicket` → `closeTerminalTicket` → `unregisterTerminal`. Operaciones en `ticketService.js`, `orderService.js`, `paymentService.js`, `automationService.js`.
- Entidades y pantallas: `getEntityScreenItems(name: "MESAS")` lista mesas; `changeEntityOfTerminalTicket` asocia mesa. Estados y tags de órdenes/tickets disponibles vía GraphQL.
- Base de datos: no modificar tablas críticas directamente (Tickets, Orders, Payments, WorkflowStates, TicketEntities). Usar solo GraphQL. SELECT solo para reportes personalizados si es necesario.
- Configuración de la app: editar `app/config.js` para `terminalName`, `userName`, `departmentName`, `ticketTypeName`, `menuName`, `entityScreenName`, etc. Variables sensibles en `.env.*`.
- Ejemplos útiles:
  - `query { getProducts { id name portions { name price } } }`
  - `mutation { addOrderToTerminalTicket(terminalId:"ID", productName:"CUARTO POLLO", quantity:1) { quantity price } }`
- Solución de problemas: si el dev server falla, limpiar caché y reinstalar (`rimraf node_modules && npm cache clean --force && npm install`). Revisar logs y tratar errores 500 esperados como informativos.
