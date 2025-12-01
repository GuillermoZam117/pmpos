# PMPOS Database Setup

## Estructura de Base de Datos

Este directorio contiene el sistema de migraciones y seeds para la base de datos PostgreSQL propia de PMPOS.

## Directorios

- `migrations/` - Migraciones SQL versionadas
- `seeds/` - Datos iniciales para desarrollo

## Comandos Disponibles

### Migraciones

```bash
# Ejecutar migraciones pendientes
npm run migrate:up

# Revertir última migración
npm run migrate:down

# Crear nueva migración
npm run migrate:create nombre_de_la_migracion

# Ver estado de migraciones
node database/migrate.js status
```

### Seeds

```bash
# Cargar datos de desarrollo
npm run seed:dev
```

## Convenciones

### Nombres de Migraciones

Las migraciones siguen el formato: `###_nombre_descriptivo.sql`

Ejemplos:
- `001_initial_schema.sql`
- `002_add_loyalty_tables.sql`
- `003_add_whatsapp_tables.sql`

### Orden de Ejecución

Las migraciones se ejecutan en orden numérico ascendente (001, 002, 003, ...).

### Estructura de Migración

```sql
-- Migration: nombre_descriptivo
-- Version: ###
-- Created: YYYY-MM-DD

-- ============================================
-- Descripción de la migración
-- ============================================

-- SQL statements aquí

CREATE TABLE example (
    id SERIAL PRIMARY KEY,
    ...
);

-- Comentarios y documentación
COMMENT ON TABLE example IS 'Descripción de la tabla';
```

## Base de Datos

### Tablas Core (001_initial_schema.sql)

- `users` - Usuarios del sistema
- `roles` - Roles RBAC
- `permissions` - Permisos granulares
- `user_roles` - Asignación de roles
- `role_permissions` - Permisos por rol
- `drivers` - Información de repartidores
- `shifts` - Turnos de caja

### Triggers

- `update_updated_at_column()` - Actualiza automáticamente `updated_at`

## Configuración

Variables de entorno requeridas en `.env`:

```env
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=pmpos_db
PG_USER=pmpos
PG_PASSWORD=your_password_here
```

## Desarrollo

### Crear Nueva Migración

1. Generar archivo:
```bash
npm run migrate:create add_new_feature
```

2. Editar el archivo generado en `migrations/`

3. Ejecutar migración:
```bash
npm run migrate:up
```

### Rollback

Si necesitas revertir una migración:

```bash
npm run migrate:down
```

⚠️ **Nota:** El rollback actual solo remueve el registro de `schema_migrations`. Los cambios de schema deben revertirse manualmente si es necesario.

## Troubleshooting

### Error de conexión

Verifica que PostgreSQL esté corriendo:
```bash
pg_isready -h localhost -p 5432
```

### Migración fallida

Si una migración falla a mitad de ejecución:
1. Verifica el error en los logs
2. Corrige el SQL
3. Remueve el registro manualmente:
```sql
DELETE FROM schema_migrations WHERE version = xxx;
```
4. Vuelve a ejecutar `npm run migrate:up`

### Seeds en producción

Los seeds están bloqueados en producción para evitar sobrescribir datos reales.

## Backup y Restore

### Backup

```bash
pg_dump -h localhost -U pmpos pmpos_db > backup.sql
```

### Restore

```bash
psql -h localhost -U pmpos pmpos_db < backup.sql
```

## Schema Documentation

Documentación completa del schema en: `docs/database_schema.md`
