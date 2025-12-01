/**
 * PostgreSQL Database Configuration
 * Configuración de conexión a base de datos PostgreSQL propia de PMPOS
 */

const { Pool } = require('pg');
const winston = require('winston');

// Logger específico para database
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Configuración del pool de PostgreSQL
const poolConfig = {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'pmpos_db',
    user: process.env.PG_USER || 'pmpos',
    password: process.env.PG_PASSWORD,
    max: parseInt(process.env.PG_POOL_MAX || '20'), // Máximo de conexiones
    min: parseInt(process.env.PG_POOL_MIN || '5'),  // Mínimo de conexiones
    idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.PG_CONNECTION_TIMEOUT || '10000'),
    ssl: process.env.PG_SSL === 'true' ? {
        rejectUnauthorized: false
    } : false
};

// Crear pool
const pgPool = new Pool(poolConfig);

// Event listeners para debugging y monitoring
pgPool.on('connect', (client) => {
    logger.debug('Nueva conexión PostgreSQL establecida');
});

pgPool.on('acquire', (client) => {
    logger.debug('Cliente PostgreSQL adquirido del pool');
});

pgPool.on('remove', (client) => {
    logger.debug('Cliente PostgreSQL removido del pool');
});

pgPool.on('error', (err, client) => {
    logger.error('Error inesperado en cliente PostgreSQL idle', {
        error: err.message,
        stack: err.stack
    });
});

/**
 * Test de conexión a PostgreSQL
 * @returns {Promise<boolean>}
 */
async function testConnection() {
    try {
        const client = await pgPool.connect();
        const result = await client.query('SELECT NOW() as now, version() as version');
        client.release();
        
        logger.info('Conexión PostgreSQL exitosa', {
            timestamp: result.rows[0].now,
            version: result.rows[0].version
        });
        
        return true;
    } catch (error) {
        logger.error('Error al conectar con PostgreSQL', {
            error: error.message,
            host: poolConfig.host,
            database: poolConfig.database
        });
        return false;
    }
}

/**
 * Obtener información del pool
 * @returns {Object}
 */
function getPoolInfo() {
    return {
        totalCount: pgPool.totalCount,
        idleCount: pgPool.idleCount,
        waitingCount: pgPool.waitingCount
    };
}

/**
 * Cerrar pool de conexiones
 * @returns {Promise<void>}
 */
async function closePool() {
    try {
        await pgPool.end();
        logger.info('Pool de PostgreSQL cerrado correctamente');
    } catch (error) {
        logger.error('Error al cerrar pool de PostgreSQL', {
            error: error.message
        });
        throw error;
    }
}

/**
 * Query helper con logging
 * @param {string} text - Query SQL
 * @param {Array} params - Parámetros
 * @returns {Promise<Object>}
 */
async function query(text, params) {
    const start = Date.now();
    try {
        const result = await pgPool.query(text, params);
        const duration = Date.now() - start;
        
        if (duration > 1000) {
            logger.warn('Query lenta detectada', {
                query: text,
                duration,
                rows: result.rowCount
            });
        } else {
            logger.debug('Query ejecutada', {
                query: text,
                duration,
                rows: result.rowCount
            });
        }
        
        return result;
    } catch (error) {
        logger.error('Error en query PostgreSQL', {
            query: text,
            error: error.message
        });
        throw error;
    }
}

/**
 * Transaction helper
 * @param {Function} callback - Función a ejecutar en transacción
 * @returns {Promise<any>}
 */
async function transaction(callback) {
    const client = await pgPool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Transaction rollback', { error: error.message });
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    pgPool,
    testConnection,
    getPoolInfo,
    closePool,
    query,
    transaction,
    logger
};
