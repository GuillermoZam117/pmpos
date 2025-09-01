import { appconfig } from './config';
import $ from 'jquery';
window.jQuery = $;
require('ms-signalr-client');

var config = appconfig();

// Legacy SignalR helper with explicit URL, graceful stop, and reconnect backoff.
export default class LegacySignalR {
    // Internal state
    static _connection = null;
    static _proxy = null;
    static _stopped = false;
    static _reconnectAttempts = 0;
    static _reconnectTimer = null;

    // Start or restart connection. Accepts signalRUrl (absolute) and a callback
    // that will be invoked for incoming messages.
    static connect(callback, signalRUrl) {
        // Allow explicit URL or fallback to config
        const url = signalRUrl || config.SIGNALRserv;

        // Reset stopped flag on explicit connect
        this._stopped = false;

        // Create hub connection and proxy
        this._connection = $.hubConnection(url);
        this._proxy = this._connection.createHubProxy('default');

        // receives broadcast messages from a hub function, called "update"
        this._proxy.off('update');
        this._proxy.on('update', (message) => {
            try {
                if (this._stopped) return; // ignore callbacks after stop
                // Route message to callback if provided
                if (callback) callback(message);
            } catch (e) {
                console.error('LegacySignalR handler error', e);
            }
        });

        // attempt connection, and handle errors
        this._connection.start({ jsonp: true })
            .done(() => {
                console.log('Signalr now connected, connection ID=' + this._connection.id);
                this._reconnectAttempts = 0;
            })
            .fail(() => {
                console.log('Signalr could not connect');
                this._scheduleReconnect(callback, url);
            });

        // disconnected handler - schedule reconnect unless stopped
        this._connection.disconnected(() => {
            if (this._stopped) return;
            this._scheduleReconnect(callback, url);
        });
    }

    static _scheduleReconnect(callback, url) {
        // exponential backoff with jitter
        this._reconnectAttempts = Math.min(this._reconnectAttempts + 1, 6);
        const base = 1000 * Math.pow(2, this._reconnectAttempts); // ms
        const jitter = Math.floor(Math.random() * 1000);
        const delay = Math.min(base + jitter, 30000); // cap at 30s

        if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
        this._reconnectTimer = setTimeout(() => {
            if (this._stopped) return;
            try {
                // Attempt to reconnect by creating a fresh connection
                LegacySignalR.connect(callback, url);
            } catch (e) {
                console.error('LegacySignalR reconnect failed', e);
                this._scheduleReconnect(callback, url);
            }
        }, delay);
    }

    // Graceful stop: prevent further callbacks and stop the underlying connection
    static disconnect() {
        this._stopped = true;
        if (this._reconnectTimer) {
            clearTimeout(this._reconnectTimer);
            this._reconnectTimer = null;
        }
        try {
            if (this._connection) {
                // stop server polling if supported
                if (typeof this._connection.stop === 'function') {
                    this._connection.stop();
                }
                this._connection = null;
                this._proxy = null;
            }
        } catch (e) {
            console.error('LegacySignalR disconnect error', e);
        }
    }
}