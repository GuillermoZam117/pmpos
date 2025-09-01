-- Ejemplos de UPSERT para ingestión desde SambaPOS

-- 1) Upsert Ticket (idempotente por (branch_id, source_type, source_id, source_hash))
INSERT INTO tickets (
  branch_id, pos_ticket_uid, number, opened_at, closed_at, is_closed,
  total, total_pretax, taxes, remaining,
  department_id, terminal_id, tags, states, note,
  source_type, source_id, source_hash, raw
)
VALUES (
  $1, $2, $3, $4, $5, $6,
  $7, $8, $9, $10,
  $11, $12, $13::jsonb, $14::jsonb, $15,
  'sambapos', $16, $17, $18::jsonb
)
ON CONFLICT (branch_id, source_type, source_id, source_hash)
DO UPDATE SET
  number = EXCLUDED.number,
  closed_at = COALESCE(EXCLUDED.closed_at, tickets.closed_at),
  is_closed = EXCLUDED.is_closed,
  total = EXCLUDED.total,
  total_pretax = EXCLUDED.total_pretax,
  taxes = EXCLUDED.taxes,
  remaining = EXCLUDED.remaining,
  tags = COALESCE(EXCLUDED.tags, tickets.tags),
  states = COALESCE(EXCLUDED.states, tickets.states),
  note = COALESCE(EXCLUDED.note, tickets.note),
  updated_at = now()
RETURNING id;

-- 2) Upsert Order (idempotente por (branch_id, source_type, source_id, source_hash))
INSERT INTO orders (
  ticket_id, branch_id, menu_item_id, name, portion, qty, price, price_tag,
  tags, states, source_type, source_id, source_hash
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, 'sambapos', $11, $12)
ON CONFLICT (branch_id, source_type, source_id, source_hash)
DO UPDATE SET
  qty = EXCLUDED.qty,
  price = EXCLUDED.price,
  price_tag = EXCLUDED.price_tag,
  tags = COALESCE(EXCLUDED.tags, orders.tags),
  states = COALESCE(EXCLUDED.states, orders.states),
  updated_at = now()
RETURNING id;

-- 3) Upsert Payment
INSERT INTO payments (
  ticket_id, branch_id, payment_type_id, amount, tendered_amount, paid_at,
  data, source_type, source_id, source_hash
)
VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'sambapos', $8, $9)
ON CONFLICT (branch_id, source_type, source_id, source_hash)
DO UPDATE SET
  amount = EXCLUDED.amount,
  tendered_amount = EXCLUDED.tendered_amount,
  paid_at = COALESCE(EXCLUDED.paid_at, payments.paid_at),
  data = COALESCE(EXCLUDED.data, payments.data),
  updated_at = now()
RETURNING id;

-- 4) Upsert Product por SKU (global)
INSERT INTO products (sku, name, category_id)
VALUES ($1, $2, $3)
ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name, category_id = EXCLUDED.category_id
RETURNING id;

-- 5) Upsert Price por (product, price_list, portion)
INSERT INTO product_prices (product_id, price_list_id, portion, price)
VALUES ($1, $2, $3, $4)
ON CONFLICT (product_id, price_list_id, COALESCE(portion, ''))
DO UPDATE SET price = EXCLUDED.price, updated_at = now()
RETURNING id;

