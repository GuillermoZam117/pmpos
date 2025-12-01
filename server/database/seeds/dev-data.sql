-- ============================================
-- PMPOS Development Seeds
-- Datos de prueba para desarrollo local
-- ============================================

-- ============================================
-- ROLES
-- ============================================
INSERT INTO roles (name, description) VALUES
    ('admin', 'Administrador con acceso total al sistema'),
    ('manager', 'Gerente con acceso a reportes y configuración'),
    ('cashier', 'Cajero con acceso a ventas y caja'),
    ('waiter', 'Mesero con acceso a mesas y órdenes'),
    ('driver', 'Repartidor con acceso a deliveries')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- PERMISSIONS
-- ============================================
INSERT INTO permissions (resource, action, description) VALUES
    -- Tickets
    ('tickets', 'create', 'Crear nuevos tickets'),
    ('tickets', 'view', 'Ver tickets'),
    ('tickets', 'modify', 'Modificar tickets'),
    ('tickets', 'delete', 'Eliminar tickets'),
    ('tickets', 'close', 'Cerrar tickets'),
    ('tickets', 'reopen', 'Reabrir tickets cerrados'),
    
    -- Orders
    ('orders', 'create', 'Agregar órdenes a tickets'),
    ('orders', 'modify', 'Modificar órdenes'),
    ('orders', 'void', 'Anular órdenes'),
    ('orders', 'gift', 'Marcar órdenes como cortesía'),
    
    -- Payments
    ('payments', 'process', 'Procesar pagos'),
    ('payments', 'view', 'Ver pagos'),
    ('payments', 'refund', 'Hacer reembolsos'),
    
    -- Tables
    ('tables', 'view', 'Ver mesas'),
    ('tables', 'manage', 'Gestionar mesas (transferir, bloquear)'),
    
    -- Delivery
    ('delivery', 'create', 'Crear deliveries'),
    ('delivery', 'assign', 'Asignar deliveries a drivers'),
    ('delivery', 'track', 'Ver tracking de deliveries'),
    ('delivery', 'manage_zones', 'Gestionar zonas de entrega'),
    
    -- Cash Register
    ('cash', 'open_shift', 'Abrir turno de caja'),
    ('cash', 'close_shift', 'Cerrar turno de caja'),
    ('cash', 'view_shifts', 'Ver turnos de caja'),
    
    -- Reports
    ('reports', 'view', 'Ver reportes'),
    ('reports', 'export', 'Exportar reportes'),
    ('reports', 'executive', 'Ver dashboard ejecutivo'),
    
    -- Users
    ('users', 'view', 'Ver usuarios'),
    ('users', 'create', 'Crear usuarios'),
    ('users', 'modify', 'Modificar usuarios'),
    ('users', 'delete', 'Eliminar usuarios'),
    ('users', 'manage_roles', 'Gestionar roles de usuarios'),
    
    -- Settings
    ('settings', 'view', 'Ver configuración'),
    ('settings', 'modify', 'Modificar configuración'),
    
    -- Loyalty
    ('loyalty', 'view', 'Ver información de loyalty'),
    ('loyalty', 'redeem', 'Redimir puntos'),
    ('loyalty', 'manage', 'Gestionar programa de loyalty'),
    
    -- WhatsApp
    ('whatsapp', 'view', 'Ver configuración de WhatsApp'),
    ('whatsapp', 'manage', 'Gestionar bot de WhatsApp'),
    
    -- Kitchen
    ('kitchen', 'view_printers', 'Ver impresoras de cocina'),
    ('kitchen', 'manage_printers', 'Gestionar impresoras de cocina')
ON CONFLICT (resource, action) DO NOTHING;

-- ============================================
-- ROLE PERMISSIONS
-- ============================================

-- Admin: Todos los permisos
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Manager: Todos excepto delete users
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'manager'
  AND p.resource || ':' || p.action NOT IN ('users:delete')
ON CONFLICT DO NOTHING;

-- Cashier: Ventas, pagos, caja
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'cashier'
  AND (
    p.resource IN ('tickets', 'orders', 'payments', 'cash', 'loyalty')
    OR (p.resource = 'reports' AND p.action = 'view')
  )
