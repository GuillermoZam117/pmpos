/**
 * DataManager Service for PMPOS
 * Manages centralized data loading and caching with optimized GraphQL flows
 */
import { appconfig } from '../config';
import { tokenService } from './tokenService';
import cacheService from './cacheService';
import menuService from './menuService';
import Debug from 'debug';

const debug = Debug('pmpos:datamanager');

class DataManager {
    constructor() {
        this.initialized = false;
        this.loading = false;
        this.initPromise = null;
        this.signalRConnection = null;
    }

    /**
     * Initialize application data - Menu + Tables + SignalR
     * This is called once at app startup after authentication
     */
    async initializeApp() {
        if (this.initialized) {
            debug('✅ App already initialized');
            return true;
        }

        if (this.loading) {
            debug('⏳ Initialization in progress, waiting...');
            return await this.initPromise;
        }

        this.loading = true;
        this.initPromise = this._performInitialization();

        try {
            const result = await this.initPromise;
            return result;
        } finally {
            this.loading = false;
        }
    }

    async _performInitialization() {
        debug('🚀 Starting application initialization...');

        try {
            // Step 1: Load Menu (Global Cache - Level 1)
            debug('📋 Step 1: Loading menu...');
            const menuStartTime = performance.now();

            const menu = await menuService.getMenu(false); // Use cache if available

            const menuLoadTime = performance.now() - menuStartTime;
            debug(`✅ Menu loaded in ${menuLoadTime.toFixed(2)}ms - ${menu?.categories?.length || 0} categories`);

            // Step 2: Load Tables (Semi-static Cache - Level 2)
            debug('🏠 Step 2: Loading tables...');
            const tablesStartTime = performance.now();

            const tables = await this.loadTables();

            const tablesLoadTime = performance.now() - tablesStartTime;
            debug(`✅ Tables loaded in ${tablesLoadTime.toFixed(2)}ms - ${tables?.length || 0} tables`);

            // Step 3: Initialize SignalR (Real-time updates)
            debug('📡 Step 3: Initializing SignalR...');
            await this.initializeSignalR();
            debug('✅ SignalR initialized');

            this.initialized = true;
            const totalTime = menuLoadTime + tablesLoadTime;
            debug(`🎉 Application initialized successfully in ${totalTime.toFixed(2)}ms`);

            return {
                success: true,
                menu,
                tables,
                loadTime: totalTime
            };

        } catch (error) {
            debug('❌ Application initialization failed:', error);
            throw error;
        }
    }

    /**
     * Load tables with caching strategy
     */
    async loadTables(forceRefresh = false) {
        debug('🏠 Loading tables...', { forceRefresh });

        // Check cache first (Level 2 - Semi-static with TTL)
        if (!forceRefresh) {
            const cachedTables = cacheService.getTables();
            if (cachedTables) {
                debug('✅ Using cached tables');
                return cachedTables;
            }
        }

        try {
            const token = await tokenService.getValidAccessToken();
            const config = appconfig();

            const query = `
                query GetTables {
                    entities: getEntityScreenItems(name: "MESAS") {
                        id
                        name
                        caption
                        color
                        labelColor
                        state
                        customData
                    }
                }
            `;

            debug('📡 Fetching tables from server...');
            const response = await fetch(config.GQLurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ query })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.errors) {
                throw new Error(`GraphQL Error: ${data.errors.map(e => e.message).join(', ')}`);
            }

            const tables = data.data?.entities || [];
            debug(`✅ Loaded ${tables.length} tables from server`);

            // Process tables with status parsing
            const processedTables = tables.map(table => ({
                ...table,
                status: this.parseTableStatus(table),
                timeElapsed: this.parseTimeFromCaption(table.caption)
            }));

            // Cache tables with TTL (30 seconds)
            cacheService.setTables(processedTables, 30 * 1000);

