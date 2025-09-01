/**
 * Automatic log uploader - sends frontend logs to backend for file storage
 */

class AutoLogUploader {
    constructor() {
        this.uploadInterval = 30000; // Upload every 30 seconds
        this.maxRetries = 3;
        this.uploadQueue = [];
        this.isUploading = false;
        
        // Start automatic upload timer
        this.startAutoUpload();
    }

    startAutoUpload() {
        if (typeof window === 'undefined') return;
        
        setInterval(() => {
            this.uploadPendingLogs();
        }, this.uploadInterval);

        // Also upload when page is about to unload
        window.addEventListener('beforeunload', () => {
            this.uploadPendingLogs(true); // Force sync upload
        });
    }

    /**
     * Add log entry to upload queue
     */
    queueLogForUpload(logEntry) {
        this.uploadQueue.push({
            ...logEntry,
            uploadId: Math.random().toString(36).substr(2, 8),
            timestamp: logEntry.timestamp || new Date().toISOString(),
            source: 'frontend'
        });

        // If queue gets too large, upload immediately
        if (this.uploadQueue.length >= 50) {
            this.uploadPendingLogs();
        }
    }

    /**
     * Upload all pending logs to backend
     */
    async uploadPendingLogs(forceSync = false) {
        if (this.isUploading || this.uploadQueue.length === 0) return;
        
        this.isUploading = true;
        const logsToUpload = [...this.uploadQueue];
        this.uploadQueue = []; // Clear queue

        try {
            const payload = {
                logs: logsToUpload,
                uploadTimestamp: new Date().toISOString(),
                browserInfo: {
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    timestamp: new Date().toISOString()
                }
            };

            const response = await fetch('/internal-api/frontend-logs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                console.debug(`✅ Uploaded ${logsToUpload.length} logs to backend`);
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

        } catch (error) {
            console.warn('❌ Failed to upload logs to backend:', error.message);
            
            // Re-queue failed logs (but limit retries)
            const retriableLogs = logsToUpload.filter(log => (log.retryCount || 0) < this.maxRetries);
            retriableLogs.forEach(log => {
                log.retryCount = (log.retryCount || 0) + 1;
                this.uploadQueue.unshift(log); // Add back to front of queue
            });

            // If too many logs are failing, clear some to prevent memory issues
            if (this.uploadQueue.length > 200) {
                console.warn('⚠️ Too many failed logs, clearing old entries');
                this.uploadQueue = this.uploadQueue.slice(-100);
            }
        } finally {
            this.isUploading = false;
        }
    }

    /**
     * Get upload statistics
     */
    getUploadStats() {
        return {
            queueSize: this.uploadQueue.length,
            isUploading: this.isUploading,
            uploadInterval: this.uploadInterval,
            maxRetries: this.maxRetries
        };
    }
}

// Create singleton instance
const autoLogUploader = new AutoLogUploader();

export default autoLogUploader;

// Browser console helper
if (typeof window !== 'undefined') {
    window.getLogUploadStats = () => autoLogUploader.getUploadStats();
    window.forceLogUpload = () => autoLogUploader.uploadPendingLogs();
}