/**
 * DataManager Service for PMPOS
 * Manages centralized data loading and caching with optimized GraphQL flows
 */
import { appconfig } from '../config';
import { tokenService } from './tokenService';
import networkHealthService from './networkHealthService';
import cacheService from './cacheService';
import menuService from './menuService';
import orderTagService from './orderTagService';
import productOrderTagsIndex from './productOrderTagsIndex';
import requestDeduplicationService from './requestDeduplicationService';
import './orderTagPreload';
import Debug from 'debug';

const debug = Debug('pmpos:datamanager');

class DataManager {
    constructor() {
        this.initialized = false;
        this.loading = false;
        this.initPromise = null;
        this.signalRConnection = null;
        this._ticketEventTimer = null;
        this._tableEventTimer = null;
        this._pollingInterval = null;
        this._lastSignalRActivity = Date.now();
        this._signalRConnected = false;
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
            // Step 0: Check network connectivity first
            debug('🌐 Step 0: Checking network connectivity...');
            const isConnected = await networkHealthService.checkSambaPOSConnectivity();
            if (!isConnected) {
                debug('⚠️ Network connectivity issues detected, continuing with cached data...');
                // Continue with cached data if available
            }

            // Step 1: Load Menu (Global Cache - Level 1)
            debug('📋 Step 1: Loading menu...');
            const menuStartTime = performance.now();

            const menu = await menuService.getMenu(false); // Use cache if available

            const menuLoadTime = performance.now() - menuStartTime;
            debug(`✅ Menu loaded in ${menuLoadTime.toFixed(2)}ms - ${menu?.categories?.length || 0} categories`);

            // Warm order tag groups cache asynchronously (non-blocking)
            try {
                orderTagService.preload(menu, 4).catch(() => { });
            } catch (e) {
                debug('⚠️ order tags preload failed to start:', e?.message || e);
            }

            // Step 1.5: Build productOrderTagsIndex for fast Order Tags lookup
            debug('🏷️ Step 1.5: Building product order tags index...');
            try {
                // Build index asynchronously to avoid blocking initialization
                productOrderTagsIndex.build(false).catch(err => {
                    debug('⚠️ productOrderTagsIndex build failed:', err);
                });
                debug('✅ Product order tags index build started');
            } catch (e) {
                debug('⚠️ productOrderTagsIndex build failed to start:', e?.message || e);
            }

            // Step 2: Load Tables (Semi-static Cache - Level 2)
            debug('🏠 Step 2: Loading tables...');
            const tablesStartTime = performance.now();

            // Prefer SQL read-service when enabled
            const useSql = process.env.REACT_APP_USE_SQL_READS === 'true';
            let tables;
            if (useSql) {
                try {
                    tables = await this.fetchTablesSql();
                } catch (err) {
                    debug('\u26a0 fetchTables failed, falling back to previous loadTables()', err.message);
                    tables = await this.loadTables();
                }
            } else {
                tables = await this.loadTables();
            }

            const tablesLoadTime = performance.now() - tablesStartTime;
            debug(`✅ Tables loaded in ${tablesLoadTime.toFixed(2)}ms - ${tables?.length || 0} tables`);

            // Step 3: Initialize SignalR (Real-time updates)
            debug('📡 Step 3: Initializing SignalR...');
            await this.initializeSignalR();
            debug('✅ SignalR initialized');

            this.initialized = true;
            const totalTime = menuLoadTime + tablesLoadTime;
            debug(`🎉 Application initialized successfully in ${totalTime.toFixed(2)}ms`);

            // Start intelligent polling backup system
            this.startIntelligentPolling();

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
     * Resolve product name by productId via global menu index
     */
    getProductName(productId) {
        return menuService.getProductNameById(productId);
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
            // Prefer SQL read-service when enabled
            const useSql = process.env.REACT_APP_USE_SQL_READS === 'true';
            if (useSql) {
                try {
                    const tables = await this.fetchTablesSql();
                    debug(`✅ Loaded ${tables?.length || 0} tables from read-service`);

                    // Process tables with status parsing
                    const processedTables = tables.map(table => {
                        const status = this.parseTableStatus(table);
                        return {
                            ...table,
                            status: status,
                            color: this.mapStatusToColor(status), // Ensure consistent color mapping
                            timeElapsed: this.parseTimeFromCaption(table.caption)
                        };
                    });
                    // Overlay active tickets to ensure occupied/bill states are visible
                    try {
                        await this.tryOverlayActiveTickets(processedTables);
                    } catch (e) {
                        debug('⚠️ overlay active tickets failed:', e?.message || e);
                    }

                    // Cache tables with longer TTL (60 seconds) since table structure doesn't change often
                    debug('💾 Saving tables to cache:', { count: processedTables.length, sample: processedTables[0] });
                    cacheService.setTables(processedTables, 60 * 1000);

                    // Verify cache was set correctly
                    const cachedCheck = cacheService.getTables();
                    debug('✅ Cache verification:', { cachedCount: cachedCheck?.length || 0, success: !!cachedCheck });

                    // Emit event for components to update
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('dataManagerRefresh', {
                            detail: { type: 'tables', count: processedTables.length, source: 'read-service' }
                        }));
                    }
                    return processedTables;
                } catch (err) {
                    debug('\u26a0 fetchTables failed, falling back to GraphQL', err.message);
                }
            }

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
            const processedTables = tables.map(table => {
                const status = this.parseTableStatus(table);
                return {
                    ...table,
                    status: status,
                    color: this.mapStatusToColor(status), // Ensure consistent color mapping
                    timeElapsed: this.parseTimeFromCaption(table.caption)
                };
            });

