/**
 * Notification Service
 * Manages in-app notifications and browser push notifications
 * Integrates with SignalR for real-time updates
 */

import Debug from 'debug';

const debug = Debug('pmpos:notification-service');

class NotificationService {
    constructor() {
        this.listeners = new Set();
        this.notificationQueue = [];
        this.maxQueueSize = 50;
        this.soundEnabled = true;
        this.vibrationEnabled = true;

        // Notification types
        this.TYPES = {
            INFO: 'info',
            SUCCESS: 'success',
            WARNING: 'warning',
            ERROR: 'error',
            DELIVERY: 'delivery',
            ORDER: 'order',
            PAYMENT: 'payment'
        };

        // Initialize notification permission
        this.checkPermission();
    }

    /**
     * Check and request browser notification permission
     */
    async checkPermission() {
        if (!('Notification' in window)) {
            debug('⚠️ Browser notifications not supported');
            return false;
        }

        if (Notification.permission === 'granted') {
            debug('✅ Notification permission granted');
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            debug('📢 Notification permission:', permission);
            return permission === 'granted';
        }

        return false;
    }

    /**
     * Subscribe to notifications
     * @param {Function} callback - Callback function(notification)
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this.listeners.add(callback);
        debug('👂 Notification listener added. Total:', this.listeners.size);

        // Return unsubscribe function
        return () => {
            this.listeners.delete(callback);
            debug('👋 Notification listener removed. Total:', this.listeners.size);
        };
    }

    /**
     * Show notification
     * @param {Object} notification - Notification object
     * @param {string} notification.title - Notification title
     * @param {string} notification.message - Notification message
     * @param {string} notification.type - Notification type (info, success, warning, error, delivery, order, payment)
     * @param {number} notification.duration - Duration in ms (default: 5000)
     * @param {Object} notification.data - Additional data
     */
    notify(notification) {
        const fullNotification = {
            id: `notif_${Date.now()}_${Math.random()}`,
            timestamp: new Date(),
            duration: 5000,
            type: this.TYPES.INFO,
            ...notification
        };

        debug('📢 Notification:', fullNotification.title, '-', fullNotification.message);

        // Add to queue
        this.notificationQueue.unshift(fullNotification);
        if (this.notificationQueue.length > this.maxQueueSize) {
            this.notificationQueue.pop();
        }

        // Notify all listeners
        this.listeners.forEach(listener => {
            try {
                listener(fullNotification);
            } catch (error) {
                console.error('Error in notification listener:', error);
            }
        });

        // Show browser notification if permission granted
        this.showBrowserNotification(fullNotification);

        // Play sound
        if (this.soundEnabled) {
            this.playNotificationSound(fullNotification.type);
        }

        // Vibrate
        if (this.vibrationEnabled && 'vibrate' in navigator) {
            this.vibrateNotification(fullNotification.type);
        }

        return fullNotification.id;
    }

    /**
     * Show browser notification
     */
    async showBrowserNotification(notification) {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }

