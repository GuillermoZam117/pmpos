# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PMPOS is a React-based mobile POS application for SambaPOS that integrates via GraphQL API and SignalR. It provides server/cashier functionality with inherited SambaPOS permissions, acting as if operating directly within SambaPOS. This is a mobile command system for restaurant/retail operations with table management, ticket handling, and real-time synchronization.

## Development Commands

### Core Development
- `npm start` (alias `npm run dev`) - Webpack dev server with HMR on port 8081
- `npm run debug` - Development server with debug logging enabled
- `npm run build` - Production build to `dist/` directory
- `npm run clean` - Remove `dist/` build directory

### Testing
- `npm test` - Single-run Karma + Mocha test suite with coverage
- `npm run test:tdd` - Watch mode for continuous testing
- `npm run test:lint` - ESLint on `app/` and `tests/` directories

### Utilities
- `npm run analyze` - Bundle analysis and stats generation
- `npm run debug:api` - GraphQL diagnostic helper for SambaPOS connectivity
- `npm run smoke:mesa1:new` - Smoke test for new ticket flow (see package.json for full suite)

### Read Service (SQL API)
- `cd server && npm install && npm start` - Standalone Express API for direct SQL reads with caching

## Architecture Overview

### Core Stack
- **Frontend**: React 17 + Redux with Immutable.js
- **UI**: Material-UI v5 with custom dark theme
- **Routing**: React Router v6 with HashRouter
- **Data**: GraphQL (custom implementation) + SignalR for real-time updates
- **Auth**: JWT token-based with automatic refresh
- **Build**: Webpack 5 with dev/production configs

### Application Entry and Routes

**Entry Point**: `app/index.jsx` → `app/components/App.jsx`

**Main Routes**:
- `/pinpad` - Login with sales mode selector (Mesas/Mostrador/Reparto)
- `/tables` - Table/entity management and ticket overview
- `/pos/:ticketId?` - POS interface for order management

### Key Directory Structure

- `app/components/` - React components (PascalCase)
- `app/services/` - Business logic, API communication, SignalR integration
- `app/graphql/` - Canonical GraphQL query strings (single source of truth)
- `app/reducers/` - Redux state management with Immutable.js
- `app/actions/` - Redux action creators
- `app/config/` - Configuration including sales mode presets
- `app/utils/` - Helper functions and utilities
- `server/` - Express read-service for MSSQL with caching and Swagger
- `scripts/` - Smoke tests (mesa1 flows), diagnostics, utilities
- `docs/` - Operational guides, GraphQL documentation, schema references
- `tests/` - Karma + Mocha specs (`*_test.js`)

### State Management

**Redux Store** (`app/store.js`):
- `app` - Main application state (tables, tickets, menu, entities)
- `auth` - Authentication (token, user, login status)

**Patterns**:
- Immutable.js for predictable state updates
- Thunk middleware for async operations
- Action creators in `app/actions/`
- Services handle side effects and API calls

### Configuration System

**Dynamic Configuration** (`app/config.js`):
- Multi-source priority: Query params → localStorage → .env → auto-detected
- Auto-discovery of SambaPOS server on local network
- Sales mode presets (`app/config/salesModes.js`): mesas, mostrador, reparto
- Runtime overrides via URL params: `?api=`, `?port=`, `?user=`, `?mode=`, etc.
- Persistent configuration in localStorage for mobile devices

**Environment Files**:
- `.env.development` - Development defaults (used by webpack-dev-server)
- `.env.production` - Production deployment settings
- See `.env.development` for full list of configurable variables

**Required SambaPOS Integration Settings**:
- `terminalName` - Must exist in SambaPOS terminals
- `departmentName` - Department for ticket operations
- `ticketTypeName` - Ticket type (e.g., "COMEDOR", "TICKET")
- `entityScreenName` - Entity screen (e.g., "MESAS", "CLIENTES")
- `entityTypeName` - Entity type (e.g., "Mesas", "Clientes")
- `menuName` - Menu to display products from

### Critical Services

