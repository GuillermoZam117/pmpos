# Configuración y Avances

Documento vivo para mantener el contexto del proyecto: qué llevamos, qué falta, deuda técnica y reglas que debemos seguir.

## Estado Actual
- Ingest API (`apps/ingest-api`):
  - Endpoints: `POST /api/ingest/tickets`, `/orders`, `/payments` (batch, Zod-validated).
  - Auth: header `Authorization` + `x-branch-id`; tokens en `INGEST_TOKENS`.
  - Pendiente: mapear `ticketPosUid → ticketId` (orders/payments) y `paymentTypeName → paymentTypeId` (payments).
- Prisma (`prisma/schema.prisma`): modelo central multisucursal definido (tickets, orders, payments, mapeos, conciliaciones, inventario, catálogos, ACL).
- Worker (`workers/middleware`): ejemplo de upsert con `WORKER_BRANCH_ID`.
- Documentación:
  - Esquema SambaPOS: `docs/sambapos_schema.md` (tablas clave y mapeo POS→central).
  - Payloads raw POS: `docs/sambapos_payload_examples.md` (con ejemplos sintéticos para tablas sin datos).
  - Contratos de ingesta normalizados: `docs/sambapos_ingest_contracts.md`.
 - Backend (`backend`):
   - Endpoints auth: `POST /auth/register`, `POST /auth/login`, `GET /health`.
   - Endpoints usuarios: `GET /users`, `GET /users/:id`, `POST /users`, `PUT /users/:id`, `DELETE /users/:id`.
   - Auth: JWT HS256 (`AUTH_JWT_SECRET`), hashing `scrypt` con `node:crypto`.
   - RBAC básico: rutas de usuarios protegidas; admin/owner para CRUD/listado.
 - Frontend (`frontend`, Next.js App Router):
   - API wrapper en `src/lib/api.ts` con `NEXT_PUBLIC_API_URL`, headers JSON y `Authorization: Bearer` automático; manejo de 401.
   - Hooks: `hooks/useAuth.ts`, `hooks/useUsers.ts`.
   - Páginas: `/login` (form + login+redirect), `/dashboard`, `/users` (tabla, búsqueda cliente, paginación 20, CRUD básica con modal), `/settings`.
   - Layout: `components/LayoutShell.tsx` con Sidebar/Topbar; estado de colapso (`ui.sidebarCollapsed`) y tema (`ui.theme`) en `localStorage`; accesibilidad básica (ARIA roles, Escape, backdrop).
   - Estilos: `styles/base.css` + `styles-professional.css` importados en `app/layout.tsx`.

## Próximos Pasos (Roadmap corto)
- Implementar mapeos en Ingest API:
  - `ticketPosUid → ticketId` en Orders y Payments.
  - `paymentTypeName → paymentTypeId` usando `PaymentTypeMapping`/`PaymentType` por sucursal.
- Semillas mínimas (prisma db seed): tipos de pago centrales y un branch demo.
- Mejorar UX `/users`: edición inline opcional, export CSV y estados vacíos más ricos.
- Integrar `GET /roles` en formulario (selector) y chips de sucursales con autocompletar.
- Manejo centralizado de sesión expirada (401) con redirect automático a `/login`.
- Pruebas unitarias mínimas para hooks (`useAuth`, `useUsers`) y componentes tabla/modal.
- Vista/endpoint de conciliación diaria y KPIs base.
 - Añadir tests unitarios para util de JWT/crypto y rutas de auth.

## Deuda Técnica
- API ingest: todo `any/Json` de `tags/states` podría validarse con esquemas más estrictos.
- Normalización de zonas horarias por `branch.timezone` (actualmente se asume UTC en payloads).
- Falta seed de catálogos (PaymentType, Mapping) y fixtures para e2e.
- Observabilidad mínima (logs estructurados ok; faltan métricas/health más detallados).

## Reglas de Desarrollo (siempre vigentes)
- Naming y estilo (TypeScript/React): 2 espacios, sin punto y coma; ESLint/Prettier.
- Carpetas `kebab-case`; componentes `PascalCase.tsx`; hooks `useThing.ts`.
- SQL: palabras clave en mayúsculas, una sentencia por archivo; vistas `Vista<Entity>.sql`, sps `sp_<Verbo><Entidad>.sql`.
- Commits convencionales (`feat(scope): msg`), scopes: `app`, `docs`, `sql`, `prisma`, `tests`.
- Pruebas: unit en `src/**/__tests__/*`, e2e en `e2e/`; meta ≥80% en módulos críticos.
- Seguridad: secretos en `.env.local`; evitar datos productivos en fixtures; sanitizar logs.

## Registro de Avances (Changelog)
- 2025-08-22: Backend inicial `backend/` con auth y usuarios (JWT+scrypt); contratos de ingesta normalizados; ejemplos sintéticos en payloads; sección en AGENTS.md enlazando este documento.
 - 2025-08-22: Frontend base `frontend/` con wrapper API, rutas `/login`, `/dashboard`, `/users`, `/settings`; layout con Sidebar/Topbar y estilos base; scripts `npm run dev`/`build` alineados.
- 2025-08-20: Estructura base de Ingest API, Prisma y worker.

## Decisiones y Suposiciones
- Idempotencia por `(branchId, sourceType, sourceId, sourceHash)`.
- `sourceId` estable: `TicketUid`/`OrderUid`/`Payment.Id`.
- `paymentTypeName` puede mapearse por sucursal vía `PaymentTypeMapping`.

## Riesgos / Mitigaciones
- Diferencias de nombres de tipos de pago entre sucursales → usar mapping obligatorio; validación con fallback y error claro.
- Fechas locales inconsistentes → normalizar a UTC y almacenar timezone del branch.

## Métricas / Objetivos
- Ingest: latencia P95 < 300 ms; error rate < 0.5%.
- Cobertura ≥80% en mapeos/cancelaciones/conciliación.

## Infra / Config
- Variables: `DATABASE_URL`, `INGEST_TOKENS`, `WORKER_BRANCH_ID` (dev), `NEXTAUTH_*` (cuando exista app), `AUTH_JWT_SECRET`, `BACKEND_PORT` (por defecto 3002), `CORS_ORIGIN` (por defecto `http://localhost:3000`).
- Scripts setup DB: `scripts/setup_db.sh` / `.ps1`.
- CORS Backend: habilitado en `backend/src/server.ts` (manual). Métodos permitidos `GET,POST,PUT,DELETE,OPTIONS`; headers `Content-Type, Authorization`.

## Pendientes de Validación
- Pruebas integradas para upsert por idempotencia.
- E2E mínimos con seeds de ejemplo por sucursal.