        try {
            const browserNotif = new Notification(notification.title, {
                body: notification.message,
                icon: '/icon-192x192.png',
                badge: '/icon-72x72.png',
                tag: notification.id,
                requireInteraction: notification.type === this.TYPES.ERROR ||
                                   notification.type === this.TYPES.DELIVERY,
                data: notification.data,
                timestamp: notification.timestamp.getTime()
            });

            browserNotif.onclick = () => {
                window.focus();
                browserNotif.close();

                // Trigger action if provided
                if (notification.onClick) {
                    notification.onClick(notification.data);
                }
            };

            debug('🔔 Browser notification shown:', notification.title);
        } catch (error) {
            debug('❌ Error showing browser notification:', error);
        }
    }

    /**
     * Play notification sound
     */
    playNotificationSound(type) {
        try {
            // Different frequencies for different notification types
            const frequencies = {
                [this.TYPES.INFO]: 440,
                [this.TYPES.SUCCESS]: 523,
                [this.TYPES.WARNING]: 349,
                [this.TYPES.ERROR]: 277,
                [this.TYPES.DELIVERY]: 587,
                [this.TYPES.ORDER]: 659,
                [this.TYPES.PAYMENT]: 698
            };

            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = frequencies[type] || 440;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            debug('⚠️ Could not play notification sound:', error);
        }
    }

    /**
     * Vibrate notification
     */
    vibrateNotification(type) {
        try {
            const patterns = {
                [this.TYPES.INFO]: [100],
                [this.TYPES.SUCCESS]: [100, 50, 100],
                [this.TYPES.WARNING]: [200, 100, 200],
                [this.TYPES.ERROR]: [300, 100, 300, 100, 300],
                [this.TYPES.DELIVERY]: [100, 50, 100, 50, 100],
                [this.TYPES.ORDER]: [150, 50, 150],
                [this.TYPES.PAYMENT]: [200]
            };

            navigator.vibrate(patterns[type] || [100]);
        } catch (error) {
            debug('⚠️ Could not vibrate:', error);
        }
    }

    /**
     * Show delivery status notification
     */
    notifyDeliveryStatus(ticketNumber, oldStatus, newStatus, customer) {
        const statusMessages = {
            'NUEVO': 'Nuevo pedido recibido',
            'PREPARANDO': 'Pedido en preparación',
            'LISTO': 'Pedido listo para envío',
            'EN RUTA': 'Pedido en camino',
            'ENTREGADO': 'Pedido entregado',
            'PAGADO': 'Pedido pagado',
            'CANCELADO': 'Pedido cancelado'
        };

        this.notify({
            title: `Pedido #${ticketNumber}`,
            message: `${statusMessages[newStatus] || newStatus}${customer ? ` - ${customer}` : ''}`,
            type: this.TYPES.DELIVERY,
            duration: 7000,
            data: {
                ticketNumber,
                oldStatus,
                newStatus,
                customer,
                type: 'delivery_status'
            }
        });
    }

    /**
     * Show order notification
     */
    notifyNewOrder(ticketNumber, customer, items) {
        this.notify({
            title: 'Nuevo Pedido',
            message: `Pedido #${ticketNumber}${customer ? ` de ${customer}` : ''} - ${items} producto(s)`,
            type: this.TYPES.ORDER,
            duration: 8000,
            data: {
                ticketNumber,
                customer,
                items,
                type: 'new_order'
            }
        });
    }

    /**
     * Show payment notification
     */
    notifyPayment(ticketNumber, amount, paymentType) {
        this.notify({
            title: 'Pago Recibido',
            message: `Ticket #${ticketNumber} - ${paymentType}: $${amount.toFixed(2)}`,
            type: this.TYPES.PAYMENT,
            duration: 5000,
            data: {
                ticketNumber,
                amount,
                paymentType,
                type: 'payment'
            }
        });
    }

    /**
     * Get notification history
     */
    getHistory(limit = 20) {
        return this.notificationQueue.slice(0, limit);
    }

    /**
     * Clear notification history
     */
    clearHistory() {
        this.notificationQueue = [];
        debug('🗑️ Notification history cleared');
    }

    /**
     * Enable/disable sound
     */
    setSoundEnabled(enabled) {
        this.soundEnabled = enabled;
        debug('🔊 Notification sound:', enabled ? 'enabled' : 'disabled');
    }

    /**
     * Enable/disable vibration
     */
    setVibrationEnabled(enabled) {
        this.vibrationEnabled = enabled;
        debug('📳 Notification vibration:', enabled ? 'enabled' : 'disabled');
    }

    /**
     * Test notification
     */
    test() {
        this.notify({
            title: 'Prueba de Notificación',
            message: 'Este es un mensaje de prueba del sistema de notificaciones',
            type: this.TYPES.INFO,
            duration: 3000
        });
    }
}

export default new NotificationService();
