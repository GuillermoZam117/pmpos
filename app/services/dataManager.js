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
            // Step 1: Load Menu (Global Cache - Level 1)
            debug('📋 Step 1: Loading menu...');
            const menuStartTime = performance.now();

            const menu = await menuService.getMenu(false); // Use cache if available

            const menuLoadTime = performance.now() - menuStartTime;
            debug(`✅ Menu loaded in ${menuLoadTime.toFixed(2)}ms - ${menu?.categories?.length || 0} categories`);

            // Step 2: Load Tables (Semi-static Cache - Level 2)
            debug('🏠 Step 2: Loading tables...');
            const tablesStartTime = performance.now();

            // Prefer SQL read-service when enabled
            const useSql = process.env.REACT_APP_USE_SQL_READS === 'true';
            let tables;
            if (useSql) {
                try {
                    const { fetchTables } = await import('../queries');
                    tables = await fetchTables();
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
                    const { fetchTables } = await import('../queries');
                    const tables = await fetchTables();
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
                    
                    // Cache tables with TTL (30 seconds)
                    debug('💾 Saving tables to cache:', { count: processedTables.length, sample: processedTables[0] });
                    cacheService.setTables(processedTables, 30 * 1000);
                    
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

            // Cache tables with TTL (30 seconds)
            debug('💾 Saving tables to cache:', { count: processedTables.length, sample: processedTables[0] });
            cacheService.setTables(processedTables, 30 * 1000);
            
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
            
            // Emit event for components to update
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('dataManagerRefresh', { 
                    detail: { type: 'tickets', count: tickets.length } 
                }));
            }

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
        
        // Debounce bursts of table events to avoid thrashing
        if (this._tableEventTimer) clearTimeout(this._tableEventTimer);
        this._tableEventTimer = setTimeout(() => {
            // Invalidate tables cache to force refresh
            cacheService.clearTables();
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('tableStatusChanged', { detail: tableData }));
            }
        }, 150);
    }

    /**
     * Handle real-time ticket updates
     */
    handleTicketUpdate(ticketData) {
        // Mark SignalR activity
        this._lastSignalRActivity = Date.now();
        this._signalRConnected = true;
        
        // Debounce bursts of ticket events to avoid thrashing
        if (this._ticketEventTimer) clearTimeout(this._ticketEventTimer);
        this._ticketEventTimer = setTimeout(() => {
            cacheService.clearActiveTickets();
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('ticketUpdated', { detail: ticketData }));
            }
        }, 120);
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
     * Handle ENTITIES_REFRESH events from SignalR
     * This populates the cache with fresh table data instead of just clearing it
     */
    handleEntitiesRefresh(entityData) {
        // Mark SignalR activity
        this._lastSignalRActivity = Date.now();
        this._signalRConnected = true;
        
        debug('📡 Processing ENTITIES_REFRESH with data:', entityData);
        
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
            if (Array.isArray(entityData) && entityData.length > 0) {
                // Transform SambaPOS entities to our table format
                const tables = entityData.map(entity => {
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
            const signalRIsHealthy = this._signalRConnected && timeSinceActivity < 30000; // 30s threshold
            
            if (signalRIsHealthy) {
                // SignalR is working fine, no need to poll
                return;
            }
            
            // SignalR is down or inactive, do backup polling
            debug('📡 SignalR inactive, running backup data refresh...');
            
            // Refresh both tickets and tables more frequently since SignalR state changes aren't working
            this.getActiveTickets(true).catch(err => {
                debug('⚠️ Backup polling failed:', err.message);
            });
            
            // Refresh tables every cycle (every 15s) to detect state changes like CUENTA
            this.loadTables(true).catch(err => {
                debug('⚠️ Backup table refresh failed:', err.message);
            });
            
        }, 15000); // Check every 15 seconds (more responsive for state changes)
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
