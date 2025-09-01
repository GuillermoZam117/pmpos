/**
 * Utility to export logs from localStorage to downloadable files
 */

export function exportLogsToFile(date = null) {
    if (typeof window === 'undefined') {
        console.warn('Log export is only available in browser environment');
        return;
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const storageKey = `pmpos_logs_${targetDate}`;
    
    try {
        const logsJson = localStorage.getItem(storageKey);
        if (!logsJson) {
            console.warn(`No logs found for date: ${targetDate}`);
            return;
        }

        const logs = JSON.parse(logsJson);
        
        // Format logs for file output
        const formattedLogs = logs.map(log => {
            const { timestamp, level, message, ...metadata } = log;
            const metaStr = Object.keys(metadata).length > 0 ? ` ${JSON.stringify(metadata)}` : '';
            return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`;
        }).join('\n');

        // Create and download file
        const blob = new Blob([formattedLogs], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `pmpos-logs-${targetDate}.log`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        
        console.log(`Exported ${logs.length} log entries for ${targetDate}`);
        
    } catch (error) {
        console.error('Error exporting logs:', error);
    }
}

export function getAllLogDates() {
    if (typeof window === 'undefined') return [];
    
    const logDates = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('pmpos_logs_')) {
            const date = key.replace('pmpos_logs_', '');
            logDates.push(date);
        }
    }
    
    return logDates.sort().reverse(); // Most recent first
}

export function clearLogsForDate(date) {
    if (typeof window === 'undefined') return;
    
    const storageKey = `pmpos_logs_${date}`;
    localStorage.removeItem(storageKey);
    console.log(`Cleared logs for ${date}`);
}

export function getLogStats() {
    if (typeof window === 'undefined') return {};
    
    const dates = getAllLogDates();
    const stats = {
        totalDates: dates.length,
        dates: {}
    };
    
    dates.forEach(date => {
        const storageKey = `pmpos_logs_${date}`;
        try {
            const logs = JSON.parse(localStorage.getItem(storageKey) || '[]');
            stats.dates[date] = {
                count: logs.length,
                errors: logs.filter(log => log.level === 'error').length,
                warnings: logs.filter(log => log.level === 'warn').length,
                apiRequests: logs.filter(log => log.type === 'api_request').length,
                graphqlRequests: logs.filter(log => log.type === 'graphql_request').length
            };
        } catch (e) {
            stats.dates[date] = { count: 0, error: 'Could not parse logs' };
        }
    });
    
    return stats;
}

// Browser console helpers
if (typeof window !== 'undefined') {
    window.exportPMPOSLogs = exportLogsToFile;
    window.getPMPOSLogStats = getLogStats;
    window.getAllPMPOSLogDates = getAllLogDates;
    window.clearPMPOSLogs = clearLogsForDate;
}