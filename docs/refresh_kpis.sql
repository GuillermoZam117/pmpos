-- Refresco de vistas materializadas de KPIs
-- Usa CONCURRENTLY para evitar bloqueos de lectura (requiere índices únicos si aplica)

BEGIN;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sales_daily;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_avg_ticket_daily;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_payment_mix_daily;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_sales_daily;
COMMIT;

-- Alternativa: función de conveniencia
DO $$
BEGIN
  PERFORM 1;
END$$;

