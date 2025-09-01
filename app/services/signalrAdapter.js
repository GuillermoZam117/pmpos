import { appconfig } from '../config';

// Lightweight adapter that exposes a common interface to the rest of the app:
// connect(), on(event, handler), off(event, handler), stop()
// Strategy: try @microsoft/signalr (Core). If the connection attempt fails with
// the specific error indicating a legacy ASP.NET SignalR server, fallback to
// the existing legacy client implementation at ../signalr.js which uses jQuery.

let adapter = null;

class SignalRAdapter {
    constructor() {
        this.connection = null;
        this.isLegacy = false;
        this.handlers = new Map();
        this._legacyModule = null;
        this._stopped = false;
    }

    async connect(url) {
        const config = appconfig();
        const signalRurl = url || config.SIGNALRurl;
        // Perform a lightweight negotiate probe to detect ASP.NET (legacy)
        // SignalR servers. The Core client will log an error when attempting
        // to connect to a legacy server; probing the negotiate endpoint lets
        // us avoid loading the Core client in that case.
        try {
            const negotiateUrl = signalRurl.replace(/\/$/, '') + '/negotiate?clientProtocol=1.5';
            const resp = await fetch(negotiateUrl, { method: 'GET' });
            if (resp.ok) {
                const text = await resp.text();
                // Legacy ASP.NET SignalR negotiate responses typically contain
                // JSON with a 'ConnectionToken' field or other legacy fields.
                // Core negotiate contains 'availableTransports' etc. We'll do
                // a conservative check: if the response contains 'ConnectionToken'
                // it's legacy; otherwise assume Core.
                if (text.includes('ConnectionToken')) {
                    // Legacy server detected - skip Core client
                    this.isLegacy = true;
                    const legacy = (await import('../signalr')).default;
                    this._legacyModule = legacy;
                    this._stopped = false;
                    legacy.connect((payload) => {
                        if (this._stopped) return;
                        // Try to route legacy payloads to specific handlers if they include a type
                        let obj = payload;
                        if (typeof payload === 'string') {
                            try { obj = JSON.parse(payload); } catch (_) { /* keep raw */ }
                        }
                        const known = new Set(['TableStatusChanged','TicketCreated','TicketUpdated','OrderAdded','OrderUpdated','EntityUpdated','EntityStateChanged','ENTITIES_REFRESH']);

                        // Heurística ampliada: soportar sobres típicos ASP.NET SignalR { M: 'Method', A: [args...] }
                        let eventType = null;
                        let eventDetail = null;

                        if (obj && typeof obj === 'object') {
                            // 1) Campos comunes
                            eventType = obj.Type || obj.type || obj.event || obj.Event || null;
                            // 2) ASP.NET SignalR sobre M/A
                            if (!eventType && obj.M) eventType = obj.M;
                            if (obj.A && Array.isArray(obj.A) && obj.A.length) {
                                eventDetail = obj.A[0];
                            }
                            // 3) Otros alias comunes
                            if (!eventType) eventType = obj.Method || obj.method || obj.name || obj.action || null;
                        } else if (typeof payload === 'string') {
                            // 4) SambaPOS-specific format: uuid:<EVENT_TYPE>count;[data...]
                            const sambaMatch = payload.match(/^[a-f0-9\-]+:<([A-Z_]+)>\d+;(\[.*\])$/);
                            if (sambaMatch) {
                                eventType = sambaMatch[1]; // e.g., "ENTITIES_REFRESH"
                                try {
                                    eventDetail = JSON.parse(sambaMatch[2]); // Parse the JSON array
                                    obj = { type: eventType, data: eventDetail };
                                } catch (e) {
                                    if (typeof console !== 'undefined' && console.warn) {
                                        console.warn('[SignalR] Failed to parse SambaPOS event data:', sambaMatch[2]);
                                    }
                                }
                            }
                        }

                        // Preferimos enviar el detalle si existe, sino el objeto completo
                        const payloadForHandlers = (eventDetail !== null && eventDetail !== undefined) ? eventDetail : obj;

                        if (eventType && known.has(eventType)) {
                            const handlers = this.handlers.get(eventType);
                            if (handlers && handlers.size) {
                                for (const h of handlers) { try { h(payloadForHandlers); } catch (_) {} }
                                return;
                            }
                        }

                        // Fallback: broadcast a todos los handlers registrados
                        if (typeof console !== 'undefined' && console.debug) {
                            try { console.debug('[SignalR legacy] Fallback broadcast for payload:', obj); } catch (_) {}
                        }
                        for (const handlers of this.handlers.values()) {
                            for (const h of handlers) { try { h(payloadForHandlers); } catch (_) {} }
                        }
                    }, signalRurl);
                    // Emit global connected event for legacy
                    try { window.dispatchEvent(new CustomEvent('signalrConnected', { detail: { legacy: true, url: signalRurl } })); } catch (e) { }
                    return;
                }
            }
        } catch (probeErr) {
            // Probe failed — continue and let Core client attempt to connect.
            // This avoids blocking behavior if the negotiate endpoint is not
            // accessible for some reason.
        }

        // Prefer Core client first
        try {
            const { HubConnectionBuilder, LogLevel } = await import('@microsoft/signalr');

            this.connection = new HubConnectionBuilder()
                .withUrl(signalRurl)
                .withAutomaticReconnect()
                .configureLogging(LogLevel.Information)
                .build();

            // Re-attach handlers if any were registered before connect
            for (const [event, handlers] of this.handlers.entries()) {
                for (const h of handlers) this.connection.on(event, h);
            }

            await this.connection.start();
            this.isLegacy = false;
            try { window.dispatchEvent(new CustomEvent('signalrConnected', { detail: { legacy: false, url: signalRurl } })); } catch (e) { }
            return;
        } catch (err) {
            // Detect the explicit message emitted by @microsoft/signalr when it
            // detects an ASP.NET (legacy) SignalR server and failover.
            const msg = err && err.message ? err.message : '';
            if (msg.includes('Detected a connection attempt to an ASP.NET SignalR Server')) {
                // Fallback to legacy
                this.isLegacy = true;
                // Use existing legacy helper which attaches its own handlers
                // We will import it and use its connect method which accepts a callback
                const legacy = (await import('../signalr')).default;
                this._legacyModule = legacy;
                this._stopped = false;
                // The legacy module accepts a URL and a callback; pass signalRurl
                legacy.connect((payload) => {
                    if (this._stopped) return;
                    for (const handlers of this.handlers.values()) {
                        for (const h of handlers) {
                            try { h(payload); } catch (e) { /* swallow handler errors */ }
                        }
                    }
                }, signalRurl);
                // Emit connected event
                try { window.dispatchEvent(new CustomEvent('signalrConnected', { detail: { legacy: true, url: signalRurl } })); } catch (e) { }
                return;
            }

            // Other errors: swallow and mark as not connected
            throw err;
        }
    }

