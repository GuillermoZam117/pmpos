## Plan híbrido: GraphQL para writes, lecturas SQL para hot paths

Resumen breve
- Mantener GraphQL como la ruta de escritura (crear tickets, agregar órdenes, pagos, Automation Commands).
- Implementar un servicio de solo-lectura (read-only) que consulte directamente la base de datos SambaPOS para lecturas de alta frecuencia: mesas, tickets activos, detalles de ticket y menú.
- El frontend usará los endpoints de lectura para operaciones frecuentes; las mutaciones seguirán usando GraphQL. Incluir fallback a GraphQL si el servicio de lectura no responde.

Endpoints propuestos
- GET /internal-api/active-tickets
  - Fuente: `dbo.VistaTicketsEnriquecida` (docs/sql_implementacion/VistaTicketsEnriquecida.sql)
  - Devuelve: TicketId, TicketUid, TicketNumber, RemainingAmount, TotalAmount, Entities, OrdersCount, IsClosed, MesaNombre, LastUpdateTime

- GET /internal-api/tickets/:id/details
  - Fuente: `dbo.VistaDetalleOrdenes` (docs/sql_implementacion/VistaDetalleOrdenes.sql)
  - Devuelve: encabezado del ticket + lista de órdenes (orderId, menuItemName, portionName, quantity, price, orderTags, isVoid)

- GET /internal-api/tables
  - Fuente: combinación TicketEntities + VistaTicketsEnriquecida o `getEntityScreenItems` si se prefiere GraphQL
  - Devuelve: lista de mesas con estado (LIBRE / CUENTA / OCUPADO) y ticket asociado (si aplica)

SQL vistas / procedimientos recomendados (candidatos desde `docs/`)
- `docs/sql_implementacion/VistaTicketsEnriquecida.sql` — vista enriquecida, principal para lista de tickets activos.
- `docs/sql_implementacion/VistaDetalleOrdenes.sql` — detalle por orden por ticket.
- `docs/sql/sp_ConsultarTicketPorID.sql` (si existe) — procedimiento para obtener un ticket por id.

Cambios mínimos en frontend
- `app/services/dataManager.js`: cambiar llamadas de alta frecuencia (p. ej. `getTickets(isClosed:false)`) por `fetch('/internal-api/active-tickets')` cuando la feature flag esté activa; normalizar la respuesta al shape actual.
- `app/queries.js`: agregar wrappers `fetchActiveTickets()`, `fetchTicketDetails(id)`, `fetchTables()` que llaman a los endpoints nuevos.
- Hooks: `useMesasStatus.js`, y cualquier hook de polling deben usar la nueva API y aplicar backoff/jitter.
- Fallback: si el endpoint de lectura falla, volver a llamar al GraphQL correspondiente.

Seguridad y despliegue
- Crear un usuario de BD con permisos SELECT únicamente en las vistas necesarias.
- Proteger el servicio con:
  - conexión TLS
  - token interno configurable (p. ej. `X-INTERNAL-API-KEY`) y/o restringir por IP/VNET
  - CORS restringido a orígenes permitidos
- Mantener las credenciales en variables de entorno o en secret store (KeyVault, etc.)

Performance y caching
- Cache en servidor (TTL ~1s-3s) para `active-tickets` si la latencia es crítica; considerar Redis si el cluster lo requiere.
- Ajustar polling a 2000–3000ms por defecto y añadir jitter/backoff para reducir thundering herd.

Edge cases y consideraciones
- Consistencia eventual: después de una mutación GraphQL, el read service puede tener un pequeño retardo; usar actualizaciones optimistas en el cliente cuando sea crítico.
- Asegurar filtrado por `departmentId`/`terminalId` cuando corresponda para evitar exponer más datos de los necesarios.

