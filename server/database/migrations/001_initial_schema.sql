-- Migration: initial_schema
-- Version: 001
-- Created: 2025-12-01

-- ============================================
-- SCHEMA INICIAL - PMPOS Core Tables
-- ============================================

-- Tabla: users
-- Usuarios sincronizados desde SambaPOS con roles propios
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    sambapos_user_id INTEGER UNIQUE,
    pin VARCHAR(10) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_pin ON users(pin);
CREATE INDEX idx_users_sambapos_id ON users(sambapos_user_id);
CREATE INDEX idx_users_active ON users(is_active);

-- Tabla: roles
-- Roles del sistema RBAC
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_roles_name ON roles(name);

-- Tabla: permissions
-- Permisos granulares del sistema
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource, action)
);

CREATE INDEX idx_permissions_resource ON permissions(resource);

-- Tabla: user_roles
-- Relación many-to-many entre users y roles
CREATE TABLE user_roles (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

-- Tabla: role_permissions
-- Relación many-to-many entre roles y permissions
CREATE TABLE role_permissions (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_perm ON role_permissions(permission_id);

-- Tabla: drivers
-- Información de repartidores
CREATE TABLE drivers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(50),
    plate VARCHAR(20),
    is_available BOOLEAN DEFAULT false,
    current_location POINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_drivers_user ON drivers(user_id);
CREATE INDEX idx_drivers_available ON drivers(is_available);

-- Tabla: shifts
-- Turnos de caja (arqueos)
CREATE TABLE shifts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    opening_balance DECIMAL(10,2) NOT NULL,
    closing_balance DECIMAL(10,2),
    expected_cash DECIMAL(10,2),
    actual_cash DECIMAL(10,2),
    difference DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shifts_user ON shifts(user_id);
CREATE INDEX idx_shifts_opened ON shifts(opened_at);
CREATE INDEX idx_shifts_closed ON shifts(closed_at);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentarios en tablas
COMMENT ON TABLE users IS 'Usuarios del sistema sincronizados desde SambaPOS';
COMMENT ON TABLE roles IS 'Roles del sistema RBAC';
COMMENT ON TABLE permissions IS 'Permisos granulares por recurso y acción';
COMMENT ON TABLE user_roles IS 'Asignación de roles a usuarios';
COMMENT ON TABLE role_permissions IS 'Permisos asignados a cada rol';
COMMENT ON TABLE drivers IS 'Información de repartidores';
COMMENT ON TABLE shifts IS 'Turnos de caja con arqueo';
