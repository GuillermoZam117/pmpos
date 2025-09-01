-- Seeds base por sucursal (idempotentes)
-- Requiere gen_random_uuid() o inserción desde Prisma con UUIDs

-- 1) Sucursales
INSERT INTO branches (code, name, timezone)
VALUES ('MX-001', 'Sucursal Centro', 'America/Mexico_City')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO branches (code, name, timezone)
VALUES ('MX-002', 'Sucursal Norte', 'America/Mexico_City')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- 2) Tipos de pago por sucursal
WITH b AS (
  SELECT id, code FROM branches WHERE code IN ('MX-001','MX-002')
)
INSERT INTO payment_types (id, branch_id, name, processor)
SELECT gen_random_uuid(), b.id, pt.name, pt.processor
FROM b
CROSS JOIN (
  VALUES
    ('Cash'::text, '{"kind":"cash"}'::jsonb),
    ('Card', '{"kind":"card"}'),
    ('Transfer', '{"kind":"transfer"}')
) AS pt(name, processor)
ON CONFLICT (branch_id, name) DO NOTHING;

-- 3) Lista de precios global y precios ejemplo
INSERT INTO price_lists (branch_id, name, currency)
VALUES (NULL, 'Base', 'MXN')
ON CONFLICT (COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), name) DO NOTHING;

-- 4) Catálogo simple de productos
INSERT INTO product_categories (name)
VALUES ('Bebidas') ON CONFLICT (name) DO NOTHING;

INSERT INTO products (sku, name, category_id)
SELECT 'COFFEE-NEGRO', 'Café Americano', pc.id
FROM product_categories pc WHERE pc.name = 'Bebidas'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO products (sku, name, category_id)
SELECT 'LATTE-CHICO', 'Latte Chico', pc.id
FROM product_categories pc WHERE pc.name = 'Bebidas'
ON CONFLICT (sku) DO NOTHING;

-- 5) Precios para la lista Base
WITH pl AS (
  SELECT id FROM price_lists WHERE name = 'Base' AND branch_id IS NULL
), p AS (
  SELECT id, sku FROM products WHERE sku IN ('COFFEE-NEGRO','LATTE-CHICO')
)
INSERT INTO product_prices (product_id, price_list_id, portion, price)
SELECT p.id, pl.id, NULL, CASE p.sku WHEN 'COFFEE-NEGRO' THEN 35.00 ELSE 55.00 END
FROM p CROSS JOIN pl
ON CONFLICT (product_id, price_list_id, COALESCE(portion, '')) DO NOTHING;

-- 6) Mapeo POS -> central de tipos de pago (ejemplo)
-- Efectivo -> Cash, Tarjeta -> Card
WITH b AS (
  SELECT id, code FROM branches WHERE code IN ('MX-001','MX-002')
), c AS (
  SELECT pt.id, pt.branch_id, pt.name FROM payment_types pt WHERE pt.name IN ('Cash','Card')
)
INSERT INTO payment_type_mapping (branch_id, pos_payment_type, central_payment_type_id, fees)
SELECT b.id, m.pos, c.id, m.fees
FROM b
JOIN c ON c.branch_id = b.id
JOIN (
  VALUES ('Efectivo'::text, '{}'::jsonb, 'Cash'::text),
         ('Tarjeta', '{"fee_pct":2.5}', 'Card')
) AS m(pos, fees, central)
  ON m.central = c.name
ON CONFLICT (branch_id, pos_payment_type) DO NOTHING;

