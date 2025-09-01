# Ejecución con psql (local/staging)

## Preparación
- Variables: exporta `PGHOST`, `PGUSER`, `PGPASSWORD` (y opcionalmente `PGPORT`).
- Extensiones: se recomienda `pgcrypto` para `gen_random_uuid()`.

## Crear base de datos y esquema
```bash
# 1) Crear base de datos contra la BD de mantenimiento 'postgres'
psql -v ON_ERROR_STOP=1 -d postgres -f docs/create_database.sql

# 2) Habilitar extensión y DDL en la BD nueva
psql -v ON_ERROR_STOP=1 -d sambapos_central -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
psql -v ON_ERROR_STOP=1 -d sambapos_central -f docs/postgres_schema.sql
```

## Seeds base y catálogos
```bash
psql -v ON_ERROR_STOP=1 -d sambapos_central -f docs/seeds_base.sql
```

## Vistas (normales y materializadas)
```bash
# Vistas normales (si las usas)
psql -v ON_ERROR_STOP=1 -d sambapos_central -f docs/views_kpis.sql

# Vistas materializadas + índices (opcional)
psql -v ON_ERROR_STOP=1 -d sambapos_central -f docs/views_kpis_materialized.sql

# Primer REFRESH (carga inicial)
psql -v ON_ERROR_STOP=1 -d sambapos_central -f docs/refresh_kpis.sql
```

## Ingestión (UPSERTs de ejemplo)
```bash
psql -v ON_ERROR_STOP=1 -d sambapos_central -f docs/upserts_examples.sql
```

## RLS por sucursal (ejemplo de sesión)
```sql
SET app.branch_id = '00000000-0000-0000-0000-000000000000';
SELECT * FROM tickets; -- filtrado por branch
RESET app.branch_id;
```

## Migraciones con Prisma (si usas Prisma)
```bash
# Desarrollo local
npx prisma migrate dev

# Deploy en staging/prod
npx prisma migrate deploy
npx prisma generate
```