            // Cache tables with longer TTL (60 seconds) since table structure doesn't change often
            debug('💾 Saving tables to cache:', { count: processedTables.length, sample: processedTables[0] });
            cacheService.setTables(processedTables, 60 * 1000);

            // Verify cache was set correctly
            const cachedCheck = cacheService.getTables();
            debug('✅ Cache verification:', { cachedCount: cachedCheck?.length || 0, success: !!cachedCheck });

            // Emit event for components to update
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('dataManagerRefresh', {
                    detail: { type: 'tables', count: processedTables.length }
                }));
            }

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
        // Use request deduplication to prevent concurrent calls
        const cacheKey = `getActiveTickets_${forceRefresh}`;

        return await requestDeduplicationService.execute(
            cacheKey,
            async () => {
                debug('🎫 Loading active tickets...', { forceRefresh });

                // Check cache first (Level 3 - Dynamic with short TTL)
                if (!forceRefresh) {
                    const cachedTickets = cacheService.getActiveTickets();
                    if (cachedTickets) {
                        debug('✅ Using cached active tickets');
                        return cachedTickets;
                    }
                }

                return await this._loadActiveTicketsFromServer();
            },
            2000 // Minimum 2 seconds between requests
        );
    }

    /**
     * Internal method to load active tickets from server
     * Separated for better organization and testing
     */
    async _loadActiveTicketsFromServer() {

        // Check cache first (Level 3 - Dynamic with short TTL)
        if (!forceRefresh) {
            const cachedTickets = cacheService.getActiveTickets();
            if (cachedTickets) {
                debug('✅ Using cached active tickets');
                return cachedTickets;
            }
        }
    }

    /**
     * Internal method to load active tickets from server
     * Separated for better organization and testing
     */
    async _loadActiveTicketsFromServer() {
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
                            OrderStates
                            orderStates
                            states {
                                stateName
                                state
                            }
                        }
                    }
                }
            `;

            console.log('🔄 [loadActiveTickets] STARTING - about to fetch from server...');
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

            // Special debugging for multiple mesas and tickets of interest
            const debugTickets = tickets.filter(ticket =>
                ticket.id === 27445 || ticket.id === 27374 || // Specific ticket IDs
                (ticket.entities && ticket.entities.some(e =>
                    (e.name === '1' || e.name === '17') && e.type && e.type.toLowerCase().includes('mesa')
                ))
            );

            if (debugTickets.length > 0) {
                console.log('🚨 [dataManager] SPECIAL DEBUG - Target tickets before filtering:',
                    debugTickets.map(t => ({
                        id: t.id,
                        remainingAmount: t.remainingAmount,
                        totalAmount: t.totalAmount,
                        isClosed: t.isClosed,
                        entities: t.entities,
                        states: t.states
                    }))
                );
            } else {
                console.log('🚨 [dataManager] SPECIAL DEBUG - NO target tickets found in response. Total tickets:', tickets.length);

                // Show a sample of all tickets for debugging
                if (tickets.length > 0) {
                    console.log('🚨 [dataManager] Sample of all tickets:',
                        tickets.slice(0, 3).map(t => ({
                            id: t.id,
                            remainingAmount: t.remainingAmount,
                            entities: t.entities?.map(e => ({ name: e.name, type: e.type }))
                        }))
                    );
                }
            }

            // Filter out paid tickets (remainingAmount = 0) to prevent them from showing on free tables
            const activeTickets = tickets.filter(ticket => {
                const isActive = ticket.remainingAmount > 0;

                // Special logging for target tickets (Mesa 1, 17, and specific ticket IDs)
                if (ticket.id === 27445 || ticket.id === 27374 ||
                    (ticket.entities && ticket.entities.some(e =>
                        (e.name === '1' || e.name === '17') && e.type && e.type.toLowerCase().includes('mesa')
                    ))) {
                    console.log('🚨 [dataManager] Target ticket filter check:', {
                        id: ticket.id,
                        mesa: ticket.entities?.find(e => e.type?.toLowerCase().includes('mesa'))?.name,
                        remainingAmount: ticket.remainingAmount,
                        isActive: isActive,
                        willBeFiltered: !isActive
                    });
                }

                if (!isActive && ticket.remainingAmount === 0) {
                    debug('💳 Filtering out paid ticket:', {
                        id: ticket.id,
                        number: ticket.number,
                        totalAmount: ticket.totalAmount,
                        remainingAmount: ticket.remainingAmount
                    });
                }
                return isActive;
            });

            debug(`✅ Loaded ${tickets.length} tickets from server, ${activeTickets.length} active (unpaid) tickets after filtering`);

            // Cache active tickets with short TTL (10 seconds)
            cacheService.setActiveTickets(activeTickets, 10 * 1000);

            // Emit event for components to update
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('dataManagerRefresh', {
                    detail: { type: 'tickets', count: activeTickets.length }
                }));
            }

            return activeTickets;

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
            const useSql = process.env.REACT_APP_USE_SQL_READS === 'true';
            if (useSql) {
                try {
                    const { fetchTicketDetails } = await import('../queries');
                    const ticket = await fetchTicketDetails(ticketId);
                    debug('\u2705 Ticket details loaded (read-service):', ticket?.number);
                    return ticket;
                } catch (err) {
                    debug('\u26a0 fetchTicketDetails failed, falling back to GraphQL', err.message);
                }
            }

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

            // Use the SignalR adapter that handles Core -> legacy fallback
            const getAdapter = await import('./signalrAdapter').then(m => m.default || m);
            this.signalRConnection = getAdapter();

            // Register handlers on adapter
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

            // Also handle common variants to keep UI in sync
            this.signalRConnection.on('OrderUpdated', (orderData) => {
                debug('📡 SignalR: Order updated', orderData);
                this.handleOrderUpdate(orderData);
            });

            this.signalRConnection.on('EntityUpdated', (entityData) => {
                debug('📡 SignalR: Entity updated', entityData);
                this.handleEntitiesRefresh(entityData);
            });

            this.signalRConnection.on('EntityStateChanged', (entityData) => {
                debug('📡 SignalR: Entity state changed', entityData);
                this.handleEntitiesRefresh(entityData);
            });

            this.signalRConnection.on('ENTITIES_REFRESH', (entityData) => {
                debug('📡 SignalR: Entities refresh', entityData);
                this.handleEntitiesRefresh(entityData);
            });

            await this.signalRConnection.connect(signalRUrl);
            debug('✅ SignalR connected (adapter)');

        } catch (error) {
            debug('⚠️ SignalR initialization failed (non-critical):', error);
            // SignalR is not critical for basic functionality
        }
    }

    /**
     * Handle real-time table status updates
     */
    handleTableStatusUpdate(tableData) {
        // Mark SignalR activity
        this._lastSignalRActivity = Date.now();
        this._signalRConnected = true;

        // Debounce bursts of table events to avoid thrashing (increased debounce time)
        if (this._tableEventTimer) clearTimeout(this._tableEventTimer);
        this._tableEventTimer = setTimeout(() => {
            // Proactively refresh tables so UI updates immediately
            this.loadTables(true)
                .then((tables) => {
                    debug('✅ Tables refreshed after TableStatusChanged', { count: tables?.length || 0 });
                    // loadTables handles cache + dataManagerRefresh event
                })
                .catch((err) => {
                    debug('⚠️ Table refresh failed after TableStatusChanged, clearing cache', err?.message || err);
                    cacheService.clearTables();
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('dataManagerRefresh', { detail: { type: 'tables', source: 'signalr-fallback' } }));
                    }
                });
        }, 500); // Increased debounce from 150ms to 500ms to reduce rapid fire updates
    }

    /**
     * Handle real-time ticket updates
     */
    handleTicketUpdate(ticketData) {
        // Mark SignalR activity
        this._lastSignalRActivity = Date.now();
        this._signalRConnected = true;

        // Debounce bursts of ticket events to avoid thrashing (increased debounce time)
        if (this._ticketEventTimer) clearTimeout(this._ticketEventTimer);
        this._ticketEventTimer = setTimeout(() => {
            // Proactively refresh active tickets so order/ticket status syncs immediately
            this.getActiveTickets(true)
                .then((tickets) => {
                    debug('✅ Active tickets refreshed after Ticket event', { count: tickets?.length || 0 });
                    // getActiveTickets handles cache + dataManagerRefresh event
                })
                .catch((err) => {
                    debug('⚠️ Active tickets refresh failed, clearing cache', err?.message || err);
                    cacheService.clearActiveTickets();
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('dataManagerRefresh', { detail: { type: 'tickets', source: 'signalr-fallback' } }));
                    }
                });
        }, 400); // Increased debounce from 120ms to 400ms to reduce rapid fire updates
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

        // Also refresh active tickets to sync order status changes in UI
        this.getActiveTickets(true)
            .then((tickets) => {
                debug('✅ Active tickets refreshed after Order event', { count: tickets?.length || 0 });
            })
            .catch((err) => {
                debug('⚠️ Active tickets refresh failed after Order event', err?.message || err);
            });
    }

    /**
     * Handle ENTITIES_REFRESH events from SignalR
     * This populates the cache with fresh table data instead of just clearing it
     */
    handleEntitiesRefresh(entityData) {
        // Mark SignalR activity
        this._lastSignalRActivity = Date.now();
        this._signalRConnected = true;

        debug('📡 Processing ENTITIES_REFRESH with data:', entityData);
        // Normalize to array if we received a single entity object
        const payloadArray = Array.isArray(entityData) ? entityData : (entityData ? [entityData] : []);

        // Enhanced debugging for state changes
        if (Array.isArray(entityData)) {
            debug('📋 ENTITIES_REFRESH detailed data:', {
                count: entityData.length,
                entities: entityData.map(e => ({
                    id: e.EntityId || e.id,
                    name: e.EntityName || e.name || e.Name,
                    state: e.EntityState || e.state,
                    ticketId: e.TicketId,
                    ticketNumber: e.TicketNumber
                }))
            });
        }

        try {
            // entityData should be an array of table entities from SambaPOS
            if (payloadArray.length > 0) {
                // Transform SambaPOS entities to our table format
                const tables = payloadArray.map(entity => {
                    // Extract status with better fallback handling
                    let status = entity.EntityState || entity.state || entity.Status;

                    // Normalize unknown statuses to prevent gray flickering
                    if (!status || status === '' || status === null || status === undefined) {
                        status = 'LIBRE'; // Default to available if status is missing
                    }

                    // Map status to ensure consistency with regular table loading
                    const mappedStatus = this.normalizeEntityStatus(status);
                    const color = this.mapStatusToColor(mappedStatus);

                    // Get raw entity name and clean HTML tags
                    const rawEntityName = entity.EntityName || entity.name || entity.Name || entity.EntityCustomData?.name || `Mesa ${entity.EntityId || entity.id}`;
                    const entityName = this.cleanHtmlFromEntityName(rawEntityName);

                    // Enhanced debugging for SignalR color flickering issues
                    debug(`🔄 SignalR Entity Transform: ${entityName}`, {
                        originalStatus: entity.EntityState || entity.state || entity.Status,
                        normalizedStatus: mappedStatus,
                        color: color,
                        rawName: rawEntityName,
                        cleanName: entityName
                    });

                    return {
                        id: entity.EntityId || entity.id,
                        name: entityName,
                        status: mappedStatus,
                        color: color,
                        ticketId: entity.TicketId || null,
                        ticketNumber: entity.TicketNumber || null,
                        time: entity.Time || null,
                        data: entity // Keep original data for debugging
                    };
                });

                debug(`✅ Transformed ${tables.length} entities to table format`);

                // Update cache with fresh data instead of clearing it
                cacheService.setTables(tables, 60 * 1000); // Cache for 1 minute

                // Emit event for UI components
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('dataManagerRefresh', {
                        detail: { type: 'tables', count: tables.length, source: 'signalr' }
                    }));
                }
            } else {
                debug('⚠️ ENTITIES_REFRESH with no data, clearing cache');
                cacheService.clearTables();
            }
        } catch (error) {
            debug('❌ Error processing ENTITIES_REFRESH:', error);
            // On error, fallback to clearing cache
            cacheService.clearTables();
        }
    }

    /**
     * Normalize entity status to ensure consistency between SignalR and GraphQL updates
     */
    normalizeEntityStatus(status) {
        if (!status || typeof status !== 'string') {
            return 'LIBRE';
        }

        const upperStatus = status.toUpperCase().trim();

        // Map various status variations to consistent values
        const statusMap = {
            // Available variations
            'DISPONIBLE': 'LIBRE',
            'AVAILABLE': 'LIBRE',
            'FREE': 'LIBRE',
            'EMPTY': 'LIBRE',

            // Occupied variations
            'OCUPADO': 'OCUPADO',
            'OCCUPIED': 'OCUPADO',
            'BUSY': 'OCUPADO',
            'NUEVOS PEDIDOS': 'OCUPADO',
            'NEW ORDERS': 'OCUPADO',

            // Bill requested variations
            'CUENTA': 'CUENTA',
            'BILL': 'CUENTA',
            'CHECK': 'CUENTA',
            'CUENTA SOLICITADA': 'CUENTA',
            'BILL REQUESTED': 'CUENTA',

            // Blocked variations
            'BLOQUEADO': 'BLOQUEADO',
            'BLOCKED': 'BLOQUEADO',
            'LOCKED': 'BLOQUEADO'
        };

        return statusMap[upperStatus] || upperStatus;
    }

    /**
     * Map entity status to color for backwards compatibility
     */
    mapStatusToColor(status) {
        switch (status) {
            case 'Disponible':
            case 'LIBRE':
                return '#f5f5f4'; // Light beige/gray for available tables
            case 'Ocupado':
            case 'OCUPADO':
            case 'Nuevos pedidos':
                return '#fbbf24'; // Yellow for occupied/new orders
            case 'Cuenta':
            case 'CUENTA':
            case 'Cuenta solicitada':
            case 'BLOQUEADO':
                return '#dc2626'; // Professional red for bill/blocked
            default:
                return '#9ca3af'; // Gray for unknown status
        }
    }

    /**
     * Clean HTML tags from entity names (e.g., <size 190>1<br/><br/>1 min.</size>)
     */
    cleanHtmlFromEntityName(name) {
        if (!name || typeof name !== 'string') {
            return name;
        }

        // Remove HTML tags like <size 190>...</size>, <br/>, etc.
        let cleanName = name
            .replace(/<[^>]*>/g, '') // Remove all HTML tags
            .replace(/&lt;/g, '<')   // Decode HTML entities
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&nbsp;/g, ' ')
            .trim();

        // Handle complex patterns like "112" (where "1" is repeated), "314", etc.
        // These seem to be duplicated digits or complex entity names

        // First, try to extract just the first meaningful number
        const singleNumberMatch = cleanName.match(/^(\d+)/);
        if (singleNumberMatch) {
            const number = singleNumberMatch[1];

            // If it's a repeating pattern like "112" -> "1", "223" -> "2", etc.
            if (number.length >= 2) {
                const firstDigit = number[0];
                const isRepeatingPattern = number.split('').every(digit => digit === firstDigit);
                if (isRepeatingPattern) {
                    return firstDigit; // Return just the first digit for repeating patterns
                }

                // Check if it's a simple concatenation like "11" -> "1", "22" -> "2"
                if (number.length === 2 && number[0] === number[1]) {
                    return number[0];
                }

                // For other multi-digit cases, try to find the actual table number
                // If the string contains time info, it might be like "1 1 min." -> extract first digit
                if (cleanName.includes('min') || cleanName.includes(':')) {
                    return firstDigit;
                }
            }

            return number; // Return the full number if it seems legitimate
        }

        return cleanName;
    }

    /**
     * Parse table status from color
     */
    parseTableStatus(table) {
        if (!table) return 'BLOQUEADO';

        // First try to get status from entity state if available
        if (table.status) {
            return this.normalizeEntityStatus(table.status);
        }
        if (table.EntityState || table.state) {
            return this.normalizeEntityStatus(table.EntityState || table.state);
        }

        // Fallback to color-based parsing for compatibility
        let statusFromColor;
        switch (table.color) {
            case '#FF0000':
                statusFromColor = 'CUENTA';
                break;
            case '#FFFF00':
                statusFromColor = 'OCUPADO';
                break;
            case '#FFFFFF':
            case '#E5E3D8':
                statusFromColor = 'LIBRE';
                break;
            default:
                statusFromColor = 'BLOQUEADO';
                break;
        }

        return this.normalizeEntityStatus(statusFromColor);
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
     * Resolve base URL for read-service in production (no dev proxy)
     */
    resolveReadServiceBase() {
        try {
            const env = process?.env?.READ_SERVICE_URL;
            if (env) return String(env).replace(/\/$/, '');
            const cfg = appconfig();
            const base = cfg?.GQLserv || (typeof window !== 'undefined' ? window.location.origin : '');
            if (!base) return null;
            const u = new URL(base);
            const port = (u.port && u.port !== '80' && u.port !== '443') ? u.port : '9000';
            const hostPort = port === '9000' ? '4005' : port;
            return `${u.protocol}//${u.hostname}:${hostPort}`;
        } catch (_) {
            return null;
        }
    }

    /**
     * Fetch tables directly from read-service (prod-safe, no webpack dev proxy required)
     */
    async fetchTablesSql() {
        const screenName = process.env.SAMBAPOS_ENTITY_SCREEN || 'MESAS';
        const screen = encodeURIComponent(screenName);
        const base = this.resolveReadServiceBase();
        if (!base) throw new Error('No READ_SERVICE_URL or base derivation available');

        // Build candidate endpoints (prefer active-only if available on server)
        const ls = (typeof window !== 'undefined') ? window.localStorage : null;
        const activeOnlyFlag = (ls && ls.getItem('READ_SERVICE_ACTIVE_ONLY')) || process?.env?.READ_SERVICE_ACTIVE_ONLY || 'false';
        const preferActiveOnly = String(activeOnlyFlag).toLowerCase() === 'true';
        const candidates = [];
        if (preferActiveOnly) {
            candidates.push(`${base}/internal-api/tables?screen=${screen}&activeOnly=true`);
            candidates.push(`${base}/internal-api/tables/active?screen=${screen}`);
        }
        // Entity screen items shape (server may expose this alias)
        candidates.push(`${base}/internal-api/entity-screen-items?name=${encodeURIComponent(screenName)}`);
        // Generic tables list filtered by screen
        candidates.push(`${base}/internal-api/tables?screen=${screen}`);

        const headers = { 'Content-Type': 'application/json' };
        const apiKey = (ls && (ls.getItem('READ_SERVICE_APIKEY') || ls.getItem('INTERNAL_API_KEY')))
            || process?.env?.READ_SERVICE_APIKEY || process?.env?.INTERNAL_API_KEY;
        if (apiKey) {
            headers['apikeyAuth'] = apiKey;
            headers['X-INTERNAL-API-KEY'] = apiKey;
        }

        let rows = null;
        let lastErr = null;
        for (const endpoint of candidates) {
            try {
                const resp = await fetch(endpoint, { method: 'GET', headers });
                if (!resp.ok) {
                    lastErr = new Error(`HTTP ${resp.status}`);
                    continue;
                }
                rows = await resp.json();
                break;
            } catch (e) {
                lastErr = e;
            }
        }
        if (!rows) throw lastErr || new Error('No SQL endpoint available for tables');

        return (Array.isArray(rows) ? rows : []).map(r => ({
            id: r.EntityId ?? r.Id ?? r.entityId ?? r.id ?? null,
            name: String(r.EntityName ?? r.Name ?? r.entityName ?? r.name ?? ''),
            caption: String(r.Caption ?? r.EntityCaption ?? r.Name ?? r.name ?? ''),
            color: r.Color ?? null,
            labelColor: r.LabelColor ?? '#000000',
            status: r.Status ?? r.status ?? null,
            customData: r.CustomData ?? r.customData ?? null
        }));
    }

    /**
     * Fetch active tickets from read-service
     */
    async fetchActiveTicketsSql() {
        const base = this.resolveReadServiceBase();
        if (!base) throw new Error('No READ_SERVICE_URL or base derivation available');
        const url = `${base}/internal-api/active-tickets`;
        const headers = { 'Content-Type': 'application/json' };
        const ls = (typeof window !== 'undefined') ? window.localStorage : null;
        const apiKey = (ls && (ls.getItem('READ_SERVICE_APIKEY') || ls.getItem('INTERNAL_API_KEY')))
            || process?.env?.READ_SERVICE_APIKEY || process?.env?.INTERNAL_API_KEY;
        if (apiKey) {
            headers['apikeyAuth'] = apiKey;
            headers['X-INTERNAL-API-KEY'] = apiKey;
        }
        const resp = await fetch(url, { method: 'GET', headers });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const rows = await resp.json();
        return Array.isArray(rows) ? rows : [];
    }

    /**
     * Overlay active tickets info onto tables: sets status/ticketId/ticketNumber
     */
    async tryOverlayActiveTickets(tables) {
        try {
            const useSql = process.env.REACT_APP_USE_SQL_READS === 'true';
            let tickets = [];
            if (useSql) {
                try { tickets = await this.fetchActiveTicketsSql(); } catch (_) { }
            }
            if (!tickets || tickets.length === 0) {
                try { tickets = await this.getActiveTickets(true); } catch (_) { }
            }
            if (!tickets || tickets.length === 0) return tables;

            const entityType = (process?.env?.SAMBAPOS_ENTITY_TYPE || 'Mesas');
            const stateToStatus = (t) => {
                try {
                    const states = t.states || t.CurrentTicketStates || [];
                    const statesArr = Array.isArray(states) ? states : [];
                    const hasBill = statesArr.some(s => {
                        const n = String(s.stateName || s.StateName || '').toUpperCase();
                        const v = String(s.state || s.State || '').toUpperCase();
                        return n.includes('BILL') || v.includes('BILL') || v.includes('CUENTA');
                    });
                    if (hasBill) return 'CUENTA';
                } catch (_) { }
                return 'OCUPADO';
            };

            const byTable = new Map();
            for (const t of tickets) {
                const ents = t.entities || t.Entities || [];
                for (const e of ents) {
                    const type = String(e.type || e.Type || e.EntityType || '').trim();
                    const name = String(e.name || e.Name || e.EntityName || '').trim();
                    if (!name) continue;
                    if (type && entityType && type !== entityType) continue;
                    byTable.set(name, {
                        ticketId: String(t.id || t.Id || t.TicketId || ''),
                        ticketNumber: String(t.number || t.Number || t.TicketNumber || ''),
                        status: stateToStatus(t)
                    });
                }
            }

            for (const table of tables) {
                const key = String(table.name || table.EntityName || '').trim();
                if (byTable.has(key)) {
                    const info = byTable.get(key);
                    table.ticketId = info.ticketId || table.ticketId || null;
                    table.ticketNumber = info.ticketNumber || table.ticketNumber || null;
                    const st = info.status || table.status || 'OCUPADO';
                    table.status = this.normalizeEntityStatus(st);
                    table.color = this.mapStatusToColor(table.status);
                }
            }

            return tables;
        } catch (e) {
            debug('⚠️ tryOverlayActiveTickets failed', e?.message || e);
            return tables;
        }
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
            case 'all':
                // Refresh all data types
                debug('🔄 Refreshing all data...');
                const results = {};
                results.menu = await menuService.getMenu(true);
                results.tables = await this.loadTables(true);
                results.tickets = await this.getActiveTickets(true);
                debug('✅ All data refreshed');
                return results;
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
        const tables = cacheService.getTables();
        debug('📦 getCachedTables called:', { tablesCount: tables?.length || 0, hasData: !!tables });
        return tables;
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
     * Start intelligent polling system as backup for SignalR
     * Only polls when SignalR is disconnected or inactive
     */
    startIntelligentPolling() {
        if (this._pollingInterval) return; // Already started

        debug('🔄 Starting intelligent polling backup system...');

        this._pollingInterval = setInterval(() => {
            if (!this.initialized) return;

            const now = Date.now();
            const timeSinceActivity = now - this._lastSignalRActivity;
            const signalRIsHealthy = this._signalRConnected && timeSinceActivity < 90000; // 90s threshold (increased from 60s)

            if (signalRIsHealthy) {
                // SignalR is working fine, no need to poll
                return;
            }

            // SignalR is down or inactive, do backup polling
            debug('📡 SignalR inactive, running backup data refresh...');

            // Refresh both tickets and tables with reduced frequency to prevent server saturation
            this.getActiveTickets(true).catch(err => {
                debug('⚠️ Backup polling failed:', err.message);
            });

            // Refresh tables every cycle (every 45s) to detect state changes like CUENTA
            this.loadTables(true).catch(err => {
                debug('⚠️ Backup table refresh failed:', err.message);
            });

        }, 45000); // Check every 45 seconds (increased from 30s to prevent server overload)
    }

    /**
     * Stop intelligent polling
     */
    stopIntelligentPolling() {
        if (this._pollingInterval) {
            debug('⏹️ Stopping intelligent polling...');
            clearInterval(this._pollingInterval);
            this._pollingInterval = null;
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        debug('🧹 Cleaning up DataManager...');

        // Stop intelligent polling
        this.stopIntelligentPolling();

        if (this.signalRConnection) {
            await this.signalRConnection.stop();
            this.signalRConnection = null;
        }

        this.initialized = false;
        this.loading = false;
        this.initPromise = null;
        this._signalRConnected = false;

        debug('✅ DataManager cleanup complete');
    }
}

// Export singleton instance
export default new DataManager();
export { DataManager };