Pasos siguientes (próximas tareas)
1. Implementar prototipo del servicio read-only (Node/Express) con endpoints `active-tickets` y `tickets/:id/details`. (Puedo hacerlo en un branch).
2. Añadir adaptadores en `app/queries.js` y actualizar `dataManager.js` con feature flag.
3. Tests y pruebas de latencia; despliegue en staging y rollout gradual.

---
Por favor revísalo y dime qué detalle quieres que expanda o modifique; luego lo commitamos en un branch para prototipar.

## Paso a paso: creación e implementación (control de desarrollo)

Objetivo: guiar al equipo para implementar la solución de forma controlada, con ramas, QA y despliegue seguro.

1) Preparación del branch
  - Crear branch de trabajo a partir de `master` llamado `feature/hybrid-read-service`.
  - Estructura del branch:
    - `server/read-service/` — código Node/Express del read service.
    - `app/queries.js` — nuevas wrappers de lectura.
    - `app/hooks/useTicket.js`, `app/hooks/useTerminalSession.js` — nuevos hooks.
    - `docs/hybrid-read-architecture-plan.md` — este documento (actualizado).

  Comandos ejemplo (PowerShell):
  ```powershell
  git checkout master
  git pull origin master
  git checkout -b feature/hybrid-read-service
  ```

2) Implementar prototipo del servicio read-only (server)
  - Crear proyecto Node mínimo con `package.json` (express, mssql, dotenv, helmet, cors).
  - Estructura mínima:
    - `server/index.js` — arranque del servidor
    - `server/routes/activeTickets.js` — endpoint `/internal-api/active-tickets`
    - `server/routes/ticketDetails.js` — endpoint `/internal-api/tickets/:id/details`
    - `server/lib/db.js` — pool de conexión (leer credenciales desde `.env`)
    - `server/middleware/auth.js` — validación de `X-INTERNAL-API-KEY`
  - Implementar consultas usando las vistas ya disponibles (`VistaTicketsEnriquecida`, `VistaDetalleOrdenes`).
  - Añadir cache simple en memoria con TTL configurable.

  Quick start (local):
  ```powershell
  cd server
  npm install
  $env:INTERNAL_API_KEY = 'local-test-key'
  $env:DB_CONN = 'Server=.;Database=SambaPOS;User Id=readonly;Password=XXXX;'
  node index.js
  ```

3) Cambios frontend mínimos
  - Añadir wrappers en `app/queries.js`:
    - `fetchActiveTickets()` → calls `/internal-api/active-tickets` and maps response to current UI shape.
    - `fetchTicketDetails(ticketId)` → calls `/internal-api/tickets/:id/details`.
  - Actualizar `app/services/dataManager.js` para usar la nueva función bajo `REACT_APP_USE_SQL_READS=true`.
  - Añadir fallback: si fetch falla, llamar a GraphQL `getTickets(isClosed:false)` o `getTicket(id)`.

4) Tests y QA
  - Unit tests: rutas del server (mock DB), wrappers frontend (mock fetch) y hooks (mock responses).
  - Integración local: levantar server+frontend con variables apuntando a DB de staging/local.
  - Escenarios obligatorios:
    - Nueva mesa (crear ticket, asignar mesa, añadir orden, ver en vista de mesas)
    - Mesa ocupada (cargar ticket existente, añadir/void/regalo, pago y cierre)
    - Race conditions: addOrder seguido de read inmediato (orderUid retrieval)
    - SignalR reconexión y invalidación

5) CI/CD
  - Pipeline: lint → unit tests → build docker image (server) → push image to registry → deploy to staging.
  - GitHub Actions example steps (high-level):
    - name: CI
     run: npm ci && npm test
    - name: Build Docker
     run: docker build -t org/read-service:${{ github.sha }} ./server

6) Despliegue y rollout controlado
  - Desplegar a `staging` primero; habilitar `REACT_APP_USE_SQL_READS` en un subset de terminals mediante env/feature-flag.
  - Validar métricas: latencia p95, error rate, DB pool saturation.
  - Rollout gradual: 10% → 50% → 100% si OK.
  - Rollback: desactivar feature flag y volver a GraphQL; si service falla, redeploy previous image.

