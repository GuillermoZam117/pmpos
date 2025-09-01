const Debug = require('debug');

const debug = Debug('pmpos:frontend:requests');
const debugBody = Debug('pmpos:frontend:requests:body');
const debugGraphQL = Debug('pmpos:frontend:graphql');
const debugGraphQLBody = Debug('pmpos:frontend:graphql:body');

// Simple browser-compatible file logging using localStorage + periodic flush
class BrowserFileLogger {
    constructor() {
        this.logQueue = [];
        this.maxQueueSize = 100; // Keep last 100 logs in memory
        this.flushInterval = 5000; // Flush every 5 seconds
        this.startPeriodicFlush();
    }

    startPeriodicFlush() {
        if (typeof window !== 'undefined') {
            setInterval(() => {
                this.flushToLocalStorage();
            }, this.flushInterval);
        }
    }

    log(level, message, metadata = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...metadata
        };

        this.logQueue.push(logEntry);
        
        // Also send to auto uploader for backend storage
        if (autoLogUploader) {
            autoLogUploader.queueLogForUpload(logEntry);
        }
        
        // Keep queue size manageable
        if (this.logQueue.length > this.maxQueueSize) {
            this.logQueue = this.logQueue.slice(-this.maxQueueSize);
        }
    }

    flushToLocalStorage() {
        if (typeof window === 'undefined' || this.logQueue.length === 0) return;

        try {
            const today = new Date().toISOString().split('T')[0];
            const storageKey = `pmpos_logs_${today}`;
            
            // Get existing logs from localStorage
            let existingLogs = [];
            try {
                const stored = localStorage.getItem(storageKey);
                if (stored) existingLogs = JSON.parse(stored);
            } catch (e) {
                // localStorage might be full or corrupted
            }

            // Add new logs
            existingLogs.push(...this.logQueue);
            
            // Keep only last 500 logs per day to avoid localStorage overflow
            if (existingLogs.length > 500) {
                existingLogs = existingLogs.slice(-500);
            }

            localStorage.setItem(storageKey, JSON.stringify(existingLogs));
            this.logQueue = []; // Clear queue after successful flush
        } catch (error) {
            console.warn('Could not save logs to localStorage:', error.message);
        }
    }

    logApiRequest(requestId, method, url, options = {}) {
        this.log('info', `🟦 [${requestId}] ${method} ${url}`, {
            type: 'api_request',
            requestId,
            method,
            url,
            query: options.query,
            contentType: options.headers?.['Content-Type'],
            hasAuth: !!options.headers?.['Authorization']
        });
    }

    logApiResponse(requestId, method, url, response, duration, responseData = null) {
        const status = response.status;
        const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
        
        let logIcon = '🟢';
        if (status >= 400 && status < 500) logIcon = '🟡';
        else if (status >= 500) logIcon = '🔴';
        else if (status >= 300) logIcon = '🔵';

        this.log(level, `${logIcon} [${requestId}] ${status} ${method} ${url} - ${duration}ms`, {
            type: 'api_response',
            requestId,
            method,
            url,
            status,
            duration,
            slow: duration > 1000,
            responseSize: responseData ? JSON.stringify(responseData).length : 0
        });
    }

    logGraphQLRequest(requestId, url, operation, variables = {}) {
        const operationType = this._extractOperationType(operation);
        const operationName = this._extractOperationName(operation) || 'unnamed';
        
        this.log('info', `🟦 [${requestId}] GraphQL ${operationType}: ${operationName}`, {
            type: 'graphql_request',
            requestId,
            operationType,
            operationName,
            url,
            hasVariables: Object.keys(variables).length > 0,
            variablesCount: Object.keys(variables).length
        });
    }

    logGraphQLResponse(requestId, operation, response, duration, responseData = null) {
        const operationType = this._extractOperationType(operation);
        const operationName = this._extractOperationName(operation) || 'unnamed';
        const hasErrors = responseData?.errors && responseData.errors.length > 0;
        
        const level = !response.ok ? 'error' : hasErrors ? 'warn' : 'info';
        let logIcon = '🟢';
        if (hasErrors) logIcon = '🟡';
        if (!response.ok) logIcon = '🔴';

        this.log(level, `${logIcon} [${requestId}] GraphQL ${operationType} ${operationName} - ${duration}ms`, {
            type: 'graphql_response',
            requestId,
            operationType,
            operationName,
            duration,
            hasErrors,
            httpOk: response.ok,
            slow: duration > 1000,
            errorCount: hasErrors ? responseData.errors.length : 0
        });

        // Log GraphQL errors separately
        if (hasErrors) {
            responseData.errors.forEach((error, index) => {
                this.log('error', `❌ [${requestId}] GraphQL Error ${index + 1}: ${error.message}`, {
                    type: 'graphql_error',
                    requestId,
                    errorIndex: index,
                    errorMessage: error.message,
                    errorPath: error.path
                });
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
}

// Initialize browser-compatible logger
const fileLogger = new BrowserFileLogger();

// Import auto uploader for backend sync
let autoLogUploader = null;
try {
    import('./autoLogUploader').then(module => {
        autoLogUploader = module.default;
    });
} catch (error) {
    console.warn('Auto log uploader not available:', error.message);
}

/**
 * Enhanced request/response logging for frontend API and GraphQL calls
 */
class RequestLogger {
    constructor() {
        this.requestCounter = 0;
    }

    /**
     * Generate unique request ID
     */
    generateRequestId() {
        this.requestCounter++;
        return Math.random().toString(36).substr(2, 8);
    }

    /**
     * Log API request start
     */
    logApiRequest(requestId, method, url, options = {}) {
        const { headers, body, query } = options;
        
        debug(`🟦 [${requestId}] ${method} ${url}`, {
            query,
            contentType: headers?.['Content-Type'],
            hasAuth: !!headers?.['Authorization']
        });

        // Also log to file if available
        if (fileLogger) {
            fileLogger.logApiRequest(requestId, method, url, options);
        }

        // Log request body for POST/PUT/PATCH
        if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
            const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
            if (bodyStr.length <= 1000) {
                debugBody(`📤 [${requestId}] Request body:`, JSON.parse(bodyStr));
            } else {
                debugBody(`📤 [${requestId}] Request body (truncated):`, bodyStr.substring(0, 1000) + '...');
            }
        }
    }

    /**
     * Log API response
     */
    logApiResponse(requestId, method, url, response, duration, responseData = null) {
        const status = response.status;
        
        // Choose log icon based on status code
        let logIcon = '🟢'; // 2xx
        if (status >= 400 && status < 500) logIcon = '🟡'; // 4xx
        else if (status >= 500) logIcon = '🔴'; // 5xx
        else if (status >= 300) logIcon = '🔵'; // 3xx

        debug(`${logIcon} [${requestId}] ${status} ${method} ${url} - ${duration}ms`);

        // Also log to file if available
        if (fileLogger) {
            fileLogger.logApiResponse(requestId, method, url, response, duration, responseData);
        }

        // Log response body (with size limits)
        if (responseData !== null) {
            this.logResponseBody(requestId, responseData);
        }

        // Log slow requests
        if (duration > 1000) {
            debug(`⚠️  [${requestId}] SLOW REQUEST: ${duration}ms for ${method} ${url}`);
        }
    }

    /**
     * Log GraphQL request start
     */
    logGraphQLRequest(requestId, url, operation, variables = {}) {
        const operationType = this.extractOperationType(operation);
        const operationName = this.extractOperationName(operation) || 'unnamed';
        
        debugGraphQL(`🟦 [${requestId}] GraphQL ${operationType}: ${operationName}`, {
            url,
            hasVariables: Object.keys(variables).length > 0
        });

        // Also log to file if available
        if (fileLogger) {
            fileLogger.logGraphQLRequest(requestId, url, operation, variables);
        }

        // Log variables if present
        if (Object.keys(variables).length > 0) {
            const variablesStr = JSON.stringify(variables);
            if (variablesStr.length <= 1000) {
                debugGraphQLBody(`📤 [${requestId}] Variables:`, variables);
            } else {
                debugGraphQLBody(`📤 [${requestId}] Variables (truncated):`, variablesStr.substring(0, 1000) + '...');
            }
        }

        // Log query/mutation (truncated if too long)
        const queryStr = operation.replace(/\s+/g, ' ').trim();
        if (queryStr.length <= 200) {
            debugGraphQLBody(`📋 [${requestId}] Operation:`, queryStr);
        } else {
            debugGraphQLBody(`📋 [${requestId}] Operation (truncated):`, queryStr.substring(0, 200) + '...');
        }
    }

    /**
     * Log GraphQL response
     */
    logGraphQLResponse(requestId, operation, response, duration, responseData = null) {
        const operationType = this.extractOperationType(operation);
        const operationName = this.extractOperationName(operation) || 'unnamed';
        const hasErrors = responseData?.errors && responseData.errors.length > 0;
        
        let logIcon = '🟢'; // Success
        if (hasErrors) logIcon = '🟡'; // GraphQL errors
        if (!response.ok) logIcon = '🔴'; // HTTP errors

        debugGraphQL(`${logIcon} [${requestId}] GraphQL ${operationType} ${operationName} - ${duration}ms`);

        // Also log to file if available
        if (fileLogger) {
            fileLogger.logGraphQLResponse(requestId, operation, response, duration, responseData);
        }

        // Log GraphQL errors
        if (hasErrors) {
            responseData.errors.forEach((error, index) => {
                debugGraphQL(`❌ [${requestId}] GraphQL Error ${index + 1}:`, error.message);
            });
        }

        // Log response data
        if (responseData !== null) {
            if (responseData.data) {
                this.logResponseBody(requestId, responseData.data, 'GraphQL Data');
            }
        }

        // Log slow requests
        if (duration > 1000) {
            debugGraphQL(`⚠️  [${requestId}] SLOW GraphQL: ${duration}ms for ${operationType} ${operationName}`);
        }
    }

    /**
     * Log response body with intelligent truncation
     */
    logResponseBody(requestId, responseData, label = 'Response body') {
        try {
            let bodyToLog = responseData;
            let bodyStr = typeof responseData === 'string' ? responseData : JSON.stringify(responseData);
            
            // For large responses, show summary instead of full body
            if (bodyStr.length > 2000) {
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
                        preview: bodyStr.substring(0, 200) + '...',
                        size: bodyStr.length,
                        truncated: true
                    };
                }
            }

            if (label.includes('GraphQL')) {
                debugGraphQLBody(`📥 [${requestId}] ${label}:`, bodyToLog);
            } else {
                debugBody(`📥 [${requestId}] ${label}:`, bodyToLog);
            }

        } catch (e) {
            const fallbackLog = label.includes('GraphQL') ? debugGraphQLBody : debugBody;
            fallbackLog(`📥 [${requestId}] ${label} (parse error):`, String(responseData).substring(0, 200));
        }
    }

    /**
     * Extract operation type from GraphQL query/mutation
     */
    extractOperationType(operation) {
        const trimmed = operation.trim();
        if (trimmed.startsWith('mutation')) return 'mutation';
        if (trimmed.startsWith('subscription')) return 'subscription';
        return 'query';
    }

    /**
     * Extract operation name from GraphQL operation
     */
    extractOperationName(operation) {
        const match = operation.match(/(?:query|mutation|subscription)\s+(\w+)/);
        return match ? match[1] : null;
    }

    /**
     * Wrapper for fetch with logging
     */
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
            debug(`🔴 [${requestId}] FETCH ERROR ${method} ${url} - ${duration}ms:`, error.message);
            throw error;
        }
    }

    /**
     * Wrapper for GraphQL requests with logging
     */
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
            debugGraphQL(`🔴 [${requestId}] GraphQL ERROR - ${duration}ms:`, error.message);
            throw error;
        }
    }
}

// Export singleton instance
const requestLogger = new RequestLogger();

export default requestLogger;

// Export convenience methods
export const loggedFetch = requestLogger.loggedFetch.bind(requestLogger);
export const loggedGraphQL = requestLogger.loggedGraphQL.bind(requestLogger);