/**
 * Terminal Health Check Service
 * Monitorea la salud de los terminales y proporciona diagnósticos
 */

import Debug from 'debug';

const debug = Debug('pmpos:terminal-health');

class TerminalHealthService {
    constructor() {
        this.healthChecks = new Map();
        this.healthHistory = [];
        this.maxHistorySize = 50;
        this.alertThreshold = 3; // Número de fallos consecutivos antes de alerta
    }

    /**
     * Ejecutar check de salud de terminal
     */
    async performHealthCheck(terminalId) {
        if (!terminalId) return null;

        const checkTime = new Date().toISOString();
        const result = {
            timestamp: checkTime,
            terminalId,
            status: 'unknown',
            latency: null,
            error: null
        };

        try {
            const startTime = performance.now();

            // Test básico: verificar que el terminal responde
            const token = await require('./tokenService').tokenService.getToken();
            const config = require('../config').appconfig();

            const query = `query { getTerminalTicket(terminalId: "${terminalId}") { id } }`;

            const response = await fetch(config.GQLurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ query })
            });

            const endTime = performance.now();
            result.latency = Math.round(endTime - startTime);

            if (!response.ok) {
                result.status = 'error';
                result.error = `HTTP ${response.status}`;
            } else {
                const data = await response.json();

                if (data.errors?.some(e => e.message?.toLowerCase().includes('terminal not found'))) {
                    result.status = 'not_found';
                    result.error = 'Terminal not found in server';
                } else {
                    result.status = 'healthy';
                }
            }

        } catch (error) {
            result.status = 'error';
            result.error = error.message;
            debug('❌ Health check error:', error);
        }

        // Almacenar resultado
        this.healthChecks.set(terminalId, result);
        this.healthHistory.push(result);

        // Mantener límite de historial
        if (this.healthHistory.length > this.maxHistorySize) {
            this.healthHistory.shift();
        }

        // Verificar patrones de fallo
        this.analyzeHealthPatterns(terminalId);

        debug('🏥 Health check result:', result);
        return result;
    }

    /**
     * Analizar patrones de salud
     */
    analyzeHealthPatterns(terminalId) {
        const recentChecks = this.healthHistory
            .filter(check => check.terminalId === terminalId)
            .slice(-this.alertThreshold);

        const consecutiveFailures = recentChecks
            .reverse()
            .findIndex(check => check.status === 'healthy');

        if (consecutiveFailures >= this.alertThreshold) {
            debug('🚨 Terminal health alert:', {
                terminalId,
                consecutiveFailures,
                recentStatus: recentChecks.map(c => c.status)
            });

            // Disparar evento de alerta
            this.emitHealthAlert(terminalId, consecutiveFailures);
        }
    }

    /**
     * Emitir alerta de salud
     */
    emitHealthAlert(terminalId, failureCount) {
        const alertEvent = new CustomEvent('terminal-health-alert', {
            detail: {
                terminalId,
                failureCount,
                timestamp: new Date().toISOString(),
                recommendation: this.getHealthRecommendation(failureCount)
            }
        });

        if (typeof window !== 'undefined') {
            window.dispatchEvent(alertEvent);
        }
    }

    /**
     * Obtener recomendación basada en el estado de salud
     */
    getHealthRecommendation(failureCount) {
        if (failureCount >= 5) {
            return 'RESTART_SESSION';
        } else if (failureCount >= 3) {
            return 'REREGISTER_TERMINAL';
        } else {
            return 'RETRY_OPERATION';
        }
    }

    /**
     * Obtener estadísticas de salud
     */
    getHealthStats(terminalId = null) {
        const checks = terminalId
            ? this.healthHistory.filter(c => c.terminalId === terminalId)
            : this.healthHistory;

        if (checks.length === 0) {
            return { totalChecks: 0, healthyCount: 0, errorCount: 0, avgLatency: 0 };
        }

        const stats = {
            totalChecks: checks.length,
            healthyCount: checks.filter(c => c.status === 'healthy').length,
            errorCount: checks.filter(c => c.status === 'error').length,
            notFoundCount: checks.filter(c => c.status === 'not_found').length,
            avgLatency: Math.round(
                checks
                    .filter(c => c.latency !== null)
                    .reduce((sum, c) => sum + c.latency, 0) / checks.length
            )
        };

        stats.healthPercent = Math.round((stats.healthyCount / stats.totalChecks) * 100);

        return stats;
    }

    /**
     * Diagnosticar problemas de terminal
     */
    async diagnoseTerminalIssues(terminalId) {
        const diagnosis = {
            terminalId,
            timestamp: new Date().toISOString(),
            issues: [],
            recommendations: [],
            severity: 'low'
        };

        // Ejecutar health check inmediato
        const healthCheck = await this.performHealthCheck(terminalId);

        if (!healthCheck) {
            diagnosis.issues.push('No se pudo ejecutar health check');
            diagnosis.severity = 'high';
            return diagnosis;
        }

        // Analizar resultado del health check
        switch (healthCheck.status) {
            case 'not_found':
                diagnosis.issues.push('Terminal no encontrado en servidor SambaPOS');
                diagnosis.recommendations.push('Re-registrar terminal');
                diagnosis.severity = 'high';
                break;

            case 'error':
                diagnosis.issues.push(`Error de comunicación: ${healthCheck.error}`);
                diagnosis.recommendations.push('Verificar conectividad con SambaPOS');
                diagnosis.severity = 'medium';
                break;

            case 'healthy':
                if (healthCheck.latency > 2000) {
                    diagnosis.issues.push('Alta latencia en comunicación');
                    diagnosis.recommendations.push('Verificar rendimiento de red');
                    diagnosis.severity = 'low';
                }
                break;
        }

        // Analizar historial
        const stats = this.getHealthStats(terminalId);
        if (stats.healthPercent < 80) {
            diagnosis.issues.push(`Baja tasa de éxito: ${stats.healthPercent}%`);
            diagnosis.recommendations.push('Investigar estabilidad de conexión');
            diagnosis.severity = 'medium';
        }

        debug('🩺 Diagnosis result:', diagnosis);
        return diagnosis;
    }
}

export default new TerminalHealthService();
