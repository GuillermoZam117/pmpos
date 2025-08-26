# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PMPOS is a React-based web POS application for SambaPOS that provides mobile server and cashier functionality with inherited permissions and functions as if operating directly within SambaPOS. This is a mobile command system that integrates with SambaPOS via GraphQL API and SignalR for real-time functionality.

## Development Commands

- `npm start` - Run development server with HMR on port 8081
- `npm run debug` - Development server with additional debug flags  
- `npm run debug:api` - Local API/GraphQL debug helper for SambaPOS testing
- `npm run build` - Production build to `dist/` directory
- `npm test` - Run Karma/Mocha test suite with coverage reports
- `npm run test:tdd` - Run tests in watch mode for development
- `npm run test:lint` - Run ESLint on `app/` and `tests/` directories
- `npm run clean` - Remove `dist/` build directory
- `npm run analyze` - Bundle analysis and stats generation

## Architecture Overview

### Core Technologies
- **Frontend**: React 17 + Redux with Immutable.js for state management
- **UI Framework**: Material-UI (MUI) v5 with custom dark theme
- **Routing**: React Router v6 with HashRouter for mobile compatibility
- **Data Layer**: GraphQL via Apollo Client + direct GraphQL requests
- **Real-time**: SignalR client for live updates from SambaPOS
- **Authentication**: JWT token-based with automatic refresh
- **Build System**: Webpack 5 with development and production configurations

### Application Structure

**Entry Point**: `app/index.jsx` → `app/components/App.jsx`

**Main Routes**:
- `/pinpad` - Authentication/login screen
- `/tables` - Table management and ticket overview  
- `/pos/:ticketId?` - POS interface for order management

**Key Directories**:
- `app/components/` - React components (PascalCase naming)
- `app/services/` - Business logic and API communication
- `app/reducers/` - Redux state management
- `app/actions/` - Redux action creators
- `app/constants/` - Application constants and enums
- `app/utils/` - Utility functions and helpers
- `tests/` - Test files using Karma + Mocha

### State Management Architecture

**Redux Store Structure** (`app/store.js`):
- `app` - Main application state (tables, tickets, menu, entities)  
- `auth` - Authentication state (token, user, login status)

**Key Reducers**:
- `app/reducers/app.js` - Central app state combining multiple domain reducers
- Auth reducer in `store.js` - Handles login/logout and token management

### SambaPOS Integration

**Configuration** (`app/config.js`):
- Dynamic API URL detection based on hostname or environment variables
- Query parameter overrides for mobile devices (`?api=`, `?port=`, `?user=`, etc.)
- Support for both development proxy and direct API connections

**API Endpoints**:
- GraphQL: `/api/graphql` - Main data operations
- Authentication: `/Token` - OAuth-style token endpoint  
- SignalR: `/signalr` - Real-time notifications

**Required SambaPOS Setup**:
- Message Server API mode enabled (port with `+` suffix, e.g., `9000+`)
- Application client registered (`pmpos` client_id)
- GraphQL API accessible and configured
- Proper firewall rules for remote access

### Critical Services

**Authentication** (`app/services/tokenService.js`):
- JWT token acquisition and refresh
- Automatic token validation and renewal
- Secure token storage with encryption

**GraphQL Operations** (`app/queries.js`):
- Terminal registration and management
- Ticket creation and modification  
- Order management and payment processing
- Entity (table) operations

**Real-time Communication** (`app/signalr.js`):
- Live updates for ticket changes
- Table status synchronization
- Order state notifications

## Development Guidelines

### Code Style
- 2-space indentation, ~100 character line width
- Single quotes for strings (ESLint enforced)  
- PascalCase for React components
- camelCase for functions and variables
- UPPER_SNAKE_CASE for constants
- Allow `console.*` for diagnostic logging

### Component Patterns
- Lazy loading for route components using `React.lazy()`
- Material-UI components with consistent theming
- Error boundaries for graceful failure handling
- Suspense fallbacks with loading indicators

### State Management Patterns
- Immutable.js for Redux state to ensure predictable updates
- Thunk middleware for async actions
- Action creators in `app/actions/` 
- Selector patterns for accessing nested state

### Authentication Flow
1. Token acquisition via username/password
2. Token validation and refresh handling
3. Automatic retry with fallback mechanisms
4. Protected routes using `PrivateRoute` wrapper

## SambaPOS-Specific Configuration

### Required Configuration Values
Update `app/config.js` with SambaPOS-specific values:
- `terminalName` - Must exist in SambaPOS terminals
- `userName` - Valid SambaPOS user
- `departmentName` - Department for ticket operations  
- `ticketTypeName` - Ticket type for orders
- `menuName` - Menu to display products from
- `entityScreenName` - Entity screen (typically "MESAS")

### GraphQL Integration Notes
- Some GraphQL endpoints may return HTTP 500 in certain SambaPOS installations
- Implement fallback mechanisms and cache strategies
- Expected failing endpoints: `registerTerminal`, `getPaymentTypes`, `getTickets`
- Treat 500 responses as warnings rather than errors

### Ticket Operations Workflow
1. `registerTerminal()` - Register POS terminal
2. `createTerminalTicket()` - Create new ticket
3. `changeEntityOfTerminalTicket()` - Assign table/entity
4. `addOrderToTerminalTicket()` - Add products
5. `closeTerminalTicket()` - Complete transaction
6. `unregisterTerminal()` - Clean up

## Testing Approach

**Test Framework**: Karma + Mocha with webpack preprocessing
**Test Location**: `tests/` directory with `*_test.js` naming
**Coverage**: HTML reports generated in `coverage/`
**Test Types**:
- Unit tests for reducers and services
- Integration tests for critical user flows
- Browser functional tests for end-to-end scenarios

## Environment Configuration

### Development
- Uses webpack dev server proxy for SambaPOS API
- Debug logging enabled via `Debug('pmpos:*')`
- Hot module replacement for faster development

### Production  
- Optimized webpack build with content hashing
- Environment variable injection for API endpoints
- Asset optimization and minification

### Mobile/Remote Access
- Dynamic host detection for mobile devices
- Query parameter configuration overrides
- localStorage persistence for connection settings

## Common Issues and Solutions

### GraphQL API Limitations
- Implement graceful degradation for failing endpoints
- Use caching service (`app/services/cacheService.js`) for offline capability
- Log GraphQL errors as informational rather than blocking

### Authentication Issues
- Verify SambaPOS client application is registered
- Ensure Message Server API mode is enabled
- Check firewall settings for remote access
- Validate username/password credentials

### Development Environment
- Clear node_modules and npm cache if dev server fails to start
- Verify SambaPOS API accessibility before frontend development
- Use `npm run debug:api` for API connectivity testing