/**
 * Request Deduplication Service
 * 
 * Prevents duplicate concurrent GraphQL and API requests by caching promises
 * and ensuring only one request per unique key is in flight at a time.
 */

import Debug from 'debug';

const debug = Debug('pmpos:request-dedup');

class RequestDeduplicationService {
    constructor() {
        this.activeRequests = new Map(); // key -> Promise
        this.lastRequestTime = new Map(); // key -> timestamp
        this.requestCounts = new Map(); // key -> count (for monitoring)

        // Cleanup interval to prevent memory leaks
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 60000); // Clean up every minute
    }

    /**
     * Execute a request with deduplication
     * @param {string} key - Unique key for the request type
     * @param {Function} requestFn - Function that returns a Promise
     * @param {number} minInterval - Minimum milliseconds between requests (default: 1000ms)
     * @returns {Promise} - The request result
     */
    async execute(key, requestFn, minInterval = 1000) {
        const now = Date.now();

        // Check if there's already a request in flight for this key
        if (this.activeRequests.has(key)) {
            const existingRequest = this.activeRequests.get(key);
            debug(`🔄 [${key}] Request already in flight, waiting for existing...`);

            // Increment counter for monitoring
            const count = this.requestCounts.get(key) || 0;
            this.requestCounts.set(key, count + 1);

            return existingRequest;
        }

        // Check minimum interval between requests
        const lastTime = this.lastRequestTime.get(key);
        if (lastTime && (now - lastTime) < minInterval) {
            const waitTime = minInterval - (now - lastTime);
            debug(`⏱️ [${key}] Rate limiting: waiting ${waitTime}ms before next request`);

            // Wait for the minimum interval and try again
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        debug(`🚀 [${key}] Starting new request...`);

        // Create and store the request promise
        const requestPromise = this.executeRequest(key, requestFn);
        this.activeRequests.set(key, requestPromise);
        this.lastRequestTime.set(key, now);

        // Initialize counter
        this.requestCounts.set(key, 1);

        try {
            const result = await requestPromise;
            debug(`✅ [${key}] Request completed successfully`);
            return result;
        } catch (error) {
            debug(`❌ [${key}] Request failed:`, error.message);
            throw error;
        } finally {
            // Clean up after request completes (success or failure)
            this.activeRequests.delete(key);
        }
    }

    /**
     * Internal method to execute the actual request with error handling
     */
    async executeRequest(key, requestFn) {
        try {
            const startTime = Date.now();
            const result = await requestFn();
            const duration = Date.now() - startTime;

            debug(`📊 [${key}] Request stats: ${duration}ms, dedup saved: ${(this.requestCounts.get(key) || 1) - 1} requests`);

            return result;
        } catch (error) {
            debug(`💥 [${key}] Request execution failed:`, error.message);
            throw error;
        }
    }

    /**
     * Check if a request is currently in progress
     */
    isRequestInProgress(key) {
        return this.activeRequests.has(key);
    }

    /**
     * Get statistics for monitoring
     */
    getStats() {
        const stats = {
            activeRequests: this.activeRequests.size,
            totalKeys: this.requestCounts.size,
            requestCounts: Object.fromEntries(this.requestCounts),
            timestamp: new Date().toISOString()
        };

        debug('📊 Request deduplication stats:', stats);
        return stats;
    }

    /**
     * Force clear a specific request (use with caution)
     */
    clearRequest(key) {
        if (this.activeRequests.has(key)) {
            debug(`🧹 [${key}] Force clearing active request`);
            this.activeRequests.delete(key);
        }
    }

    /**
     * Clear all active requests (emergency use only)
     */
    clearAll() {
        debug('🧹 Force clearing all active requests');
        this.activeRequests.clear();
        this.lastRequestTime.clear();
        this.requestCounts.clear();
    }

    /**
     * Clean up old entries to prevent memory leaks
     */
    cleanup() {
        const now = Date.now();
        const oldThreshold = 5 * 60 * 1000; // 5 minutes

        // Clean up old timestamps
        for (const [key, timestamp] of this.lastRequestTime.entries()) {
            if (now - timestamp > oldThreshold) {
                this.lastRequestTime.delete(key);
                this.requestCounts.delete(key);
            }
        }

        // Clean up any stale active requests (shouldn't happen but safety net)
        const staleKeys = [];
        for (const [key, promise] of this.activeRequests.entries()) {
            // If promise is resolved/rejected, it should have been cleaned up
            // This is a safety net for any edge cases
            if (promise && typeof promise.then === 'function') {
                promise.finally(() => {
                    // Ensure cleanup happens
                    this.activeRequests.delete(key);
                });
            } else {
                staleKeys.push(key);
            }
        }

        // Remove stale entries
        staleKeys.forEach(key => {
            debug(`🧹 Cleaning up stale request: ${key}`);
            this.activeRequests.delete(key);
        });

        if (staleKeys.length > 0 || this.lastRequestTime.size > 0) {
            debug(`🧹 Cleanup completed: removed ${staleKeys.length} stale requests, ${this.lastRequestTime.size} entries remaining`);
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.clearAll();
    }
}

// Create singleton instance
const requestDeduplicationService = new RequestDeduplicationService();

// Expose debugging functions
if (typeof window !== 'undefined') {
    window.debugRequestDedup = {
        getStats: () => requestDeduplicationService.getStats(),
        clearAll: () => requestDeduplicationService.clearAll(),
        clearRequest: (key) => requestDeduplicationService.clearRequest(key)
    };
}

export default requestDeduplicationService;
