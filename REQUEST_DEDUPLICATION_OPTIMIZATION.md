# Request Deduplication Performance Optimization

## Problem Identified
Your system was experiencing duplicate concurrent GraphQL requests to `loadActiveTickets`, causing performance issues and server overload. Multiple components were making identical requests simultaneously.

## Root Causes
1. **Multiple Components Making Concurrent Calls**: PaymentProcessor, TableView, POSViewMobile, and TerminalStatus all triggering data loads
2. **No Request Deduplication**: GraphQL endpoint lacked the same deduplication protection as the SQL endpoint
3. **Aggressive Polling Intervals**: Components checking status every 10-30 seconds
4. **SignalR Fallback Overlap**: Backup polling system overlapping with component requests

## Optimizations Implemented

### 1. Request Deduplication Service
- **File**: `app/services/requestDeduplicationService.js`
- **Purpose**: Prevents duplicate concurrent requests by caching promises
- **Features**:
  - In-flight request detection
  - Minimum interval enforcement between requests
  - Memory leak prevention with automatic cleanup
  - Monitoring and debugging capabilities

### 2. DataManager Integration
- **File**: `app/services/dataManager.js`
- **Changes**:
  - Wrapped `getActiveTickets()` with deduplication (2-second minimum interval)
  - Increased intelligent polling from 30s to 45s
  - Extended SignalR health threshold from 60s to 90s

### 3. GraphQL Service Enhancement
- **File**: `app/services/graphqlService.js`
- **Changes**:
  - Added request deduplication to core `gql()` function
  - 1.5-second minimum interval between identical queries
  - Smart cache key generation based on query content

### 4. Component Frequency Reduction
- **TerminalStatus**: Network checks reduced from 10s to 15s intervals
- **POSViewMobile**: Terminal status checks reduced from 30s to 45s intervals
- **queries.js**: Ticket cache TTL increased from 8s to 12s, min interval from 3s to 5s

## Testing Instructions

### 1. Monitor Request Deduplication
Open browser console and run:
```javascript
// Start monitoring deduplication effectiveness
const monitoringInterval = window.monitorRequestDedup();

// View current stats
window.debugRequestDedup.getStats();
```

### 2. Monitor GraphQL Requests
```javascript
// Track GraphQL request frequency
window.monitorGraphQLRequests();
```

### 3. Expected Results
- **Before**: Multiple concurrent `loadActiveTickets` requests in logs
- **After**: Single request per time period with "waiting for existing" messages
- **Performance**: Reduced server load and faster response times

### 4. Verification Steps
1. Open browser console
2. Navigate to TableView or payment interface
3. Look for deduplication messages: `"Request already in flight, waiting for existing..."`
4. Check stats with `window.debugRequestDedup.getStats()`
5. Verify reduced request frequency in network tab

## Monitoring Commands

### Available Debug Functions
```javascript
// Get deduplication statistics
window.debugRequestDedup.getStats()

// Clear all pending requests (emergency)
window.debugRequestDedup.clearAll()

// Clear specific request type
window.debugRequestDedup.clearRequest('getActiveTickets_false')

// Monitor active tickets cache clearing
window.debugClearActiveTicketsCache()
```

## Performance Metrics to Watch
- **Request Count**: Should see fewer `/api/graphql` calls in network tab
- **Deduplication Stats**: `requestCounts` showing saved duplicate requests
- **Response Times**: Faster responses due to reduced server load
- **Cache Hit Rate**: Higher cache utilization

## Expected Impact
- **50-70% reduction** in duplicate GraphQL requests
- **Improved responsiveness** during high-activity periods
- **Reduced server load** and bandwidth usage
- **Better user experience** with faster interface updates

## Rollback Plan
If issues occur, you can:
1. Disable deduplication: `window.debugRequestDedup.clearAll()`
2. Revert component intervals by decreasing the timeout values
3. Remove deduplication imports from dataManager and graphqlService

The system is backward compatible and will gracefully handle any errors in the deduplication service.