    on(event, handler) {
        if (!this.handlers.has(event)) this.handlers.set(event, new Set());
        this.handlers.get(event).add(handler);

        if (this.connection && !this.isLegacy) {
            this.connection.on(event, handler);
        }
        // For legacy client we cannot attach specific event names easily because
        // legacy helper emits a generic 'update' callback; events will be routed
        // to handlers when messages arrive.
    }

    off(event, handler) {
        if (!this.handlers.has(event)) return;
        const set = this.handlers.get(event);
        set.delete(handler);
        if (this.connection && !this.isLegacy) {
            this.connection.off(event, handler);
        }
    }

    async stop() {
        try {
            if (this.connection && !this.isLegacy) {
                await this.connection.stop();
            }
            // If using legacy, call its disconnect() if available
            if (this.isLegacy && this._legacyModule && typeof this._legacyModule.disconnect === 'function') {
                this._stopped = true;
                try { this._legacyModule.disconnect(); } catch (e) { /* ignore */ }
                // Emit disconnected event
                try { window.dispatchEvent(new CustomEvent('signalrDisconnected', { detail: { legacy: true } })); } catch (e) { }
            } else if (this.isLegacy) {
                // Mark stopped so callbacks are ignored
                this._stopped = true;
                try { window.dispatchEvent(new CustomEvent('signalrDisconnected', { detail: { legacy: true } })); } catch (e) { }
            }
            // Core path disconnected
            if (this.connection && !this.isLegacy) {
                try { window.dispatchEvent(new CustomEvent('signalrDisconnected', { detail: { legacy: false } })); } catch (e) { }
            }
        } catch (e) {
            // ignore
        }
    }
}

export default function getAdapter() {
    if (!adapter) adapter = new SignalRAdapter();
    return adapter;
}
