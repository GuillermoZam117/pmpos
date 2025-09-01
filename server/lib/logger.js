/**
 * Enhanced Winston-based Logger for PMPOS Backend
 * Provides structured logging with file rotation and multiple transports
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Custom format for structured logging
const customFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`;
    })
);

// Console format with colors for development
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level} ${message}${metaStr}`;
    })
);

// File transport for API requests/responses
const apiTransport = new DailyRotateFile({
    filename: path.join(logsDir, 'api-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d', // Keep logs for 14 days
    maxSize: '50m',  // Max 50MB per file
    level: 'info',
    format: customFormat
});

// File transport for GraphQL requests/responses  
const graphqlTransport = new DailyRotateFile({
    filename: path.join(logsDir, 'graphql-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
    maxSize: '50m',
    level: 'info', 
    format: customFormat
});

// File transport for errors
const errorTransport = new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '30d', // Keep error logs longer
    maxSize: '100m',
    level: 'error',
    format: customFormat
});

// Console transport for development
const consoleTransport = new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    format: consoleFormat
});

// Create loggers
const apiLogger = winston.createLogger({
    transports: [apiTransport, consoleTransport, errorTransport]
});

const graphqlLogger = winston.createLogger({
    transports: [graphqlTransport, consoleTransport, errorTransport]
});

const errorLogger = winston.createLogger({
    transports: [errorTransport, consoleTransport]
});

// Main server logger
const mainLogger = winston.createLogger({
    transports: [apiTransport, consoleTransport, errorTransport]
});

class Logger {
    constructor() {
        this.startSession();
    }

    info(message, meta = {}) {
        mainLogger.info(message, meta);
    }

    error(message, meta = {}) {
        mainLogger.error(message, meta);
    }

    warn(message, meta = {}) {
        mainLogger.warn(message, meta);
    }

    debug(message, meta = {}) {
        mainLogger.debug(message, meta);
    }

    success(message, meta = {}) {
        mainLogger.info(`✅ ${message}`, meta);
    }

    startSession() {
        const separator = '='.repeat(50);
        this.info(`${separator} START SESSION ${separator}`);
        this.info(`Server started at ${new Date().toISOString()}`);
        this.info(`Log directory: ${logsDir}`);
    }

    endSession() {
        const separator = '='.repeat(50);
        this.info(`Server stopped at ${new Date().toISOString()}`);
        this.info(`${separator} END SESSION ${separator}`);
    }

    // Helper methods for specific operations
    startProcess(processName) {
        const separator = '='.repeat(10);
        this.info(`${separator} START PROCESS: ${processName} ${separator}`);
    }

    endProcess(processName) {
        const separator = '='.repeat(10);
        this.info(`${separator} END PROCESS: ${processName} ${separator}`);
    }

    // Request/Response logging with structured data
    logApiRequest(requestId, method, url, options = {}) {
        const { query, headers, ip } = options;
        apiLogger.info(`🟦 [${requestId}] ${method} ${url}`, {
            requestId,
            method,
            url,
            query,
            ip,
            hasAuth: !!headers?.['x-internal-api-key'],
            timestamp: new Date().toISOString()
        });
    }

    logApiResponse(requestId, method, url, status, duration, responseData = null) {
        const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
        
        let logIcon = '🟢'; // 2xx
        if (status >= 400 && status < 500) logIcon = '🟡'; // 4xx
        else if (status >= 500) logIcon = '🔴'; // 5xx
        else if (status >= 300) logIcon = '🔵'; // 3xx

        apiLogger[level](`${logIcon} [${requestId}] ${status} ${method} ${url} - ${duration}ms`, {
            requestId,
            method,
            url,
            status,
            duration,
            slow: duration > 1000,
            timestamp: new Date().toISOString()
        });

        // Log response body summary
        if (responseData !== null) {
            this._logResponseSummary(apiLogger, requestId, responseData, 'API Response');
        }

        // Log slow requests
        if (duration > 1000) {
            apiLogger.warn(`⚠️  [${requestId}] SLOW API REQUEST: ${duration}ms for ${method} ${url}`, {
                requestId,
                method,
                url,
                duration,
                slow: true
            });
        }
    }

    logGraphQLRequest(requestId, operation, variables = {}) {
        const operationType = this._extractOperationType(operation);
        const operationName = this._extractOperationName(operation) || 'unnamed';
        
        graphqlLogger.info(`🟦 [${requestId}] GraphQL ${operationType}: ${operationName}`, {
            requestId,
            operationType,
            operationName,
            hasVariables: Object.keys(variables).length > 0,
            timestamp: new Date().toISOString()
        });
    }

    logGraphQLResponse(requestId, operation, status, duration, responseData = null) {
        const operationType = this._extractOperationType(operation);
        const operationName = this._extractOperationName(operation) || 'unnamed';
        const hasErrors = responseData?.errors && responseData.errors.length > 0;
        
        const level = status >= 500 ? 'error' : hasErrors ? 'warn' : 'info';
        let logIcon = '🟢'; // Success
        if (hasErrors) logIcon = '🟡'; // GraphQL errors
        if (status >= 500) logIcon = '🔴'; // HTTP errors

        graphqlLogger[level](`${logIcon} [${requestId}] GraphQL ${operationType} ${operationName} - ${duration}ms`, {
            requestId,
            operationType,
            operationName,
            duration,
            hasErrors,
            status,
            slow: duration > 1000,
            timestamp: new Date().toISOString()
        });

        // Log GraphQL errors
        if (hasErrors) {
            responseData.errors.forEach((error, index) => {
                graphqlLogger.error(`❌ [${requestId}] GraphQL Error ${index + 1}: ${error.message}`, {
                    requestId,
                    errorIndex: index,
                    errorMessage: error.message,
                    errorPath: error.path,
                    errorLocations: error.locations
                });
            });
        }

        // Log response data summary
        if (responseData !== null && responseData.data) {
            this._logResponseSummary(graphqlLogger, requestId, responseData.data, 'GraphQL Data');
        }
    }

    _logResponseSummary(logger, requestId, responseData, label) {
        try {
            let summary = responseData;
            const dataStr = JSON.stringify(responseData);
            
            // For large responses, show summary instead of full body
            if (dataStr.length > 2000) {
                if (Array.isArray(responseData)) {
                    summary = {
                        type: 'Array',
                        length: responseData.length,
                        sample: responseData.slice(0, 2),
                        truncated: true
                    };
                } else if (typeof responseData === 'object' && responseData !== null) {
                    const keys = Object.keys(responseData);
                    summary = {
                        type: 'Object',
                        keys: keys.slice(0, 10),
                        keysCount: keys.length,
                        truncated: keys.length > 10
                    };
                }
            }

            logger.debug(`📥 [${requestId}] ${label}`, {
                requestId,
                responseSize: dataStr.length,
                body: summary,
                timestamp: new Date().toISOString()
            });
        } catch (e) {
            logger.error(`📥 [${requestId}] ${label} (parse error)`, {
                requestId,
                error: e.message,
                bodyPreview: String(responseData).substring(0, 200)
            });
        }
    }

    _extractOperationType(operation) {
        const trimmed = operation.trim();
        if (trimmed.startsWith('mutation')) return 'mutation';
        if (trimmed.startsWith('subscription')) return 'subscription';
        return 'query';
    }

    _extractOperationName(operation) {
        const match = operation.match(/(?:query|mutation|subscription)\s+(\w+)/);
        return match ? match[1] : null;
    }

    // Legacy methods for backward compatibility
    request(method, path, requestId, duration = null) {
        const durationStr = duration ? ` - ${duration}ms` : '';
        this.info(`[${requestId}] ${method} ${path}${durationStr}`, { requestId, method, path, duration });
    }

    response(method, path, requestId, status, duration) {
        const emoji = status >= 200 && status < 300 ? '✅' : status >= 400 ? '❌' : '⚠️';
        this.info(`[${requestId}] ${emoji} ${status} ${method} ${path} - ${duration}ms`, {
            requestId, method, path, status, duration
        });
    }

    database(operation, details) {
        this.info(`DB: ${operation} - ${details}`, { operation, details });
    }

    cache(operation, key, details = '') {
        this.info(`CACHE: ${operation} [${key}] ${details}`, { operation, key, details });
    }

    auth(operation, details) {
        this.info(`AUTH: ${operation} - ${details}`, { operation, details });
    }

    performance(operation, duration, details = '') {
        const emoji = duration > 5000 ? '🐌' : duration > 1000 ? '⚠️' : '⚡';
        this.info(`PERF: ${emoji} ${operation} - ${duration}ms ${details}`, {
            operation, duration, details, slow: duration > 1000
        });
    }

    // Expose individual loggers for advanced usage
    get apiLogger() { return apiLogger; }
    get graphqlLogger() { return graphqlLogger; }
    get errorLogger() { return errorLogger; }
}

// Create singleton instance
const logger = new Logger(process.env.LOG_DIR || './logs');

// Handle process termination
process.on('SIGINT', () => {
    logger.endSession();
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.endSession();
    process.exit(0);
});

module.exports = logger;