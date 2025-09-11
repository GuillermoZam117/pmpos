# Repository Guidelines

## Project Structure & Module Organization
- Source: `app/` — React 17 + Redux. UI in `app/components/` (PascalCase, e.g., `POSView.jsx`); state in `app/reducers/`; side effects in `app/services/`; shared `app/constants/`, `app/styles/`, `app/assets/`.
- Entry & config: `app/index.jsx`, `app/index.html`, `webpack.config.js`, `babel.config.js`.
- Tests: `tests/` with `*_test.js` (Karma + Mocha).
- Output: `dist/` (build), `coverage/` (after tests). Tooling: `scripts/`, `.eslintrc`, `.env.development`, `.env.production`.

## Build, Test, and Development Commands
- `npm start`: Dev server with HMR.
- `npm run debug` / `npm run debug:api`: Extra diagnostics and API helpers.
- `npm run build`: Production bundle to `dist/`.
- `npm test`: Run Karma/Mocha once; writes `coverage/`.
- `npm run test:tdd`: Test watch mode.
- `npm run test:lint`: ESLint over `app/` and `tests/`.
- `npm run clean`, `npm run analyze`, `npm run stats`: Clean and bundle analysis.

## Coding Style & Naming Conventions
- Indentation: 2 spaces; ~100 chars/line; single quotes (ESLint enforced). `console.*` allowed for diagnostics.
- Components: PascalCase files under `app/components/`.
- Modules/functions: camelCase; constants: UPPER_SNAKE_CASE (e.g., `ActionTypes.js`).
- Keep side effects in `services/`; reducers/actions manage state.

## Testing Guidelines
- Frameworks: Karma + Mocha (webpack preprocessor; PhantomJS headless).
- Location: `tests/`; naming: `*_test.js`.
- Coverage: HTML in `coverage/`. Prioritize reducers, services, and critical UI flows.
- Commands: `npm test` (CI) and `npm run test:tdd` (dev).

## Commit & Pull Request Guidelines
- Commits: short, imperative subject (e.g., “Fix TableView error”); bullets optional; English or Spanish; reference issues when relevant.
- Branches: `feature/...`, `fix/...`, `chore/...`.
- PRs: clear description, rationale, test results, and screenshots/GIFs for UI; link related issues; note any config/env changes.

## Architecture Overview
- UI: React 17 + MUI; routing via `react-router`.
- State: Redux store (`app/store.js`), reducers in `app/reducers/`, actions in `app/actions/`.
- Data: GraphQL via `@apollo/client` and `graphql-request` (`app/apollo.js`, `app/utils/graphqlClient.js`, `app/queries.js`).
- Realtime: SignalR (`app/signalr.js`); domain calls in `app/services/*`.
- Auth & errors: JWT in `app/services/tokenService.js`; guards in `app/components/PrivateRoute.jsx`.

## Security & Configuration Tips
- Do not commit secrets. Use `.env.*` with webpack/dotenv injection.
- Endpoints: `app/config.js`, `app/utils/sambapos-config.js`. Dynamic host via `?api=...` or `?port=...` (stored in `localStorage`). Fixed envs via `SAMBAPOS_API_URL` or `SAMBAPOS_API_PORT`.
- Credentials: set `SAMBAPOS_USERNAME`, `SAMBAPOS_PASSWORD`, `SAMBAPOS_CLIENT_ID`. SambaPOS API requires Message Server port with `+` and token at `/Token`.

