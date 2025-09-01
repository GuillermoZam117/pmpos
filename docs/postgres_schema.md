# Esquema PostgreSQL Multisucursal

## Alcance
Modelo centralizado para integrar múltiples sucursales SambaPOS. Todas las entidades operativas incluyen `branch_id` y metadatos de origen para idempotencia y trazabilidad.

## Principios de diseño
- PKs `uuid`; referencias con `uuid` y `ON DELETE RESTRICT`.
- Tiempos `timestamptz` (UTC); importes `numeric(12,2)`.
- Campos flexibles en `jsonb` para etiquetas/estados POS.
- Idempotencia: único por `(branch_id, source_type, source_id, source_hash)`.

## Entidades clave
- `branches(id, code, name, timezone)`
- `terminals(id, branch_id, name)`
- `employees(id, branch_id, name, role)`
- `work_periods(id, branch_id, start_at, end_at)`
- `tickets(id, branch_id, pos_ticket_uid, number, opened_at, closed_at, total, taxes, tags jsonb, source_*)`
- `orders(id, ticket_id, branch_id, menu_item_id, name, portion, qty numeric, price numeric, tags jsonb, source_*)`
- `payments(id, ticket_id, branch_id, payment_type_id, amount, tendered_amount, paid_at, data jsonb, source_*)`
- `payment_types(id, branch_id, name, processor jsonb)`
- `payment_type_mapping(id, branch_id, pos_payment_type, central_payment_type_id, fees jsonb)`
- `cash_movements(id, branch_id, work_period_id, type, amount, occurred_at, note)`
- `cancellations(id, branch_id, ticket_id, order_id, status, reason, evidence jsonb, requested_by, approved_by, requested_at, decided_at)`
- `bank_deposits(id, branch_id, account, amount, deposited_at, reference)`
- `reconciliations(id, branch_id, date, method, pos_amount, bank_amount, diff_amount, status, details jsonb)`

## Catálogos e inventario
- Productos: `product_categories`, `products` con SKUs y categorías.
- Precios: `price_lists` por sucursal u horizontales y `product_prices` (porción opcional).
- Menú (opcional): `menus`, `menu_categories`, `menu_items` mapeando a `products`.
- Inventario: `inventory_units`, `inventory_items`, `inventory_documents`, `inventory_transactions` para entradas/salidas y costos.

## Logs y evidencias
- `sync_logs`: auditoría de importación/sincronización con `entity`, `action`, `status`, `payload`.
- `attachments`: archivos vinculados a cualquier entidad (`entity_type`, `entity_id`), útil para evidencias en `cancellations`.

## Acceso y roles (si aplica)
- `roles(permissions jsonb)`, `users(role_id)`, `user_branches` para ámbito de sucursal.
- Compatible con NextAuth: estos catálogos pueden convivir o mapearse a tu IdP.

## Claves e índices (ejemplos)
- Índice por sucursal y fecha para consultas diarias: `CREATE INDEX idx_tickets_branch_closed ON tickets(branch_id, closed_at);`
- Idempotencia en entidades de sincronización:
  `UNIQUE(branch_id, source_type, source_id, source_hash)`.

## Convenciones y tipos
- Nombres en `snake_case`; columnas de auditoría: `created_at`, `updated_at`, `created_by`.
- Columnas de origen: `source_type` (e.g. 'sambapos'), `source_id` (int/nvarchar original), `source_hash` (sha1 del payload), `raw jsonb` opcional.

## Migraciones y herramientas
- Esquema DDL: `docs/postgres_schema.sql`
- Prisma: `prisma/schema.prisma`
- Seeds y vistas:
  - Seeds base: `docs/seeds_base.sql`
  - UPSERTs de ingestión: `docs/upserts_examples.sql`
  - Vistas KPIs: `docs/views_kpis.sql`
  - Vistas KPIs materializadas: `docs/views_kpis_materialized.sql` + refresh `docs/refresh_kpis.sql`
- Ejecución con psql: ver `docs/psql_examples.md`

## Mapeo SambaPOS → Central
- Tickets: `Tickets.Id/Uid/Date/TotalAmount` → `tickets.id (uuid generado) / pos_ticket_uid / opened_at, closed_at / total`.
- Orders: `Orders.TicketId/MenuItemName/Quantity/Price` → `orders.ticket_id/name/qty/price`.
- Payments: `Payments.TicketId/PaymentTypeId/Amount/Date` → `payments.ticket_id/payment_type_id/amount/paid_at`.
- PaymentTypes: `PaymentTypes.Name` → `payment_types.name`; mapeo POS→central en `payment_type_mapping`.
- WorkPeriods: `WorkPeriods.StartDate/EndDate` → `work_periods.start_at/end_at`.

