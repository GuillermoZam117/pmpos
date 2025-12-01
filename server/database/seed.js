/**
 * PMPOS Database Seeder
 * Carga datos iniciales para desarrollo
 */

const fs = require('fs').promises;
const path = require('path');
const { pgPool, logger } = require('../config/database');

const SEEDS_DIR = path.join(__dirname, 'seeds');

/**
 * Ejecutar un archivo SQL de seed
 * @param {string} filename
 */
async function executeSeedFile(filename) {
    const filepath = path.join(SEEDS_DIR, filename);
    
    try {
        const sql = await fs.readFile(filepath, 'utf-8');
        
        logger.info(`🌱 Ejecutando seed: ${filename}`);
        
        await pgPool.query(sql);
        
        logger.info(`✅ Seed ${filename} ejecutado exitosamente`);
    } catch (error) {
        logger.error(`❌ Error en seed ${filename}`, {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Ejecutar todos los seeds
 */
async function runSeeds() {
    const env = process.env.NODE_ENV || 'development';
    
    // Solo permitir seeds en dev y staging
    if (env === 'production') {
        logger.error('❌ Seeds no permitidos en producción');
        process.exit(1);
    }
    
    logger.info(`🌱 Ejecutando seeds para ambiente: ${env}`);
    
    try {
        // Orden de ejecución de seeds
        const seedFiles = [
            'dev-data.sql'
        ];
        
        for (const file of seedFiles) {
            await executeSeedFile(file);
        }
        
        logger.info('✅ Todos los seeds ejecutados exitosamente');
    } catch (error) {
        logger.error('❌ Error al ejecutar seeds', { error: error.message });
        process.exit(1);
    }
}

// Ejecutar
(async () => {
    try {
        await runSeeds();
        await pgPool.end();
        process.exit(0);
    } catch (error) {
        console.error(error);
        await pgPool.end();
        process.exit(1);
    }
})();
