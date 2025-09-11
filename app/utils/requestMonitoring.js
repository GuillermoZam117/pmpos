/**
 * Request Monitoring Script
 * 
 * Add this to browser console to monitor the effectiveness of request deduplication
 */

// Monitor request deduplication stats
window.monitorRequestDedup = function () {
    console.log('🔍 Starting request deduplication monitoring...');

    const logStats = () => {
        if (window.debugRequestDedup) {
            const stats = window.debugRequestDedup.getStats();
            console.log('📊 Request Deduplication Stats:', {
                ...stats,
                timestamp: new Date().toLocaleTimeString()
            });

            // Calculate efficiency
            const totalSaved = Object.values(stats.requestCounts).reduce((sum, count) => sum + Math.max(0, count - 1), 0);
            const efficiency = totalSaved > 0 ? `${totalSaved} duplicate requests prevented` : 'No duplicates detected';
            console.log(`⚡ Efficiency: ${efficiency}`);
        }
    };

    // Log stats every 30 seconds
    const interval = setInterval(logStats, 30000);

    // Initial log
    logStats();

    console.log('✅ Request monitoring started. Stats will be logged every 30 seconds.');
    console.log('📋 Available commands:');
    console.log('  - window.debugRequestDedup.getStats() - Get current stats');
    console.log('  - window.debugRequestDedup.clearAll() - Clear all pending requests');
    console.log('  - clearInterval(' + interval + ') - Stop monitoring');

    return interval;
};

// Monitor network requests to /api/graphql
window.monitorGraphQLRequests = function () {
    console.log('🔍 Starting GraphQL request monitoring...');

    const originalFetch = window.fetch;
    const requestCounts = new Map();
    let lastLogTime = Date.now();

    window.fetch = function (...args) {
        const url = args[0];

        if (typeof url === 'string' && url.includes('/api/graphql')) {
            const now = Date.now();
            const key = `${now - (now % 10000)}`; // Group by 10-second intervals
            requestCounts.set(key, (requestCounts.get(key) || 0) + 1);

            // Log summary every 30 seconds
            if (now - lastLogTime > 30000) {
                console.log('📡 GraphQL Request Summary (last 30s):',
                    Array.from(requestCounts.entries())
                        .map(([interval, count]) => `${new Date(parseInt(interval)).toLocaleTimeString()}: ${count} requests`)
                        .join(', ')
                );
                requestCounts.clear();
                lastLogTime = now;
            }
        }

        return originalFetch.apply(this, args);
    };

    console.log('✅ GraphQL request monitoring started.');
    console.log('📋 To stop: window.fetch = originalFetch');
};

console.log('🛠️ Request monitoring tools loaded:');
console.log('  - window.monitorRequestDedup() - Monitor deduplication effectiveness');
console.log('  - window.monitorGraphQLRequests() - Monitor GraphQL request frequency');
