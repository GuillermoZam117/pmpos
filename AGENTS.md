# Repository Guidelines

## Project Structure & Module Organization
- `app/`: React 17 + Redux UI. Entry `index.jsx`; config in `config.js`; state in `actions/`, `reducers/`, `store.js`; side effects in `services/` + `signalr.js`; UI in `components/` (PascalCase), helpers in `hooks/`, `contexts/`, `utils/`; styles/assets under `styles/` and `assets/`; GraphQL strings in `graphql/`.
- `tests/`: Karma + Mocha specs named `*_test.js`.
- `scripts/`: smoke flows (Mesa1 add/pay/close), diagnostics, and bundle utilities.
- `server/`: Express read-service for MSSQL with caching and Swagger (runs separately when needed).
- `docs/` hold operational guides; build/config live in `webpack.config.js`, `babel.config.js`, and `.eslintrc`.
- GraphQL referencia canónica: `docs/GRAPHQL_CANONICAL_GUIDE.md` (fechas y flujos probados más recientes).
- Login expone selector de “Tipo de venta” (Mostrador, Mesas, Reparto) que guarda `department/ticket/entity` en `localStorage`; presets en `app/config/salesModes.js`.
- Panel avanzado incluye pestaña “SQL Helper” para capturar host/puerto/base/credenciales del read-service y guardarlos en `localStorage`; tras aplicar, reinicia el helper manualmente.

## Build, Test, and Development Commands
- `npm start` (alias `npm run dev`): webpack-dev-server with HMR on 8080 (reads `.env.development`).
- `npm run debug`: same dev server with extra logging; `npm run debug:api` exercises GraphQL via Node.
- `npm run build`: production bundle to `dist/`; `npm run clean` removes it; `npm run analyze` / `npm run stats` emit bundle diagnostics.
- `npm test`: single-run Karma + Mocha + PhantomJS with coverage → `coverage/`; `npm run test:tdd` watches.
- `npm run test:lint`: ESLint over `app/` and `tests/`.
- Smoke flows: `npm run smoke:mesa1:new`, `...:add`, `...:pay`, etc. (see scripts for args). Default base `http://localhost:9000`.
- Read-service: `cd server && npm install && npm start` (loads `.env`).

## Coding Style & Naming Conventions
- ESLint enforces single quotes; `no-console` disabled for ops logging. Prefer 2-space indent and ~100-character lines.
- Components use PascalCase filenames; functions/variables camelCase; constants UPPER_SNAKE_CASE.
- Keep side effects in `services/`; reducers/actions stay pure; GraphQL literals should live in `app/graphql/` and be reused.

## Testing Guidelines
- Tests sit in `tests/` with suffix `_test.js`; mirror feature areas to ease ownership.
- Karma + Mocha run through webpack; coverage renders HTML under `coverage/`.
- Update smoke scripts when altering ticket/payment flows; note required params in the PR.

## Commit & Pull Request Guidelines
- Commits: short, imperative subjects (Spanish or English), e.g., “ajuste en pagos”; group related changes only.
- Branches: `feature/...`, `fix/...`, `chore/...`.
- PRs: state intent, env/config changes, impacted screens, and test evidence (`npm test`, smoke output, screenshots/GIFs). Link issues when applicable.

## Security & Configuration Tips
- Never commit secrets. Use `.env.*`; common vars: `SAMBAPOS_API_URL`, `SAMBAPOS_API_PORT`, `SAMBAPOS_USERNAME`, `SAMBAPOS_PASSWORD`, `SAMBAPOS_CLIENT_ID`.
- UI defaults live in `app/config.js`; runtime overrides via query params (`?api=...`, `?port=...`) or `.env.production` for deployments.
- The read-service pulls MSSQL creds from `.env`; keep ports private and enable HTTPS/Helmet defaults in production.