## Relaciones (FKs)
- `terminals.branch_id → branches.id`
- `employees.branch_id → branches.id`
- `work_periods.branch_id → branches.id`
- `tickets.branch_id → branches.id`
- `orders.ticket_id → tickets.id`, `orders.branch_id → branches.id`
- `payments.ticket_id → tickets.id`, `payments.payment_type_id → payment_types.id`, `payments.branch_id → branches.id`
- `payment_type_mapping.branch_id → branches.id`, `central_payment_type_id → payment_types.id`
- `cash_movements.work_period_id → work_periods.id`
- `cancellations.ticket_id → tickets.id`, `cancellations.order_id → orders.id`

## Upsert e idempotencia (ejemplo)
```sql
INSERT INTO tickets (branch_id, pos_ticket_uid, source_type, source_id, source_hash, total)
VALUES ($1, $2, 'sambapos', $3, $4, $5)
ON CONFLICT (branch_id, source_type, source_id, source_hash)
DO UPDATE SET total = EXCLUDED.total, updated_at = now()
RETURNING id;
```

## Consultas de ejemplo
- Ventas y pagos por día/sucursal:
```sql
SELECT date_trunc('day', t.closed_at) AS d, t.branch_id,
       sum(t.total) AS total, sum(p.amount) AS pagado
FROM tickets t
LEFT JOIN payments p ON p.ticket_id = t.id
GROUP BY 1,2 ORDER BY 1 DESC;
```
- Reconciliación tarjeta vs depósitos:
```sql
SELECT r.date, r.branch_id, r.method, r.pos_amount, r.bank_amount, r.diff_amount
FROM reconciliations r
WHERE r.status <> 'balanced';
```

## Índices recomendados (además de los incluidos)
- `tickets(branch_id, closed_at)` para reportes diarios.
- `payments(ticket_id)` y `orders(ticket_id)` para agregados rápidos.
- `cancellations(branch_id, status)` para colas de autorización.
- `sync_logs(branch_id, created_at)` para trazabilidad de jobs.
- `product_prices(price_list_id)` para resolución de precios.

## Notas de particionado (opcional)
Para alto volumen, usar rango mensual por `closed_at` en `tickets`, `orders`, `payments` o lista por `branch_id`. Si eliges particionado real, define las tablas como `PARTITION BY RANGE/LIST` desde el inicio y crea particiones por mes/sucursal.

## RLS y permisos por sucursal
- Habilitado RLS para tablas con `branch_id`. Política: si `app.branch_id` está definida en la sesión, restringe por ese valor; si no, acceso total (jobs del sistema).
- Ejemplo de sesión: `SET app.branch_id = '...uuid...';` para limitar consultas. Quita la variable para tareas administrativas.
- Roles sugeridos: `app_rw` (RW) y `report_ro` (RO) con GRANTs mínimos. Ver comentarios en `docs/postgres_schema.sql`.

## Migraciones y versionado
- Desarrollo: `npx prisma migrate dev` genera y aplica migraciones locales.
- Staging/Prod: `npx prisma migrate deploy`. Evita cambiar migraciones ya aplicadas; crea nuevas.
- Rollback: crear migración inversa o snapshot SQL puntual (tener backups).
- Naming: `YYYYMMDDHHmm_<feature>`.

## Rendimiento y operación
- Índices añadidos: `payments(branch_id, paid_at)`, `orders(branch_id)`, GIN en `tags`/`states` de tickets y órdenes.
- Observabilidad: activa `pg_stat_statements`; usa EXPLAIN para rutas críticas.
- KPIs: usa las vistas normales o materializadas; refresca con `docs/refresh_kpis.sql` (cron/job scheduler).

## Backups y recuperación
- Usa PITR (Point-In-Time Recovery): base backups + WAL (pgBackRest, WAL-G o managed).
- Prueba restores periódicos y documenta RTO/RPO.

## Consistencia de datos
- Checks incluidos: montos no negativos en tickets/pagos.
- Reglas de negocio: total pagado ≤ total del ticket se valida a nivel aplicación o con trigger DEFERRABLE (opcional).
- Workflow de cancelaciones: enum `cancellation_status` en Postgres; transición validada a nivel aplicación.

## Seguridad adicional
- Conexiones SSL/TLS, rotación de secretos, mínimos privilegios.
- Sanitiza `sync_logs.payload` y evita PII innecesaria.

## Adjuntos/Evidencias
- `attachments` almacena metadatos; guarda archivos en S3/GCS/Azure Blob. Usa URLs firmadas con TTL y políticas de retención/limpieza.

## Pipeline de ingestión
1) Cargar catálogos (`payment_types`, mapeos, productos, listas de precios).
2) Tickets → Órdenes → Pagos (en ese orden, transaccional cuando sea posible).
3) Idempotencia por `(branch_id, source_type, source_id, source_hash)` y logging en `sync_logs` para errores (dead-letter manual si se requiere).
