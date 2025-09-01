-- PostgreSQL DDL para modelo central multisucursal (SambaPOS)
-- Requiere extensión pgcrypto para gen_random_uuid(); si no, usar uuid-ossp o prisma uuid().

-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tipo ENUM para estatus de cancelaciones (alineado con Prisma)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'cancellation_status'
  ) THEN
    CREATE TYPE cancellation_status AS ENUM ('pending','approved','rejected','applied','expired');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS terminals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_terminals_branch ON terminals(branch_id);

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  name text NOT NULL,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_employees_branch ON employees(branch_id);

CREATE TABLE IF NOT EXISTS work_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  start_at timestamptz NOT NULL,
  end_at timestamptz NULL,
  start_by text NULL,
  end_by text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_work_period UNIQUE (branch_id, start_at)
);
CREATE INDEX IF NOT EXISTS idx_work_periods_branch_start ON work_periods(branch_id, start_at);

-- Catálogos de pago
CREATE TABLE IF NOT EXISTS payment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  name text NOT NULL,
  processor jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_payment_type_name UNIQUE (branch_id, name)
);
CREATE INDEX IF NOT EXISTS idx_payment_types_branch ON payment_types(branch_id);

CREATE TABLE IF NOT EXISTS payment_type_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  pos_payment_type text NOT NULL,
  central_payment_type_id uuid NOT NULL REFERENCES payment_types(id) ON DELETE RESTRICT,
  fees jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_paymap UNIQUE (branch_id, pos_payment_type)
);
CREATE INDEX IF NOT EXISTS idx_paymap_branch ON payment_type_mapping(branch_id);

-- Tickets y órdenes
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  pos_ticket_uid text NOT NULL,
  number text NULL,
  opened_at timestamptz NULL,
  closed_at timestamptz NULL,
  is_closed boolean NOT NULL DEFAULT false,
  total numeric(12,2) NOT NULL DEFAULT 0,
  total_pretax numeric(12,2) NULL,
  taxes numeric(12,2) NULL,
  remaining numeric(12,2) NULL,
  department_id int NULL,
  terminal_id int NULL,
  tags jsonb NULL,
  states jsonb NULL,
  note text NULL,
  -- Origen e idempotencia
  source_type text NOT NULL DEFAULT 'sambapos',
  source_id text NOT NULL,
  source_hash text NOT NULL,
  raw jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_ticket_uid UNIQUE (branch_id, pos_ticket_uid),
  CONSTRAINT uq_ticket_idem UNIQUE (branch_id, source_type, source_id, source_hash)
);
CREATE INDEX IF NOT EXISTS idx_tickets_branch_closed ON tickets(branch_id, closed_at);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  menu_item_id int NULL,
  name text NOT NULL,
  portion text NULL,
  qty numeric(12,3) NOT NULL,
  price numeric(12,2) NOT NULL,
  price_tag text NULL,
  tags jsonb NULL,
  states jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Idempotencia por orden POS
  source_type text NOT NULL DEFAULT 'sambapos',
  source_id text NOT NULL,
  source_hash text NOT NULL,
  CONSTRAINT uq_order_idem UNIQUE (branch_id, source_type, source_id, source_hash)
);
CREATE INDEX IF NOT EXISTS idx_orders_ticket ON orders(ticket_id);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  payment_type_id uuid NOT NULL REFERENCES payment_types(id) ON DELETE RESTRICT,
  amount numeric(12,2) NOT NULL,
  tendered_amount numeric(12,2) NULL,
  paid_at timestamptz NULL,
  data jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  source_type text NOT NULL DEFAULT 'sambapos',
  source_id text NOT NULL,
  source_hash text NOT NULL,
  CONSTRAINT uq_payment_idem UNIQUE (branch_id, source_type, source_id, source_hash)
);
CREATE INDEX IF NOT EXISTS idx_payments_ticket ON payments(ticket_id);

-- Movimientos de caja y conciliación
CREATE TABLE IF NOT EXISTS cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  work_period_id uuid NULL REFERENCES work_periods(id) ON DELETE SET NULL,
  type text NOT NULL,
  amount numeric(12,2) NOT NULL,
  occurred_at timestamptz NOT NULL,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cashmov_branch_time ON cash_movements(branch_id, occurred_at);

CREATE TABLE IF NOT EXISTS cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  ticket_id uuid NULL REFERENCES tickets(id) ON DELETE SET NULL,
  order_id uuid NULL REFERENCES orders(id) ON DELETE SET NULL,
  status cancellation_status NOT NULL,
  reason text NOT NULL,
  evidence jsonb NULL,
  requested_by text NOT NULL,
  approved_by text NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  source_type text NOT NULL DEFAULT 'sambapos',
  source_id text NOT NULL,
  source_hash text NOT NULL,
  CONSTRAINT uq_cancel_idem UNIQUE (branch_id, source_type, source_id, source_hash)
);
CREATE INDEX IF NOT EXISTS idx_cancel_branch_status ON cancellations(branch_id, status);

CREATE TABLE IF NOT EXISTS bank_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  account text NOT NULL,
  amount numeric(12,2) NOT NULL,
  deposited_at timestamptz NOT NULL,
  reference text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deposits_branch_date ON bank_deposits(branch_id, deposited_at);