            return processedTables;

        } catch (error) {
            debug('❌ Error loading tables:', error);
            throw error;
        }
    }

    /**
     * Get active tickets from all users
     * This is called when TableView loads to show real-time ticket status
     */
    async getActiveTickets(forceRefresh = false) {
        debug('🎫 Loading active tickets...', { forceRefresh });

        // Check cache first (Level 3 - Dynamic with short TTL)
        if (!forceRefresh) {
            const cachedTickets = cacheService.getActiveTickets();
            if (cachedTickets) {
                debug('✅ Using cached active tickets');
                return cachedTickets;
            }
        }

        try {
            const token = await tokenService.getValidAccessToken();
            const config = appconfig();

            const query = `
                query GetActiveTickets {
                    tickets: getTickets(isClosed: false) {
                        id
                        uid
                        number
                        date
                        totalAmount
                        remainingAmount
                        entities {
                            name
                            type
                        }
                        tags {
                            tagName
                            tag
                        }
                        states {
                            stateName
                            state
                        }
                        user {
                            name
                        }
                        orders {
                            id
                            name
                            quantity
                            price
                        }
                    }
                }
            `;

            debug('📡 Fetching active tickets from server...');
            const response = await fetch(config.GQLurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ query })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.errors) {
                // Non-critical error - some SambaPOS configurations don't support this query
                debug('⚠️ getTickets query not supported, using empty array:', data.errors[0]?.message);
                return [];
            }

            const tickets = data.data?.tickets || [];
            debug(`✅ Loaded ${tickets.length} active tickets from server`);

            // Cache active tickets with short TTL (10 seconds)
            cacheService.setActiveTickets(tickets, 10 * 1000);

            return tickets;

        } catch (error) {
            debug('❌ Error loading active tickets:', error);
            // Return empty array instead of throwing - this is not critical
            return [];
        }
    }

    /**
     * Get detailed ticket information
     * This is called when opening a specific ticket in POSView
     */
    async getTicketDetails(ticketId) {
        debug('🔍 Loading ticket details...', { ticketId });

        try {
            const token = await tokenService.getValidAccessToken();
            const config = appconfig();

            const query = `
                query GetTicketDetails($ticketId: String!) {
                    ticket(id: $ticketId) {
                        id
                        uid
                        number
                        date
                        totalAmount
                        remainingAmount
                        entities {
                            name
                            type
                        }
                        orders {
                            id
                            uid
                            productId
                            name
                            caption
                            quantity
                            price
                            portion
                            orderTags
                            priceTag
                            calculatePrice
                            locked
                            tags {
                                tag
                                tagName
                                price
                                quantity
                            }
                            states {
                                stateName
                                state
                                stateValue
                            }
                        }
                        states {
                            stateName
                            state
                        }
                        tags {
                            tagName
                            tag
                        }
                    }
                }
            `;

            const response = await fetch(config.GQLurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    query,
                    variables: { ticketId }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.errors) {
                throw new Error(`GraphQL Error: ${data.errors.map(e => e.message).join(', ')}`);
            }

            const ticket = data.data?.ticket;
            debug('✅ Ticket details loaded:', ticket?.number);

            return ticket;

        } catch (error) {
            debug('❌ Error loading ticket details:', error);
            throw error;
        }
    }

    /**
     * Initialize SignalR connection for real-time updates
     */
    async initializeSignalR() {
        try {
            const config = appconfig();
            // Use the proper SignalR URL from config, fallback to constructed URL
            const baseUrl = config.auth?.baseUrl || config.GQLserv || 'http://localhost:9000';
            let signalRUrl = config.SIGNALRurl || `${baseUrl}/signalr`;

            // If running in browser and URL is relative (e.g. '/signalr'), resolve to absolute origin
            if (typeof window !== 'undefined' && signalRUrl && signalRUrl.startsWith('/')) {
                try {
                    signalRUrl = `${window.location.origin}${signalRUrl}`;
                } catch (e) {
                    // Fallback to constructed baseUrl if window.location is not available for some reason
                    signalRUrl = `${baseUrl}/signalr`;
                }
            }

            debug('📡 Connecting to SignalR:', signalRUrl);

            // Validate URL to prevent "undefined/signalr"
            if (signalRUrl.includes('undefined') || !signalRUrl.startsWith('http')) {
                throw new Error(`Invalid SignalR URL: ${signalRUrl}`);
            }

            // Dynamic import of SignalR
            const { HubConnectionBuilder, LogLevel } = await import('@microsoft/signalr');

            this.signalRConnection = new HubConnectionBuilder()
                .withUrl(signalRUrl)
                .withAutomaticReconnect()
                .configureLogging(LogLevel.Information)
                .build();

            // Setup event handlers
            this.signalRConnection.on('TableStatusChanged', (tableData) => {
                debug('📡 SignalR: Table status changed', tableData);
                this.handleTableStatusUpdate(tableData);
            });

            this.signalRConnection.on('TicketCreated', (ticketData) => {
                debug('📡 SignalR: Ticket created', ticketData);
                this.handleTicketUpdate(ticketData);
            });

            this.signalRConnection.on('TicketUpdated', (ticketData) => {
                debug('📡 SignalR: Ticket updated', ticketData);
                this.handleTicketUpdate(ticketData);
            });

            this.signalRConnection.on('OrderAdded', (orderData) => {
                debug('📡 SignalR: Order added', orderData);
                this.handleOrderUpdate(orderData);
            });

            // Start connection
            await this.signalRConnection.start();
            debug('✅ SignalR connected successfully');

        } catch (error) {
            debug('⚠️ SignalR initialization failed (non-critical):', error);
            // SignalR is not critical for basic functionality
        }
    }

    /**
     * Handle real-time table status updates
     */
    handleTableStatusUpdate(tableData) {
        // Invalidate tables cache to force refresh
        cacheService.clearTables();

        // Dispatch event for components to update
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('tableStatusChanged', {
                detail: tableData
            }));
        }
    }

    /**
     * Handle real-time ticket updates
     */
    handleTicketUpdate(ticketData) {
        // Invalidate active tickets cache
        cacheService.clearActiveTickets();

        // Dispatch event for components to update
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ticketUpdated', {
                detail: ticketData
            }));
        }
    }

    /**
     * Handle real-time order updates
     */
    handleOrderUpdate(orderData) {
        // Dispatch event for POS components
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('orderUpdated', {
                detail: orderData
            }));
        }
    }

    /**
     * Parse table status from color
     */
    parseTableStatus(table) {
        if (!table) return 'BLOQUEADO';

        switch (table.color) {
            case '#FF0000':
                return 'CUENTA';
            case '#FFFF00':
                return 'OCUPADO';
            case '#FFFFFF':
            case '#E5E3D8':
                return 'LIBRE';
            default:
                return 'BLOQUEADO';
        }
    }

    /**
     * Parse time elapsed from table caption
     */
    parseTimeFromCaption(caption) {
        if (!caption) return null;
        const match = caption.match(/(\d+)\s*min/);
        return match ? parseInt(match[1], 10) * 60000 : null;
    }

    /**
     * Refresh specific data type
     */
    async refreshData(dataType) {
        switch (dataType) {
            case 'menu':
                return await menuService.getMenu(true); // Force refresh
            case 'tables':
                return await this.loadTables(true); // Force refresh
            case 'tickets':
                return await this.getActiveTickets(true); // Force refresh
            default:
                throw new Error(`Unknown data type: ${dataType}`);
        }
    }

    /**
     * Get cached menu (no network call)
     */
    getCachedMenu() {
        return menuService.getCurrentMenu() || cacheService.getMenu();
    }

    /**
     * Get cached tables (no network call)
     */
    getCachedTables() {
        return cacheService.getTables();
    }

    /**
     * Get cached active tickets (no network call)
     */
    getCachedActiveTickets() {
        return cacheService.getActiveTickets();
    }

    /**
     * Check if app is initialized
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Get initialization status
     */
    getInitStatus() {
        return {
            initialized: this.initialized,
            loading: this.loading,
            hasMenu: !!this.getCachedMenu(),
            hasTables: !!this.getCachedTables(),
            hasSignalR: !!this.signalRConnection?.state
        };
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        debug('🧹 Cleaning up DataManager...');

        if (this.signalRConnection) {
            await this.signalRConnection.stop();
            this.signalRConnection = null;
        }

        this.initialized = false;
        this.loading = false;
        this.initPromise = null;

        debug('✅ DataManager cleanup complete');
    }
}

// Export singleton instance
export default new DataManager();
export { DataManager };