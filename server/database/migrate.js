/**
 * PMPOS Database Migration Runner
 * Sistema de migraciones SQL versionadas para PostgreSQL
 */

const fs = require('fs').promises;
const path = require('path');
const { pgPool, logger } = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Crear tabla de schema_migrations si no existe
 */
async function ensureMigrationsTable() {
    const query = `
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    
    try {
        await pgPool.query(query);
        logger.info('Tabla schema_migrations verificada');
    } catch (error) {
        logger.error('Error al crear tabla schema_migrations', {
            error: error.message
        });
        throw error;
    }
}

/**
 * Obtener migraciones ya ejecutadas
 * @returns {Promise<Array<number>>}
 */
async function getExecutedMigrations() {
    try {
        const result = await pgPool.query(
            'SELECT version FROM schema_migrations ORDER BY version ASC'
        );
        return result.rows.map(row => row.version);
    } catch (error) {
        logger.error('Error al obtener migraciones ejecutadas', {
            error: error.message
        });
        throw error;
    }
}

/**
 * Obtener archivos de migración disponibles
 * @returns {Promise<Array<Object>>}
 */
async function getAvailableMigrations() {
    try {
        const files = await fs.readdir(MIGRATIONS_DIR);
        const migrations = files
            .filter(file => file.endsWith('.sql'))
            .map(file => {
                const match = file.match(/^(\d{3})_(.+)\.sql$/);
                if (!match) return null;
                return {
                    version: parseInt(match[1]),
                    name: match[2],
                    filename: file,
                    path: path.join(MIGRATIONS_DIR, file)
                };
            })
            .filter(m => m !== null)
            .sort((a, b) => a.version - b.version);
        
        return migrations;
    } catch (error) {
        logger.error('Error al leer directorio de migraciones', {
            error: error.message
        });
        throw error;
    }
}

/**
 * Ejecutar migración UP
 * @param {Object} migration
 */
async function executeMigrationUp(migration) {
    const client = await pgPool.connect();
    
    try {
        const sql = await fs.readFile(migration.path, 'utf-8');
        
        // Iniciar transacción
        await client.query('BEGIN');
        
        // Ejecutar SQL de la migración
        await client.query(sql);
        
        // Registrar en schema_migrations
        await client.query(
            'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
            [migration.version, migration.name]
        );
        
        // Commit
        await client.query('COMMIT');
        
        logger.info(`✅ Migración ${migration.version}_${migration.name} ejecutada exitosamente`);
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`❌ Error en migración ${migration.version}_${migration.name}`, {
            error: error.message,
            stack: error.stack
        });
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Revertir migración DOWN
 * @param {number} version
 */
async function executeMigrationDown(version) {
    const client = await pgPool.connect();
    
    try {
        // Por ahora, solo removemos el registro
        // En producción, se debería tener un archivo _down.sql por cada migración
        await client.query('BEGIN');
        
        await client.query(
            'DELETE FROM schema_migrations WHERE version = $1',
            [version]
        );
        
        await client.query('COMMIT');
        
        logger.info(`✅ Migración ${version} revertida (registro removido)`);
        logger.warn('⚠️  NOTA: Revertir cambios de schema manualmente si es necesario');
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`❌ Error al revertir migración ${version}`, {
            error: error.message
        });
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Comando: migrate up
 * Ejecuta todas las migraciones pendientes
 */
async function migrateUp() {
    try {
        await ensureMigrationsTable();
        
        const executed = await getExecutedMigrations();
        const available = await getAvailableMigrations();
        
        const pending = available.filter(m => !executed.includes(m.version));
        
        if (pending.length === 0) {
            logger.info('✨ No hay migraciones pendientes');
            return;
        }
        
        logger.info(`📦 ${pending.length} migración(es) pendiente(s)`);
        
        for (const migration of pending) {
            await executeMigrationUp(migration);
        }
        
        logger.info('✅ Todas las migraciones ejecutadas exitosamente');
    } catch (error) {
        logger.error('❌ Error en migrate up', { error: error.message });
        process.exit(1);
    }
}

/**
 * Comando: migrate down
 * Revierte la última migración
 */
async function migrateDown() {
    try {
        await ensureMigrationsTable();
        
        const executed = await getExecutedMigrations();
        
        if (executed.length === 0) {
            logger.info('ℹ️  No hay migraciones para revertir');
            return;
        }
        
        const lastVersion = executed[executed.length - 1];
        
        logger.warn(`⚠️  Revirtiendo migración ${lastVersion}...`);
        
        await executeMigrationDown(lastVersion);
        
        logger.info('✅ Migración revertida');
    } catch (error) {
        logger.error('❌ Error en migrate down', { error: error.message });
        process.exit(1);
    }
}

/**
 * Comando: migrate create <name>
 * Crea un nuevo archivo de migración
 */
async function createMigration(name) {
    try {
        if (!name) {
            throw new Error('Debes proporcionar un nombre para la migración');
        }
        
        const available = await getAvailableMigrations();
        const lastVersion = available.length > 0 
            ? available[available.length - 1].version 
            : 0;
        const newVersion = String(lastVersion + 1).padStart(3, '0');
        
        const filename = `${newVersion}_${name}.sql`;
        const filepath = path.join(MIGRATIONS_DIR, filename);
        
        const template = `-- Migration: ${name}
-- Version: ${newVersion}
-- Created: ${new Date().toISOString()}

-- ============================================
-- TODO: Escribir SQL para esta migración
-- ============================================

-- Ejemplo: Crear tabla
-- CREATE TABLE example (
--     id SERIAL PRIMARY KEY,
--     name VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- Ejemplo: Crear índice
-- CREATE INDEX idx_example_name ON example(name);

-- Ejemplo: Insertar datos
-- INSERT INTO example (name) VALUES ('test');
`;
        
        await fs.writeFile(filepath, template, 'utf-8');
        
        logger.info(`✅ Migración creada: ${filename}`);
        logger.info(`📝 Edita el archivo: ${filepath}`);
    } catch (error) {
        logger.error('❌ Error al crear migración', { error: error.message });
        process.exit(1);
    }
}

/**
 * Comando: migrate status
 * Muestra estado de migraciones
 */
async function migrateStatus() {
    try {
        await ensureMigrationsTable();
        
        const executed = await getExecutedMigrations();
        const available = await getAvailableMigrations();
        
        logger.info('\n📊 Estado de Migraciones:\n');
        
        for (const migration of available) {
            const isExecuted = executed.includes(migration.version);
            const status = isExecuted ? '✅' : '⏳';
            console.log(`${status} ${migration.version}_${migration.name}`);
        }
        
        console.log(`\nTotal: ${available.length} | Ejecutadas: ${executed.length} | Pendientes: ${available.length - executed.length}\n`);
    } catch (error) {
        logger.error('❌ Error en migrate status', { error: error.message });
        process.exit(1);
    }
}

// CLI
const command = process.argv[2];
const arg = process.argv[3];

(async () => {
    try {
        switch (command) {
            case 'up':
                await migrateUp();
                break;
            case 'down':
                await migrateDown();
                break;
            case 'create':
                await createMigration(arg);
                break;
            case 'status':
                await migrateStatus();
                break;
            default:
                console.log(`
PMPOS Migration Runner

Uso:
    npm run migrate:up          - Ejecuta migraciones pendientes
    npm run migrate:down        - Revierte última migración
    npm run migrate:create <name> - Crea nueva migración
    npm run migrate:status      - Muestra estado de migraciones

Ejemplos:
    npm run migrate:create initial_schema
    npm run migrate:create add_users_table
                `);
        }
        
        await pgPool.end();
        process.exit(0);
    } catch (error) {
        console.error(error);
        await pgPool.end();
        process.exit(1);
    }
})();
