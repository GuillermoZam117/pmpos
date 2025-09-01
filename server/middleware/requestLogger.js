const logger = require('../lib/logger');
const Debug = require('debug');

const debug = Debug('pmpos:read-service:requests');
const debugBody = Debug('pmpos:read-service:requests:body');

/**
 * Enhanced request/response logging middleware with Winston file logging
 */
function requestLogger(req, res, next) {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substr(2, 8);
    
    // Extract useful request info
    const requestInfo = {
        id: requestId,
        method: req.method,
        url: req.url,
        headers: {
            'content-type': req.headers['content-type'],
            'x-internal-api-key': req.headers['x-internal-api-key'] ? 
                `${'*'.repeat(Math.max(0, req.headers['x-internal-api-key'].length - 4))}${req.headers['x-internal-api-key'].slice(-4)}` : 
                undefined,
            'user-agent': req.headers['user-agent']
        },
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
        ip: req.ip || req.connection.remoteAddress,
        timestamp: new Date().toISOString()
    };

    // Log request to both Debug and Winston
    debug(`🟦 [${requestId}] ${req.method} ${req.url}`, {
        query: requestInfo.query,
        ip: requestInfo.ip,
        contentType: requestInfo.headers['content-type']
    });

    // Log to Winston for persistent storage
    logger.logApiRequest(requestId, req.method, req.url, {
        query: requestInfo.query,
        headers: requestInfo.headers,
        ip: requestInfo.ip
    });

    // Log request body for POST/PUT/PATCH (but limit size)
    if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const bodyStr = JSON.stringify(req.body);
        if (bodyStr.length <= 1000) {
            debugBody(`📤 [${requestId}] Request body:`, req.body);
        } else {
            debugBody(`📤 [${requestId}] Request body (truncated):`, bodyStr.substring(0, 1000) + '...');
        }
    }

    // Capture original res.json and res.send to log responses
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    
    let responseBody = null;
    let responseSent = false;

    res.json = function(data) {
        if (!responseSent) {
            responseBody = data;
            logResponse();
        }
        return originalJson(data);
    };

    res.send = function(data) {
        if (!responseSent) {
            responseBody = data;
            logResponse();
        }
        return originalSend(data);
    };

    function logResponse() {
        if (responseSent) return;
        responseSent = true;

        const duration = Date.now() - startTime;
        const responseInfo = {
            id: requestId,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            headers: {
                'content-type': res.getHeader('content-type'),
                'cache-control': res.getHeader('cache-control')
            }
        };

        // Choose log color based on status code
        let logIcon = '🟢'; // 2xx
        if (res.statusCode >= 400 && res.statusCode < 500) logIcon = '🟡'; // 4xx
        else if (res.statusCode >= 500) logIcon = '🔴'; // 5xx
        else if (res.statusCode >= 300) logIcon = '🔵'; // 3xx

        debug(`${logIcon} [${requestId}] ${res.statusCode} ${req.method} ${req.url} - ${duration}ms`);

        // Log to Winston for persistent storage
        logger.logApiResponse(requestId, req.method, req.url, res.statusCode, duration, responseBody);

        // Log response body (with size limits)
        if (responseBody !== null) {
            try {
                let bodyToLog = responseBody;
                let bodyStr = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
                
                // For large responses, show summary instead of full body
                if (bodyStr.length > 2000) {
                    if (Array.isArray(responseBody)) {
                        bodyToLog = {
                            type: 'Array',
                            length: responseBody.length,
                            sample: responseBody.slice(0, 2),
                            truncated: true
                        };
                    } else if (typeof responseBody === 'object') {
                        const keys = Object.keys(responseBody);
                        bodyToLog = {
                            type: 'Object',
                            keys: keys.slice(0, 10),
                            keysCount: keys.length,
                            truncated: keys.length > 10
                        };
                    } else {
                        bodyToLog = {
                            type: typeof responseBody,
                            preview: bodyStr.substring(0, 200) + '...',
                            size: bodyStr.length,
                            truncated: true
                        };
                    }
                }

                debugBody(`📥 [${requestId}] Response body:`, bodyToLog);

            } catch (e) {
                debugBody(`📥 [${requestId}] Response body (parse error):`, String(responseBody).substring(0, 200));
            }
        }

        // Slow request logging is handled by Winston logger
    }

    // Also catch the end event in case res.json/send aren't used
    res.on('finish', () => {
        if (!responseSent) {
            logResponse();
        }
    });

    // Store request ID for other middleware to use
    req.requestId = requestId;
    
    next();
}

module.exports = requestLogger;