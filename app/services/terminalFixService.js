/**
 * Terminal Fix Service
 * Soluciona el problema "Terminal not found" con retry inteligente
 */

import { registerTerminalAsync } from '../queries';
import Debug from 'debug';

const debug = Debug('pmpos:terminal-fix');

class TerminalFixService {
    constructor() {
        this.registrationCache = new Map();
        this.lastRegistration = null;
        this.registrationTimeout = 5 * 60 * 1000; // 5 minutos
    }

    /**
     * Verificar si un terminal está activo en el servidor
     */
    async verifyTerminalExists(terminalId) {
        if (!terminalId) return false;

        try {
            const token = await require('./tokenService').tokenService.getToken();
            const config = require('../config').appconfig();

            // Query simple para verificar existencia del terminal
            const query = `query { getTerminalTicket(terminalId: "${terminalId}") { id } }`;

            const response = await fetch(config.GQLurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ query })
            });

            const data = await response.json();

            // Si no hay errores o el error no es "Terminal not found", entonces existe
            const hasTerminalNotFoundError = data.errors?.some(e =>
                e.message?.toLowerCase().includes('terminal not found')
            );

            return !hasTerminalNotFoundError;
        } catch (error) {
            debug('❌ Error verificando terminal:', error);
            return false;
        }
    }

    /**
     * Registro inteligente de terminal con verificación
     */
    async ensureTerminalActive(userOverride = null) {
        const currentTime = Date.now();
        const terminalService = require('./terminalService').default;

        // Obtener terminal ID actual
        let terminalId = terminalService.getTerminalId();

        // Si no hay terminal o ha expirado, registrar uno nuevo
        if (!terminalId || this.shouldReregister(currentTime)) {
            debug('🔄 Registrando nuevo terminal...');
            terminalId = await this.registerWithRetry(userOverride);
        } else {
            // Verificar que el terminal existe en el servidor
            const exists = await this.verifyTerminalExists(terminalId);
            if (!exists) {
                debug('⚠️ Terminal no encontrado en servidor, re-registrando...');
                terminalId = await this.registerWithRetry(userOverride);
            }
        }

        return terminalId;
    }

    /**
     * Registro con reintentos y diferentes estrategias
     */
    async registerWithRetry(userOverride = null, maxAttempts = 3) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            debug(`🔄 Intento de registro ${attempt}/${maxAttempts}`);

            try {
                // Esperar un poco entre intentos
                if (attempt > 1) {
                    const delay = 1000 * Math.pow(2, attempt - 2); // 1s, 2s, 4s
                    debug(`⏳ Esperando ${delay}ms antes del intento ${attempt}`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                const terminalId = await registerTerminalAsync(userOverride);

                if (terminalId) {
                    debug(`✅ Terminal registrado exitosamente: ${terminalId}`);
                    this.registrationCache.set('lastTerminalId', terminalId);
                    this.lastRegistration = Date.now();

                    // Actualizar el servicio de terminal
                    const terminalService = require('./terminalService').default;
                    terminalService.setTerminalId(terminalId);

                    // Verificar inmediatamente que el registro funcionó
                    await new Promise(resolve => setTimeout(resolve, 500)); // Pequeña pausa
                    const verified = await this.verifyTerminalExists(terminalId);

                    if (verified) {
                        debug(`✅ Terminal verificado como activo: ${terminalId}`);
                        return terminalId;
                    } else {
                        debug(`⚠️ Terminal registrado pero no verificado: ${terminalId}`);
                        if (attempt === maxAttempts) {
                            // En el último intento, devolver el ID aunque no se pueda verificar
                            return terminalId;
                        }
                    }
                }
            } catch (error) {
                debug(`❌ Error en intento ${attempt}:`, error.message);
                if (attempt === maxAttempts) {
                    throw error;
                }
            }
        }

        throw new Error('No se pudo registrar el terminal después de todos los intentos');
    }

    /**
     * Determinar si se debe re-registrar
     */
    shouldReregister(currentTime) {
        if (!this.lastRegistration) return true;
        return (currentTime - this.lastRegistration) > this.registrationTimeout;
    }

    /**
     * Wrapper para operaciones de terminal con auto-fix
     */
    async executeWithTerminalFix(operation, userOverride = null) {
        try {
            // Asegurar que tenemos un terminal activo
            const terminalId = await this.ensureTerminalActive(userOverride);

            if (!terminalId) {
                throw new Error('No se pudo obtener un terminal activo');
            }

            // Intentar la operación
            return await operation(terminalId);

        } catch (error) {
            // Si falla por terminal not found, intentar re-registro
            if (error.message?.toLowerCase().includes('terminal not found')) {
                debug('🔄 Terminal not found, intentando re-registro...');

                const newTerminalId = await this.registerWithRetry(userOverride);
                if (newTerminalId) {
                    return await operation(newTerminalId);
                }
            }

            throw error;
        }
    }
}

export default new TerminalFixService();