ON CONFLICT DO NOTHING;

-- Waiter: Mesas, órdenes, ver tickets
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'waiter'
  AND (
    p.resource IN ('tables', 'orders', 'tickets')
    OR (p.resource = 'payments' AND p.action = 'view')
  )
  AND p.action != 'delete'
ON CONFLICT DO NOTHING;

-- Driver: Solo delivery y tracking
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'driver'
  AND p.resource = 'delivery'
  AND p.action IN ('track', 'create')
ON CONFLICT DO NOTHING;

-- ============================================
-- USERS DE PRUEBA
-- ============================================

-- Usuario Admin (PIN: 9999)
INSERT INTO users (sambapos_user_id, pin, name, email, is_active) VALUES
    (null, '9999', 'Admin Sistema', 'admin@pmpos.local', true)
ON CONFLICT (sambapos_user_id) DO NOTHING;

-- Usuario Manager (PIN: 1111)
INSERT INTO users (sambapos_user_id, pin, name, email, is_active) VALUES
    (null, '1111', 'Manager Demo', 'manager@pmpos.local', true)
ON CONFLICT (sambapos_user_id) DO NOTHING;

-- Usuario Cashier (PIN: 2222)
INSERT INTO users (sambapos_user_id, pin, name, email, is_active) VALUES
    (null, '2222', 'Cajero Demo', 'cashier@pmpos.local', true)
ON CONFLICT (sambapos_user_id) DO NOTHING;

-- Usuario Waiter (PIN: 3333)
INSERT INTO users (sambapos_user_id, pin, name, email, is_active) VALUES
    (null, '3333', 'Mesero Demo', 'waiter@pmpos.local', true)
ON CONFLICT (sambapos_user_id) DO NOTHING;

-- Usuario Driver (PIN: 4444)
INSERT INTO users (sambapos_user_id, pin, name, email, is_active) VALUES
    (null, '4444', 'Repartidor Demo', 'driver@pmpos.local', true)
ON CONFLICT (sambapos_user_id) DO NOTHING;

-- ============================================
-- USER ROLES
-- ============================================

-- Asignar rol admin a usuario 9999
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE u.pin = '9999' AND r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Asignar rol manager a usuario 1111
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE u.pin = '1111' AND r.name = 'manager'
ON CONFLICT DO NOTHING;

-- Asignar rol cashier a usuario 2222
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE u.pin = '2222' AND r.name = 'cashier'
ON CONFLICT DO NOTHING;

-- Asignar rol waiter a usuario 3333
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE u.pin = '3333' AND r.name = 'waiter'
ON CONFLICT DO NOTHING;

-- Asignar rol driver a usuario 4444
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE u.pin = '4444' AND r.name = 'driver'
ON CONFLICT DO NOTHING;

-- Crear registro de driver para usuario 4444
INSERT INTO drivers (user_id, vehicle_type, plate, is_available)
SELECT u.id, 'motocicleta', 'ABC-123', false
FROM users u
WHERE u.pin = '4444'
ON CONFLICT DO NOTHING;

-- ============================================
-- LOGS
-- ============================================

-- Mostrar resumen
DO $$
DECLARE
    role_count INTEGER;
    perm_count INTEGER;
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO role_count FROM roles;
    SELECT COUNT(*) INTO perm_count FROM permissions;
    SELECT COUNT(*) INTO user_count FROM users;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Seeds ejecutados exitosamente:';
    RAISE NOTICE '   - % roles creados', role_count;
    RAISE NOTICE '   - % permisos creados', perm_count;
    RAISE NOTICE '   - % usuarios de prueba creados', user_count;
    RAISE NOTICE '';
    RAISE NOTICE '🔑 Usuarios de prueba:';
    RAISE NOTICE '   - Admin:     PIN 9999 (acceso total)';
    RAISE NOTICE '   - Manager:   PIN 1111 (reportes y config)';
    RAISE NOTICE '   - Cajero:    PIN 2222 (ventas y caja)';
    RAISE NOTICE '   - Mesero:    PIN 3333 (mesas y órdenes)';
    RAISE NOTICE '   - Repartidor: PIN 4444 (deliveries)';
    RAISE NOTICE '';
END $$;
