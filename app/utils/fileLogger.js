const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Custom format for our structured logging
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

// Enhanced File Request Logger Class
class FileRequestLogger {
    constructor() {
        this.requestCounter = 0;
        
        // Create logs directory
        try {
            const fs = require('fs');
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }
        } catch (error) {
            console.warn('Could not create logs directory:', error.message);
        }
    }

    generateRequestId() {
        this.requestCounter++;
        return Math.random().toString(36).substr(2, 8);
    }

    logApiRequest(requestId, method, url, options = {}) {
        const { headers, body, query } = options;
        
        apiLogger.info(`🟦 [${requestId}] ${method} ${url}`, {
            requestId,
            method,
            url,
            query,
            contentType: headers?.['Content-Type'],
            hasAuth: !!headers?.['Authorization'],
            timestamp: new Date().toISOString()
        });

        // Log request body for POST/PUT/PATCH
        if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
            const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
            if (bodyStr.length <= 2000) {
                apiLogger.debug(`📤 [${requestId}] Request body`, {
                    requestId,
                    body: JSON.parse(bodyStr),
                    bodySize: bodyStr.length
                });
            } else {
                apiLogger.debug(`📤 [${requestId}] Request body (truncated)`, {
                    requestId,
                    bodyPreview: bodyStr.substring(0, 500) + '...',
                    bodySize: bodyStr.length,
                    truncated: true
                });
            }
        }
    }

    logApiResponse(requestId, method, url, response, duration, responseData = null) {
        const status = response.status;
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

        // Log response body
        if (responseData !== null) {
            this._logResponseBody(apiLogger, requestId, responseData, 'API Response');
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

    logGraphQLRequest(requestId, url, operation, variables = {}) {
        const operationType = this._extractOperationType(operation);
        const operationName = this._extractOperationName(operation) || 'unnamed';
        
        graphqlLogger.info(`🟦 [${requestId}] GraphQL ${operationType}: ${operationName}`, {
            requestId,
            operationType,
            operationName,
            url,
            hasVariables: Object.keys(variables).length > 0,
            timestamp: new Date().toISOString()
        });

        // Log variables
        if (Object.keys(variables).length > 0) {
            const variablesStr = JSON.stringify(variables);
            if (variablesStr.length <= 2000) {
                graphqlLogger.debug(`📤 [${requestId}] GraphQL Variables`, {
                    requestId,
                    variables,
                    variablesSize: variablesStr.length
                });
            } else {
                graphqlLogger.debug(`📤 [${requestId}] GraphQL Variables (truncated)`, {
                    requestId,
                    variablesPreview: variablesStr.substring(0, 500) + '...',
                    variablesSize: variablesStr.length,
                    truncated: true
                });
            }
        }

        // Log query/mutation
        const queryStr = operation.replace(/\s+/g, ' ').trim();
        if (queryStr.length <= 500) {
            graphqlLogger.debug(`📋 [${requestId}] GraphQL Operation`, {
                requestId,
                operation: queryStr,
                operationSize: queryStr.length
            });
        } else {
            graphqlLogger.debug(`📋 [${requestId}] GraphQL Operation (truncated)`, {
                requestId,
                operationPreview: queryStr.substring(0, 500) + '...',
                operationSize: queryStr.length,
                truncated: true
            });
        }
    }

    logGraphQLResponse(requestId, operation, response, duration, responseData = null) {
        const operationType = this._extractOperationType(operation);
        const operationName = this._extractOperationName(operation) || 'unnamed';
        const hasErrors = responseData?.errors && responseData.errors.length > 0;
        
        const level = !response.ok ? 'error' : hasErrors ? 'warn' : 'info';
        let logIcon = '🟢'; // Success
        if (hasErrors) logIcon = '🟡'; // GraphQL errors
        if (!response.ok) logIcon = '🔴'; // HTTP errors

        graphqlLogger[level](`${logIcon} [${requestId}] GraphQL ${operationType} ${operationName} - ${duration}ms`, {
            requestId,
            operationType,
            operationName,
            duration,
            hasErrors,
            httpOk: response.ok,
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

        // Log response data
        if (responseData !== null && responseData.data) {
            this._logResponseBody(graphqlLogger, requestId, responseData.data, 'GraphQL Data');
        }

        // Log slow requests
        if (duration > 1000) {
            graphqlLogger.warn(`⚠️  [${requestId}] SLOW GraphQL: ${duration}ms for ${operationType} ${operationName}`, {
                requestId,
                operationType,
                operationName,
                duration,
                slow: true
            });
        }
    }

    _logResponseBody(logger, requestId, responseData, label) {
        try {
            let bodyToLog = responseData;
            let bodyStr = typeof responseData === 'string' ? responseData : JSON.stringify(responseData);
            
            const logData = {
                requestId,
                responseSize: bodyStr.length,
                timestamp: new Date().toISOString()
            };

            // For large responses, show summary instead of full body
            if (bodyStr.length > 5000) {
                if (Array.isArray(responseData)) {
                    bodyToLog = {
                        type: 'Array',
                        length: responseData.length,
                        sample: responseData.slice(0, 2),
                        truncated: true
                    };
                } else if (typeof responseData === 'object' && responseData !== null) {
                    const keys = Object.keys(responseData);
                    bodyToLog = {
                        type: 'Object',
                        keys: keys.slice(0, 10),
                        keysCount: keys.length,
                        truncated: keys.length > 10
                    };
                } else {
                    bodyToLog = {
                        type: typeof responseData,
                        preview: bodyStr.substring(0, 500) + '...',
                        size: bodyStr.length,
                        truncated: true
                    };
                }
                logData.truncated = true;
            } else {
                logData.fullBody = true;
            }

            logger.debug(`📥 [${requestId}] ${label}`, {
                ...logData,
                body: bodyToLog
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

    async loggedFetch(url, options = {}) {
        const requestId = this.generateRequestId();
        const startTime = Date.now();
        const method = options.method || 'GET';

        this.logApiRequest(requestId, method, url, options);

        try {
            const response = await fetch(url, options);
            const duration = Date.now() - startTime;
            
            let responseData = null;
            try {
                responseData = await response.clone().json();
            } catch (e) {
                // Response is not JSON, that's fine
            }

            this.logApiResponse(requestId, method, url, response, duration, responseData);
            
            return response;
        } catch (error) {
            const duration = Date.now() - startTime;
            errorLogger.error(`🔴 [${requestId}] FETCH ERROR ${method} ${url} - ${duration}ms`, {
                requestId,
                method,
                url,
                duration,
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    async loggedGraphQL(url, { query, variables = {}, ...fetchOptions } = {}) {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        this.logGraphQLRequest(requestId, url, query, variables);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...fetchOptions.headers
                },
                body: JSON.stringify({ query, variables }),
                ...fetchOptions
            });

            const duration = Date.now() - startTime;
            const responseData = await response.json();

            this.logGraphQLResponse(requestId, query, response, duration, responseData);
            
            return responseData;
        } catch (error) {
            const duration = Date.now() - startTime;
            errorLogger.error(`🔴 [${requestId}] GraphQL ERROR - ${duration}ms`, {
                requestId,
                url,
                duration,
                error: error.message,
                stack: error.stack,
                query: query?.substring(0, 200) + '...',
                variables,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }
}

// Export singleton instance
const fileRequestLogger = new FileRequestLogger();

module.exports = fileRequestLogger;
module.exports.loggedFetch = fileRequestLogger.loggedFetch.bind(fileRequestLogger);
module.exports.loggedGraphQL = fileRequestLogger.loggedGraphQL.bind(fileRequestLogger);
module.exports.apiLogger = apiLogger;
module.exports.graphqlLogger = graphqlLogger;
module.exports.errorLogger = errorLogger;