**GraphQL Service** (`app/services/graphqlService.js`):
- Single executor for all GraphQL operations: `gql()`, `graphqlRequest()`
- Token management via `tokenService.getValidAccessToken()`
- Canonical queries live in `app/graphql/queries.js` (DO NOT duplicate elsewhere)

**Data Manager** (`app/services/dataManager.js`):
- Centralized data loading with multi-level caching (Static, Semi-static, Dynamic, Specific)
- SignalR integration for real-time updates
- 70% reduction in GraphQL queries via intelligent caching
- Debug helper: `window.debugDataManager()`, `window.refreshData('menu'|'tables'|'tickets'|'all')`

**Terminal Service** (`app/services/terminalService.js`):
- Terminal registration with exponential backoff retry (3 attempts: 1s, 2s, 4s)
- Multi-user terminal management
- Event-driven callbacks for registration lifecycle
- Debug helper: `window.debugTerminal()`, `window.registerTerminalManual('user')`

**Ticket Promotion Service** (`app/services/ticketPromotionService.js`):
- Automatic promotion of local tickets to server tickets
- Idempotent operations with persistence and replay
- Exponential backoff for failed promotions
- Debug helpers: `window.debugTicketPromotion()`, `window.retryTicketPromotion('uid')`, `window.clearFailedTickets()`

**Token Service** (`app/services/tokenService.js`):
- JWT acquisition, validation, and automatic refresh
- Secure encrypted storage
- Automatic renewal before expiry

**Read Service** (`server/index.js`):
- Express API for direct MSSQL reads (port 4005 by default)
- Bypasses GraphQL for heavy read operations (tables, tickets, menu)
- Swagger documentation at `/api-docs`
- API key authentication for internal endpoints
- Caching layer with configurable TTLs

### SambaPOS Integration

**API Endpoints**:
- GraphQL: `/api/graphql` - Mutations and queries
- Authentication: `/Token` - OAuth-style JWT endpoint
- SignalR: `/signalr` - Real-time notifications

**Required SambaPOS Setup**:
- Message Server API mode enabled (port with `+` suffix, e.g., `9000+`)
- Application client registered (default `client_id`: `pmpos`)
- GraphQL API accessible
- Firewall rules configured for remote access

**Ticket Operations Workflow**:
1. `registerTerminal()` - Register POS terminal (auto-retry with backoff)
2. `createTerminalTicket()` - Create new ticket
3. `changeEntityOfTerminalTicket()` - Assign table/entity
4. `addOrderToTerminalTicket()` - Add products
5. `payTerminalTicket()` / `executePayment()` - Process payments
6. `closeTerminalTicket()` - Complete transaction
7. `unregisterTerminal()` - Clean up on logout

**GraphQL Quirks**:
- Some endpoints may return HTTP 500 in certain SambaPOS installations
- Implement graceful degradation and fallback strategies
- Expected potentially-failing endpoints: `registerTerminal`, `getPaymentTypes`, `getTickets`
- Treat 500s as warnings; retry with backoff where appropriate

## Code Style and Conventions

### Naming
- **React Components**: PascalCase filenames and exports
- **Functions/Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **GraphQL queries**: Descriptive names in `app/graphql/queries.js`

### ESLint Rules
- 2-space indentation
- Single quotes for strings
- ~100 character line width
- `console.*` allowed (diagnostic logging is expected)

### Component Patterns
- Lazy loading with `React.lazy()` for route components
- Material-UI theming via `@mui/material` and `@mui/styles`
- Error boundaries for graceful failure handling
- Suspense fallbacks with loading indicators

### GraphQL Best Practices
- **Single Source of Truth**: All queries in `app/graphql/queries.js`
- **Never duplicate**: Import from canonical file in services
- **Reference Guide**: `docs/GRAPHQL_CANONICAL_GUIDE.md` for tested flows and payloads
- **Use GraphQL Service**: Always use `app/services/graphqlService.js` executor
- **Token Management**: Use `tokenService.getValidAccessToken()` for auth

## Sales Modes System

