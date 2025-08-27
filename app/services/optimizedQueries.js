/**
 * Optimized GraphQL Queries for PMPOS
 * Efficient queries for the new data loading strategy
 */
import { appconfig } from '../config';
import { tokenService } from './tokenService';
import Debug from 'debug';

const debug = Debug('pmpos:queries-optimized');

class OptimizedQueries {
    constructor() {
        this.baseHeaders = {
            'Content-Type': 'application/json'
        };
    }

    /**
     * Execute GraphQL query with error handling
     */
    async executeQuery(query, variables = {}, timeout = 30000) {
        try {
            const token = await tokenService.getValidAccessToken();
            const config = appconfig();

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(config.GQLurl, {
                method: 'POST',
                headers: {
                    ...this.baseHeaders,
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ query, variables }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.errors && data.errors.length > 0) {
                throw new Error(`GraphQL Error: ${data.errors.map(e => e.message).join(', ')}`);
            }

            return data.data;

        } catch (error) {
            debug('❌ Query execution failed:', error);
            throw error;
        }
    }

    // ===========================================
    // INITIALIZATION QUERIES
    // ===========================================

    /**
     * Get complete menu with all required data for POS operations
     */
    async getCompleteMenu(menuName = 'MENU') {
        debug('📋 Executing complete menu query...');
        
        const query = `
            query GetCompleteMenu($menuName: String!) {
                menu: getMenu(name: $menuName) {
                    id
                    name
                    caption
                    categories {
                        id
                        name
                        caption
                        color
                        foreground
                        sortOrder
                        image
                        menuItems {
                            id
                            name
                            caption
                            productId
                            sortOrder
                            color
                            foreground
                            image
                            description
                            product {
                                id
                                name
                                caption
                                description
                                portions {
                                    id
                                    name
                                    price
                                    isDefault
                                    sortOrder
                                }
                            }
                            portions {
                                id
                                name
                                price
                                isDefault
                                sortOrder
                            }
                            defaultOrderTags {
                                id
                                name
                                value
                                price
                                color
                                sortOrder
                            }
                            tags {
                                id
                                name
                                value
                                color
                            }
                        }
                    }
                }
            }
        `;

        try {
            const result = await this.executeQuery(query, { menuName });
            debug(`✅ Complete menu loaded: ${result.menu?.categories?.length || 0} categories`);
            return result.menu;
        } catch (error) {
            debug('❌ Complete menu query failed, trying fallback...');
            return await this.getSimpleMenu(menuName);
        }
    }

    /**
     * Fallback simple menu query
     */
    async getSimpleMenu(menuName = 'MENU') {
        debug('📋 Executing simple menu query...');
        
        const query = `
            query GetSimpleMenu($menuName: String!) {
                menu: getMenu(name: $menuName) {
                    categories {
                        name
                        caption
                        color
                        menuItems {
                            name
                            caption
                            productId
                            product {
                                id
                                name
                                portions {
                                    name
                                    price
                                }
                            }
                        }
                    }
                }
            }
        `;

        const result = await this.executeQuery(query, { menuName });
        debug(`✅ Simple menu loaded: ${result.menu?.categories?.length || 0} categories`);
        return result.menu;
    }

    /**
     * Get all tables with current status
     */
    async getAllTables(screenName = 'MESAS') {
        debug('🏠 Executing tables query...');
        
        const query = `
            query GetAllTables($screenName: String!) {
                entities: getEntityScreenItems(name: $screenName) {
                    id
                    name
                    caption
                    color
                    labelColor
                    state
                    customData
                    x
                    y
                    width
                    height
                }
            }
        `;

        const result = await this.executeQuery(query, { screenName });
        debug(`✅ Tables loaded: ${result.entities?.length || 0} tables`);
        return result.entities || [];
    }

    // ===========================================
    // REAL-TIME DATA QUERIES
    // ===========================================

    /**
     * Get all active (unpaid) tickets from all users
     */
    async getAllActiveTickets() {
        debug('🎫 Executing active tickets query...');
        
        const query = `
            query GetAllActiveTickets {
                tickets: getTickets(isClosed: false) {
                    id
                    uid
                    number
                    date
                    lastOrderDate
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
                        stateValue
                    }
                    orders {
                        id
                        name
                        quantity
                        price
                        productId
                    }
                    user {
                        name
                    }
                    terminal {
                        name
                    }
                }
            }
        `;

        try {
            const result = await this.executeQuery(query);
            debug(`✅ Active tickets loaded: ${result.tickets?.length || 0} tickets`);
            return result.tickets || [];
        } catch (error) {
            debug('⚠️ Active tickets query not supported, returning empty array');
            return [];
        }
    }

    /**
     * Get active tickets for specific table
     */
    async getActiveTicketsForTable(tableName) {
        debug('🎫 Executing table tickets query...', { tableName });
        
        const query = `
            query GetTableTickets($tableName: String!) {
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
                    states {
                        stateName
                        state
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

        try {
            const result = await this.executeQuery(query, { tableName });
            
            // Filter tickets by table name
            const tableTickets = result.tickets?.filter(ticket =>
                ticket.entities?.some(entity => 
                    entity.type === 'Mesas' && entity.name === tableName
                )
            ) || [];
            
            debug(`✅ Table tickets loaded: ${tableTickets.length} tickets for ${tableName}`);
            return tableTickets;
        } catch (error) {
            debug('⚠️ Table tickets query failed, returning empty array');
            return [];
        }
    }

    // ===========================================
    // DETAILED DATA QUERIES
    // ===========================================

    /**
     * Get complete ticket details with all orders
     */
    async getTicketDetails(ticketId) {
        debug('🔍 Executing ticket details query...', { ticketId });
        
        const query = `
            query GetTicketDetails($ticketId: String!) {
                ticket(id: $ticketId) {
                    id
                    uid
                    number
                    type
                    date
                    lastOrderDate
                    totalAmount
                    remainingAmount
                    entities {
                        name
                        type
                        customData
                    }
                    states {
                        stateName
                        state
                        stateValue
                        quantity
                        stateName
                    }
                    tags {
                        tagName
                        tag
                        quantity
                        userId
                    }
                    orders {
                        id
                        uid
                        productId
                        name
                        caption
                        quantity
                        portion
                        price
                        priceTag
                        calculatePrice
                        increaseInventory
                        decreaseInventory
                        locked
                        orderTags
                        tags {
                            tag
                            tagName
                            price
                            quantity
                            rate
                            userId
                        }
                        states {
                            stateName
                            state
                            stateValue
                            quantity
                        }
                        product {
                            id
                            name
                            portions {
                                id
                                name
                                price
                            }
                        }
                    }
                    payments {
                        id
                        name
                        amount
                        date
                        paymentType
                    }
                    user {
                        name
                    }
                    terminal {
                        name
                    }
                }
            }
        `;

        const result = await this.executeQuery(query, { ticketId });
        debug(`✅ Ticket details loaded: ${result.ticket?.number || 'Unknown'}`);
        return result.ticket;
    }

    // ===========================================
    // DIAGNOSTIC QUERIES
    // ===========================================

    /**
     * Get system information for diagnostics
     */
    async getSystemInfo() {
        debug('🔧 Executing system info query...');
        
        const query = `
            query GetSystemInfo {
                terminals: getTerminals {
                    name
                    id
                }
                departments: getDepartments {
                    name
                    id
                }
                ticketTypes: getTicketTypes {
                    name
                    id
                }
                users: getUsers {
                    name
                    id
                }
                paymentTypes: getPaymentTypes {
                    name
                    id
                }
            }
        `;

        try {
            const result = await this.executeQuery(query);
            debug('✅ System info loaded successfully');
            return result;
        } catch (error) {
            debug('⚠️ System info query failed (some features may not be available)');
            return {
                terminals: [],
                departments: [],
                ticketTypes: [],
                users: [],
                paymentTypes: []
            };
        }
    }

    /**
     * Check GraphQL endpoint health
     */
    async healthCheck() {
        debug('🏥 Executing health check...');
        
        const query = `
            query HealthCheck {
                __schema {
                    queryType {
                        name
                    }
                }
            }
        `;

        try {
            await this.executeQuery(query);
            debug('✅ GraphQL endpoint is healthy');
            return { status: 'healthy', timestamp: Date.now() };
        } catch (error) {
            debug('❌ GraphQL endpoint health check failed:', error);
            return { 
                status: 'unhealthy', 
                error: error.message, 
                timestamp: Date.now() 
            };
        }
    }

    // ===========================================
    // BATCH QUERIES
    // ===========================================

    /**
     * Execute multiple queries in parallel
     */
    async batchQueries(queries) {
        debug(`🔄 Executing ${queries.length} queries in parallel...`);
        
        const startTime = performance.now();
        
        try {
            const results = await Promise.allSettled(
                queries.map(({ name, query, variables }) =>
                    this.executeQuery(query, variables).then(data => ({ name, data }))
                )
            );

            const successful = results
                .filter(r => r.status === 'fulfilled')
                .map(r => r.value);

            const failed = results
                .filter(r => r.status === 'rejected')
                .map((r, i) => ({ name: queries[i].name, error: r.reason }));

            const duration = performance.now() - startTime;

            debug(`✅ Batch queries completed in ${duration.toFixed(2)}ms - ${successful.length} successful, ${failed.length} failed`);

            if (failed.length > 0) {
                debug('❌ Failed queries:', failed);
            }

            return {
                successful,
                failed,
                duration,
                total: queries.length
            };

        } catch (error) {
            debug('❌ Batch queries failed:', error);
            throw error;
        }
    }

    /**
     * Initialize app data with parallel queries
     */
    async initializeAppData(menuName = 'MENU', screenName = 'MESAS') {
        debug('🚀 Initializing app data with parallel queries...');
        
        const queries = [
            {
                name: 'menu',
                query: this.getCompleteMenuQuery(),
                variables: { menuName }
            },
            {
                name: 'tables',
                query: this.getTablesQuery(),
                variables: { screenName }
            },
            {
                name: 'activeTickets',
                query: this.getActiveTicketsQuery(),
                variables: {}
            }
        ];

        const result = await this.batchQueries(queries);
        
        // Process successful results
        const data = {};
        result.successful.forEach(({ name, data: queryData }) => {
            switch (name) {
                case 'menu':
                    data.menu = queryData.menu;
                    break;
                case 'tables':
                    data.tables = queryData.entities;
                    break;
                case 'activeTickets':
                    data.activeTickets = queryData.tickets;
                    break;
            }
        });

        debug(`✅ App data initialized: menu=${!!data.menu}, tables=${data.tables?.length || 0}, tickets=${data.activeTickets?.length || 0}`);
        
        return {
            ...data,
            loadTime: result.duration,
            errors: result.failed
        };
    }

    // Helper methods for batch queries
    getCompleteMenuQuery() {
        return `
            query GetCompleteMenu($menuName: String!) {
                menu: getMenu(name: $menuName) {
                    categories {
                        name
                        caption
                        color
                        menuItems {
                            name
                            caption
                            productId
                            product {
                                id
                                name
                                portions {
                                    name
                                    price
                                }
                            }
                            defaultOrderTags {
                                id
                                name
                                value
                                price
                            }
                        }
                    }
                }
            }
        `;
    }

    getTablesQuery() {
        return `
            query GetTables($screenName: String!) {
                entities: getEntityScreenItems(name: $screenName) {
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
    }

    getActiveTicketsQuery() {
        return `
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
                    user {
                        name
                    }
                }
            }
        `;
    }
}

// Export singleton instance
export default new OptimizedQueries();
export { OptimizedQueries };