CREATE TABLE IF NOT EXISTS reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  date date NOT NULL,
  method text NOT NULL,
  pos_amount numeric(12,2) NOT NULL DEFAULT 0,
  bank_amount numeric(12,2) NOT NULL DEFAULT 0,
  diff_amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  details jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_recon UNIQUE (branch_id, date, method)
);
CREATE INDEX IF NOT EXISTS idx_recon_branch_date ON reconciliations(branch_id, date);

-- Índices adicionales de rendimiento
CREATE INDEX IF NOT EXISTS idx_orders_branch ON orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_payments_branch_paid ON payments(branch_id, paid_at);
CREATE INDEX IF NOT EXISTS idx_tickets_tags_gin ON tickets USING GIN ((tags));
CREATE INDEX IF NOT EXISTS idx_tickets_states_gin ON tickets USING GIN ((states));
CREATE INDEX IF NOT EXISTS idx_orders_tags_gin ON orders USING GIN ((tags));
CREATE INDEX IF NOT EXISTS idx_orders_states_gin ON orders USING GIN ((states));

-- Reglas básicas de consistencia (compatibles con versiones sin IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_payment_amount_nonneg'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT ck_payment_amount_nonneg CHECK (amount >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_tendered_amount_nonneg'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT ck_tendered_amount_nonneg CHECK (tendered_amount IS NULL OR tendered_amount >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_ticket_total_nonneg'
  ) THEN
    ALTER TABLE tickets ADD CONSTRAINT ck_ticket_total_nonneg CHECK (total >= 0);
  END IF;
END$$;

-- Row Level Security por sucursal (opcional)
-- Política: si la variable de sesión app.branch_id está definida, restringe por branch_id; si no, acceso total (para tareas de sistema).
DO $$
DECLARE tbl regclass;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['terminals','employees','work_periods','payment_types','payment_type_mapping','tickets','orders','payments','cash_movements','cancellations','bank_deposits','reconciliations']::text[])::regclass LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format($p$
      CREATE POLICY IF NOT EXISTS rls_branch_isolation ON %s
      USING (
        current_setting('app.branch_id', true) IS NULL OR
        branch_id = current_setting('app.branch_id', true)::uuid
      )
      WITH CHECK (
        current_setting('app.branch_id', true) IS NULL OR
        branch_id = current_setting('app.branch_id', true)::uuid
      );
    $p$, tbl);
  END LOOP;
END$$;

-- Roles y permisos mínimos (ajusta según tu despliegue)
-- CREATE ROLE app_rw NOLOGIN;
-- CREATE ROLE report_ro NOLOGIN;
-- DO $$
-- DECLARE t text;
-- BEGIN
--   FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
--     EXECUTE format('GRANT SELECT ON TABLE %I TO report_ro', t);
--     EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I TO app_rw', t);
--   END LOOP;
-- END$$;

-- Catálogo de productos y listas de precios
CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid NULL REFERENCES product_categories(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NULL UNIQUE,
  name text NOT NULL,
  category_id uuid NULL REFERENCES product_categories(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

CREATE TABLE IF NOT EXISTS price_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NULL REFERENCES branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  currency text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_pricelist UNIQUE (COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), name)
);
CREATE INDEX IF NOT EXISTS idx_pricelists_branch ON price_lists(branch_id);

CREATE TABLE IF NOT EXISTS product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  price_list_id uuid NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  portion text NULL,
  price numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_product_price UNIQUE (product_id, price_list_id, COALESCE(portion, ''))
);
CREATE INDEX IF NOT EXISTS idx_product_prices_pl ON product_prices(price_list_id);

-- Menú (opcional, si centralizas configuración)
CREATE TABLE IF NOT EXISTS menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NULL REFERENCES branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id uuid NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_category_id uuid NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  product_id uuid NULL REFERENCES products(id) ON DELETE SET NULL,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);

-- Inventario básico
CREATE TABLE IF NOT EXISTS inventory_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  ratio numeric(12,6) NULL
);
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text NULL UNIQUE,
  unit_id uuid NULL REFERENCES inventory_units(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS inventory_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  type text NOT NULL,
  occurred_at timestamptz NOT NULL,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES inventory_documents(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  qty numeric(14,6) NOT NULL,
  cost numeric(14,6) NULL
);

-- Logs/Auditoría de sincronización
CREATE TABLE IF NOT EXISTS sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NULL REFERENCES branches(id) ON DELETE SET NULL,
  entity text NOT NULL,
  action text NOT NULL,
  status text NOT NULL,
  source_type text NOT NULL DEFAULT 'sambapos',
  source_id text NULL,
  message text NULL,
  payload jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sync_logs_branch_created ON sync_logs(branch_id, created_at);

-- Archivos adjuntos (evidencias)
CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NULL REFERENCES branches(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  provider text NOT NULL,
  url text NOT NULL,
  content_type text NULL,
  size bigint NULL,
  metadata jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);

-- Control de acceso básico (si gestionas usuarios)
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  permissions jsonb NULL
);
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  role_id uuid NULL REFERENCES roles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS user_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT uq_user_branch UNIQUE (user_id, branch_id)
);

-- Opcional: ejemplo de particionado por mes para tickets (solo referencia)
-- Para usar particionado real, crea la tabla como PARTITIONED desde el inicio.
-- CREATE TABLE tickets_p (
--   LIKE tickets INCLUDING ALL
-- ) PARTITION BY RANGE (closed_at);
-- CREATE TABLE tickets_2025_08 PARTITION OF tickets_p FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
