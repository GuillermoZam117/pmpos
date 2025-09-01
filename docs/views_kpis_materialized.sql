-- Vistas materializadas de KPIs con índices para consulta rápida

-- Ventas diarias por sucursal
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_sales_daily AS
SELECT
  date_trunc('day', t.closed_at) AS day,
  t.branch_id,
  count(*) AS ticket_count,
  sum(t.total) AS total,
  sum(t.total_pretax) AS total_pretax,
  sum(t.taxes) AS taxes
FROM tickets t
WHERE t.is_closed = true AND t.closed_at IS NOT NULL
GROUP BY 1, 2
WITH NO DATA;

CREATE INDEX IF NOT EXISTS idx_mv_sales_daily_branch_day ON mv_sales_daily(branch_id, day);

-- Ticket promedio por día/sucursal (deriva de mv_sales_daily)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_avg_ticket_daily AS
SELECT
  day,
  branch_id,
  total / NULLIF(ticket_count, 0) AS avg_ticket
FROM mv_sales_daily
WITH NO DATA;

CREATE INDEX IF NOT EXISTS idx_mv_avg_ticket_daily_branch_day ON mv_avg_ticket_daily(branch_id, day);

-- Mix de pago por método/día/sucursal
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_payment_mix_daily AS
SELECT
  date_trunc('day', COALESCE(p.paid_at, t.closed_at)) AS day,
  p.branch_id,
  pt.name AS method,
  sum(p.amount) AS amount
FROM payments p
JOIN payment_types pt ON pt.id = p.payment_type_id
LEFT JOIN tickets t ON t.id = p.ticket_id
GROUP BY 1, 2, 3
WITH NO DATA;

CREATE INDEX IF NOT EXISTS idx_mv_payment_mix_daily_bdm ON mv_payment_mix_daily(branch_id, day, method);

-- Ventas por producto/día/sucursal
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_product_sales_daily AS
SELECT
  date_trunc('day', t.closed_at) AS day,
  o.branch_id,
  o.name AS product,
  o.portion,
  sum(o.qty) AS qty,
  sum(o.qty * o.price) AS revenue
FROM orders o
JOIN tickets t ON t.id = o.ticket_id
WHERE t.is_closed = true AND t.closed_at IS NOT NULL
GROUP BY 1, 2, 3, 4
WITH NO DATA;

CREATE INDEX IF NOT EXISTS idx_mv_product_sales_daily_bdp ON mv_product_sales_daily(branch_id, day, product);