**Presets** (`app/config/salesModes.js`):
- **mesas**: Traditional table service (entityType: "Mesas")
- **mostrador**: Counter/cashier service (no entity)
- **reparto**: Delivery service (entityType: "Clientes")

Each mode overrides `departmentName`, `ticketTypeName`, `entityTypeName`, `entityScreenName`, and `menuName`. Users select mode at login; settings persist to localStorage.

## Development Workflow

### Webpack Dev Server
- Runs on port 8081 with HMR
- Proxies API requests to SambaPOS server
- Uses `.env.development` for configuration
- Auto-detects local network IP for mobile access

### Production Build
- Optimized bundle with content hashing
- Environment variable injection
- Asset optimization and minification
- Deploy `dist/` directory to web server

### Mobile/Remote Access
- Dynamic host detection for IP-based connections
- Query parameter configuration: `?api=http://192.168.1.10:9000&mode=mesas`
- localStorage persistence for connection settings
- Auto-discovery scans common ports (9000, 8080, 3000)

## Testing Strategy

**Framework**: Karma + Mocha with webpack preprocessing

**Test Location**: `tests/` directory with `*_test.js` naming

**Coverage**: HTML reports in `coverage/` directory

**Smoke Tests**: Available in `scripts/` for critical flows:
- New ticket creation
- Add/void/gift orders
- Payment processing (partial, mixed)
- Ticket closing and reopening
- See `package.json` scripts section for full suite

## Common Issues

### GraphQL Connectivity
- Verify SambaPOS Message Server API is enabled (port suffix `+`)
- Check client application registration in SambaPOS
- Validate firewall rules for remote access
- Use `npm run debug:api` for diagnostics

### Development Environment
- If dev server fails: clear `node_modules`, `npm cache clean --force`, `npm install`
- Verify SambaPOS API is accessible before starting frontend
- Check `.env.development` for correct server IP/port
- Use browser console debug helpers to verify state

### Authentication
- Ensure username/password match SambaPOS user credentials
- Verify `client_id` is registered in SambaPOS applications
- Check token expiry settings (default: 365 days validity)
- Token is encrypted and stored in localStorage

### Read Service
- Start separately: `cd server && npm start`
- Requires MSSQL connection details in `server/.env`
- Default port 4005 (configurable via `READ_SERVICE_URL`)
- API key required for internal endpoints (header: `X-INTERNAL-API-KEY`)

## Documentation References

**Primary Docs**:
- `docs/GRAPHQL_CANONICAL_GUIDE.md` - Tested GraphQL flows and payloads (source of truth)
- `docs/Guia_Flujo_Terminal.md` - Terminal ticket flow guide
- `AGENTS.md` - Repository guidelines and conventions
- `README.md` - Installation and basic configuration

**Schema and Contracts**:
- `docs/sambapos_schema.md` - SambaPOS database schema
- `docs/sambapos_payload_examples.md` - Example GraphQL payloads
- `docs/sambapos_ingest_contracts.md` - API contract definitions

## Debug Helpers (Browser Console)

**Data Manager**:
```javascript
window.debugDataManager()           // Show cache status and statistics
window.refreshData('menu')          // Force refresh menu data
window.refreshData('tables')        // Force refresh tables
window.refreshData('tickets')       // Force refresh tickets
window.refreshData('all')           // Full data refresh
```

**Ticket Promotion**:
```javascript
window.debugTicketPromotion()             // Show promotion queue status
window.retryTicketPromotion('ticket-uid') // Manual retry failed promotion
window.clearFailedTickets()               // Clear failed ticket queue
```

**Terminal Registration**:
```javascript
window.debugTerminal()                    // Show terminal registration status
window.registerTerminalManual('username') // Force terminal registration
```

## Known Limitations

- Some GraphQL endpoints return HTTP 500 in certain SambaPOS versions (expected)
- Terminal registration may require retry on first connection
- SignalR reconnection is automatic but may have brief delays
- Read service requires separate MSSQL connection (optional optimization)
- Smoke tests require manual execution (no CI integration yet)
