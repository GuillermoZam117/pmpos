import { gql, gqlEscape, graphqlRequest, graphqlSimple } from './graphqlService';
import Debug from 'debug';

const debug = Debug('pmpos:ticket');

/**
 * Ticket Service usando el método simple de smoke tests
 * SIN Apollo Client - usa las funciones de queries.js que ya funcionan
 */
export const ticketService = {
    /**
     * Registra un terminal (usa la función de queries.js que ya funciona)
     */
    async registerTerminal(name, location = '', department = 'MESAS', ticketType = 'COMEDOR', user = 'graphiql') {
        debug('🖥️ Registering terminal (delegating to queries.js)');

        // Use the working function from queries.js
        const { registerTerminalAsync } = await import('../queries');
        return await registerTerminalAsync(name, location, department, ticketType, user);
    },

    /**
     * Crea un ticket de terminal (usa la función de queries.js que ya funciona)
     */
    async createTerminalTicket(terminalId) {
        debug('🎫 Creating terminal ticket (delegating to queries.js)');

        // Use the working function from queries.js
        const { createTerminalTicketAsync } = await import('../queries');
        return await createTerminalTicketAsync(terminalId);
    },

    /**
     * Obtiene el ticket actual del terminal
     */
    async getTerminalTicket(terminalId) {
        debug('📋 Getting terminal ticket (simple method):', terminalId);

        if (!terminalId) {
            throw new Error('Terminal ID is required');
        }

        try {
            const { GET_TERMINAL_TICKET } = await import('../graphql/queries');
            const data = await graphqlRequest(GET_TERMINAL_TICKET, { terminalId });
            const ticket = data?.getTerminalTicket;

            debug('✅ Terminal ticket retrieved:', ticket ? `ID: ${ticket.id}` : 'No ticket');
            return ticket;
        } catch (error) {
            debug('❌ Failed to get terminal ticket:', error.message);
            throw new Error(`Error al obtener ticket: ${error.message}`);
        }
    },

    /**
     * Carga un ticket específico en el terminal
     */
    async loadTerminalTicket(terminalId, ticketId) {
        debug('📥 Loading ticket to terminal (simple method):', { terminalId, ticketId });

        if (!terminalId || !ticketId) {
            throw new Error('Terminal ID and ticket ID are required');
        }

        try {
            const { LOAD_TERMINAL_TICKET } = await import('../graphql/queries');
            const safeTicketId = ticketId != null ? String(ticketId) : '';
            const safeTerminalId = terminalId != null ? String(terminalId) : '';
            const data = await graphqlRequest(LOAD_TERMINAL_TICKET, {
                terminalId: safeTerminalId,
                ticketId: safeTicketId
            });
            const ticket = data?.loadTerminalTicket;

            if (ticket) {
                debug('✅ Ticket loaded successfully:', `ID: ${ticket.id}`);
                return ticket;
            }

            throw new Error('Empty response from loadTerminalTicket');
        } catch (error) {
            debug('❌ Failed to load ticket:', error.message);
            throw new Error(`Error al cargar ticket: ${error.message}`);
        }
    },

    /**
     * Cambia la entidad del ticket del terminal
     * @param {string} terminalId - ID del terminal
     * @param {string} entityName - Nombre de la entidad (número de mesa, etc.)
     * @param {string} entityType - Tipo de entidad (por defecto "Mesas")
     */
    async changeEntityOfTerminalTicket(terminalId, entityName, entityType = "Mesas") {
        debug('🔄 Changing terminal ticket entity:', { terminalId, entityName, entityType });

        if (!terminalId || !entityName) {
            throw new Error('Terminal ID and entity name are required');
        }

        try {
            const { CHANGE_ENTITY_OF_TERMINAL_TICKET } = await import('../graphql/queries');
            const result = await graphqlRequest(CHANGE_ENTITY_OF_TERMINAL_TICKET, {
                terminalId,
                type: entityType,
                name: String(entityName)
            });

            if (result?.changeEntityOfTerminalTicket) {
                debug('✅ Entity changed successfully:', result.changeEntityOfTerminalTicket);
                return result.changeEntityOfTerminalTicket;
            } else {
                throw new Error('No response from changeEntityOfTerminalTicket');
            }
        } catch (error) {
            debug('❌ Failed to change entity:', error.message);
            throw new Error(`Error al cambiar entidad: ${error.message}`);
        }
    },    /**
     * Obtiene detalles de un ticket específico
     */
    async fetchTicketDetails(ticketId) {
        debug('🎫 Fetching ticket details:', ticketId);

        if (!ticketId) {
            throw new Error('Ticket ID is required');
        }

        try {
            const { TICKET_DETAILS } = await import('../graphql/queries');
            const result = await graphqlRequest(TICKET_DETAILS, { ticketId: String(ticketId) });

            if (result?.ticket) {
                debug('✅ Ticket details retrieved:', `ID: ${result.ticket.id}`);
                return result.ticket;
            } else {
                throw new Error('Ticket not found');
            }
        } catch (error) {
            debug('❌ Failed to fetch ticket details:', error.message);
            throw new Error(`Error al obtener detalles del ticket: ${error.message}`);
        }
    },

    /**
     * Obtiene tickets por mesa
     */
    async getTableTickets(tableId) {
        debug('🏠 Getting table tickets:', tableId);

        if (!tableId) {
            throw new Error('Table ID is required');
        }

        try {
            const query = `query { 
                tickets(entityName: "${gqlEscape(String(tableId))}") {
                    id
                    number
                    date
                    totalAmount
                    remainingAmount
                    entityName
                    orders {
                        uid
                        name
                        quantity
                        price
                    }
                }
            }`;

            const result = await graphqlSimple(query);

            const tickets = result?.tickets || [];
            debug('✅ Table tickets retrieved:', `${tickets.length} tickets`);
            return tickets;
        } catch (error) {
            debug('❌ Failed to get table tickets:', error.message);
            return []; // Return empty array on error to prevent breaks
        }
    },

    /**
     * Carga un ticket con sus órdenes en el terminal (equivalente a loadTerminalTicketWithOrders)
     */
    async loadTerminalTicketWithOrders(terminalId, ticketId) {
        debug('📥 Loading ticket with orders to terminal:', { terminalId, ticketId });

        if (!terminalId || !ticketId) {
            throw new Error('Terminal ID and ticket ID are required');
        }

        try {
            const query = `mutation { 
                loadTerminalTicket(
                    terminalId: "${gqlEscape(terminalId)}", 
                    ticketId: "${gqlEscape(String(ticketId))}"
                ) { 
                    id 
                    uid 
                    number 
                    totalAmount 
                    remainingAmount 
                    orders { 
                        uid 
                        name 
                        quantity 
                        price 
                        portion 
                        orderTags 
                    } 
                } 
            }`;

            const result = await graphqlSimple(query);

            if (result?.loadTerminalTicket) {
                debug('✅ Ticket with orders loaded successfully:', `ID: ${result.loadTerminalTicket.id}`);
                return result.loadTerminalTicket;
            } else {
                throw new Error('No response from loadTerminalTicket');
            }
        } catch (error) {
            debug('❌ Failed to load ticket with orders:', error.message);
            throw new Error(`Error al cargar ticket con órdenes: ${error.message}`);
        }
    },

    /**
     * Crea un ticket de terminal vacío
     */
    async createTerminalTicket(terminalId) {
        debug('➕ Creating terminal ticket:', terminalId);

        if (!terminalId) {
            throw new Error('Terminal ID is required');
        }

        try {
            const query = `mutation { 
                createTerminalTicket(terminalId: "${gqlEscape(terminalId)}") {
                    id
                    uid
                    number
                    totalAmount
                    remainingAmount
                }
            }`;

            const result = await graphqlSimple(query);

            if (result?.createTerminalTicket) {
                debug('✅ Terminal ticket created:', `ID: ${result.createTerminalTicket.id}`);
                return result.createTerminalTicket;
            } else {
                throw new Error('No response from createTerminalTicket');
            }
        } catch (error) {
            debug('❌ Failed to create terminal ticket:', error.message);
            throw new Error(`Error al crear ticket: ${error.message}`);
        }
    },

    /**
     * Obtiene el ticket activo del terminal (equivalente a getTerminalTicketInline)
     */
    async getTerminalTicket(terminalId) {
        debug('🎫 Getting terminal ticket:', terminalId);

        if (!terminalId) {
            throw new Error('Terminal ID is required');
        }

        try {
            const query = `query { 
                getTerminalTicket(terminalId: "${gqlEscape(terminalId)}") {
                    id
                    uid
                    number
                    totalAmount
                    remainingAmount
                    orders {
                        uid
                        name
                        quantity
                        price
                        portion
                        orderTags
                        orderStates
                    }
                }
            }`;

            const result = await graphqlSimple(query);

            const ticket = result?.getTerminalTicket;
            debug(ticket ? '✅ Terminal ticket retrieved' : '⚠️ No terminal ticket found', ticket ? `ID: ${ticket.id}` : '');
            return ticket;
        } catch (error) {
            debug('❌ Failed to get terminal ticket:', error.message);
            return null; // Return null instead of throwing to allow fallbacks
        }
    },

    /**
     * Test connection to GraphQL server
     */
    async testConnection() {
        debug('🔌 Testing GraphQL connection');

        try {
            const query = `query { 
                __type(name: "Query") {
                    name
                }
            }`;

            await graphqlSimple(query);
            debug('✅ Connection test successful');
            return true;
        } catch (error) {
            debug('❌ Connection test failed:', error.message);
            return false;
        }
    }
};
