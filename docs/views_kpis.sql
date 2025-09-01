-- Vistas de KPIs para reporteo

CREATE OR REPLACE VIEW v_sales_daily AS
SELECT
  date_trunc('day', t.closed_at) AS day,
  t.branch_id,
  count(*) AS ticket_count,
  sum(t.total) AS total,
  sum(t.total_pretax) AS total_pretax,
  sum(t.taxes) AS taxes
FROM tickets t
WHERE t.is_closed = true AND t.closed_at IS NOT NULL
GROUP BY 1, 2;

CREATE OR REPLACE VIEW v_avg_ticket_daily AS
SELECT
  d.day,
  d.branch_id,
  d.total / NULLIF(d.ticket_count, 0) AS avg_ticket
FROM v_sales_daily d;

CREATE OR REPLACE VIEW v_payment_mix_daily AS
SELECT
  date_trunc('day', COALESCE(p.paid_at, t.closed_at)) AS day,
  p.branch_id,
  pt.name AS method,
  sum(p.amount) AS amount
FROM payments p
JOIN payment_types pt ON pt.id = p.payment_type_id
LEFT JOIN tickets t ON t.id = p.ticket_id
GROUP BY 1, 2, 3;

CREATE OR REPLACE VIEW v_product_sales_daily AS
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
GROUP BY 1, 2, 3, 4;