7) Monitoreo y alertas
  - Métricas: request latency, 5xx rate, DB pool usage, cache hit ratio.
  - Alertas: p95 latency > 300ms, 5xx rate > 1%, DB connection errors.

Checklist de control de desarrollo (para PR)
 - [ ] Branch creado y push al repo remoto
 - [ ] Tests unitarios y de integración añadidos y verdes
 - [ ] Linter/format configurado y válido
 - [ ] Documentación actualizada (`docs/hybrid-read-architecture-plan.md`)
 - [ ] CI pipeline configurado y verde
 - [ ] Despliegue a staging y tests manuales pasados
 - [ ] Rollout plan y feature flag listos

---
Una vez confirmes, implemento los cambios en `feature/hybrid-read-service` y preparo el PR con los archivos del prototipo y las modificaciones frontend básicas.

## Contratos de endpoints y formatos (SQL + JSON shapes)

1) GET /internal-api/active-tickets
   - SQL (base):
     ```sql
     SELECT TicketId, TicketUid, TicketNumber, TotalAmount, RemainingAmount, MesaNombre, IsClosed, LastUpdateTime
     FROM dbo.VistaTicketsEnriquecida
     WHERE IsClosed = 0
     ORDER BY LastUpdateTime DESC
     ```
   - JSON response shape (array):
     ```json
     [
       {
         "ticketId": 27202,
         "ticketUid": "TKT-0001",
         "ticketNumber": "12",
         "totalAmount": 450.0,
         "remainingAmount": 450.0,
         "mesaNombre": "12",
         "isClosed": false,
         "lastUpdateTime": "2025-08-27T12:34:56Z",
         "entities": [ { "type": "Mesas", "name": "12" } ],
         "ordersCount": 3
       }
     ]
     ```

2) GET /internal-api/tickets/:id/details
   - SQL (base):
     ```sql
     SELECT * FROM dbo.VistaDetalleOrdenes WHERE TicketId = @ticketId ORDER BY LastUpdateDateTime ASC;
     -- Header: SELECT TicketId, TicketUid, TicketNumber, TotalAmount, RemainingAmount FROM dbo.VistaTicketsEnriquecida WHERE TicketId = @ticketId;
     ```
   - JSON response shape:
     ```json
     {
       "ticketId": 27202,
       "ticketUid": "TKT-0001",
       "ticketNumber": "12",
       "totalAmount": 450.0,
       "remainingAmount": 450.0,
       "entities": [ { "type": "Mesas", "name": "12" } ],
       "orders": [
         { "orderId": 1001, "menuItemId": 1781, "menuItemName": "POLLO", "portionName": "Normal", "quantity": 1, "price": 250.0, "isVoid": false }
       ]
     }
     ```

3) GET /internal-api/tables
   - SQL (base):
     ```sql
     SELECT MesaNombre, TicketId, IsClosed, RemainingAmount, LastUpdateTime
     FROM dbo.VistaTicketsEnriquecida
     WHERE (MesaNombre IS NOT NULL)
     ORDER BY MesaNombre;
     ```
   - JSON response shape:
     ```json
     [ { "mesaNombre": "12", "ticketId": 27202, "status": "CUENTA", "remainingAmount": 450.0 } ]
     ```

Notas sobre contratos
- Todos los endpoints deben respetar cabeceras de seguridad (p. ej. `X-INTERNAL-API-KEY`) y devolver 401 si faltan.
- TTL de cache recomendada: `active-tickets`: 1000-3000ms, `ticket details`: 0.5-2s dependiendo de carga.
- Si el endpoint no está disponible, el cliente debe caer a GraphQL correspondiente.

---
Apunta si quieres que incluya ejemplos de llamadas curl o pruebas con `curl`/`httpie` en el documento.
