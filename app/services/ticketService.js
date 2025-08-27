import { appconfig } from '../config';
import { debugAuth } from '../utils/debug';
import { gql } from '@apollo/client';
import { client } from '../apollo';
import Debug from 'debug';
import { getAllOpenTickets, getTicketForMesa, loadTicketToTerminal, getCurrentTerminalId, createTerminalTicketAsync, changeEntityOfTerminalTicketAsync, closeTerminalTicket as closeTerminalTicketInline, registerTerminalAsync, addOrderToTerminalTicketAsync } from '../queries';
import cacheService from './cacheService';
import { orderService } from './orderService';

const debug = Debug('pmpos:ticket');

// GraphQL Mutations
const REGISTER_TERMINAL = gql`
    mutation RegisterTerminal($user: String!, $ticketType: String!, $terminal: String!, $department: String!) {
        registerTerminal(
            ticketType: $ticketType
            terminal: $terminal
            department: $department
            user: $user
        )
    }
`;

const CREATE_TERMINAL_TICKET = gql`
    mutation CreateTerminalTicket($terminalId: String!) {
        createTerminalTicket(terminalId: $terminalId) {
            uid
            totalAmount
        }
    }
`;

const GET_TERMINAL_TICKET = gql`
    query GetTerminalTicket($terminalId: String!) {
        getTerminalTicket(terminalId: $terminalId) {
            uid
            number
            totalAmount
            remainingAmount
            orders {
                uid
                productId
                quantity
                price
                portion
            }
        }
    }
`;

const CLOSE_TERMINAL_TICKET = gql`
    mutation CloseTerminalTicket($terminalId: String!) {
        closeTerminalTicket(terminalId: $terminalId)
    }
`;

export const createEmptyTicket = async (tableId) => {
    const mutation = `
        mutation CreateTicket($input: CreateTicketInput!) {
            createTicket(input: $input) {
                id
                type
                number
                date
                totalAmount
                remainingAmount
                tableId
                waiter
                entities {
                    type
                    name
                    customData
                }
            }
        }
    `;

    const variables = {
        input: {
            type: "TABLE",
            tableId: tableId,
            terminalId: "SERVIDOR"
        }
    };

    return await executeGQLMutation(mutation, variables);
};

export const ticketService = {
    /**
     * Flujo completo: crear ticket -> asignar entidad -> agregar orden -> cerrar ticket
     * Todos los pasos usan mutaciones inline y manejan auto-apertura/reintentos
     */
    async createAssignAddClose({ terminalId, tableName, order }) {
        const debugFlow = Debug('pmpos:ticket:flow');
        debugFlow('🚀 Starting createAssignAddClose flow', { terminalId, tableName, order });

        if (!terminalId) throw new Error('terminalId requerido');
        if (!tableName) throw new Error('tableName requerido');
        if (!order?.productName) throw new Error('order.productName requerido');

        // 1) Crear ticket de terminal (idempotente)
        const created = await createTerminalTicketAsync(terminalId);
        debugFlow('✅ Terminal ticket (created/existing):', created);

        // 2) Asignar entidad (mesa)
        const assigned = await changeEntityOfTerminalTicketAsync(terminalId, tableName);
        debugFlow('✅ Entity assigned:', assigned?.entities);

        // 3) Agregar orden
        const added = await addOrderToTerminalTicketAsync(terminalId, {
            productName: order.productName,
            portion: order.portion || 'Normal',
            quantity: order.quantity || 1
        });
        debugFlow('✅ Order added:', added);

        // 4) Cerrar ticket del terminal (idempotente)
        const closed = await closeTerminalTicketInline();
        debugFlow('✅ Terminal ticket closed:', closed);

        return { created, assigned, added, closed };
    },
    /**
     * Carga un ticket cerrado en el contexto del terminal, agrega órdenes y cierra
     */
    async modifyClosedTicket({ terminalId, ticketId, orders }) {
        const debugFlow = Debug('pmpos:ticket:closed-flow');
        debugFlow('🚀 Starting closed ticket modify flow', { terminalId, ticketId, ordersCount: orders?.length || 0 });

        if (!terminalId) throw new Error('terminalId requerido');
        if (!ticketId) throw new Error('ticketId requerido');

        // 1) Cargar ticket en el terminal
        const { loadTerminalTicketWithOrders } = await import('../queries');
        const loaded = await loadTerminalTicketWithOrders(terminalId, String(ticketId));
        debugFlow('✅ Ticket loaded into terminal session:', loaded?.id || ticketId);

        // 2) Agregar órdenes en secuencia
        if (orders && Array.isArray(orders)) {
            for (const ord of orders) {
                try {
                    const res = await addOrderToTerminalTicketAsync(terminalId, {
                        productName: ord.productName || ord.name,
                        portion: ord.portion || 'Normal',
                        quantity: ord.quantity || 1
                    });
                    debugFlow('✅ Order added:', { productName: ord.productName || ord.name, result: res });
                } catch (e) {
                    debugFlow('⚠️ Failed to add order, continuing with next', e?.message || e);
                }
            }
        }

        // 3) Cerrar el ticket del terminal (idempotente)
        const closed = await closeTerminalTicketInline();
        debugFlow('✅ Terminal ticket closed:', closed);

        return { loadedTicketId: loaded?.id || ticketId, closed };
    },
    async openTicket(tableName, user) {
        try {
            debug('📝 Opening ticket for table:', tableName);

            // HYBRID APPROACH: Check global tickets first
            const allTickets = await getAllOpenTickets();
            const existingTicket = getTicketForMesa(tableName, allTickets);

            if (existingTicket) {
                debug('✅ Found existing ticket in global tickets:', existingTicket);

                // Try to load ticket to current terminal session
                const terminalId = getCurrentTerminalId();
                if (terminalId) {
                    try {
                        const loadedTicket = await loadTicketToTerminal(existingTicket.id);
                        return {
                            success: true,
                            ticket: loadedTicket,
                            url: this.getTicketUrl(loadedTicket.uid, tableName),
                            isExternal: true
                        };
                    } catch (loadError) {
                        debug('⚠️ Could not load to terminal, using direct access:', loadError);
                        // Fallback: use ticket directly
                        return {
                            success: true,
                            ticket: existingTicket,
                            url: this.getTicketUrl(existingTicket.id, tableName),
                            isExternal: true
                        };
                    }
                } else {
                    // No terminal session, use ticket directly
                    return {
                        success: true,
                        ticket: existingTicket,
                        url: this.getTicketUrl(existingTicket.id, tableName),
                        isExternal: true
                    };
                }
            }

            // Fallback: check using legacy method
            const legacyTicket = await this.getTicketByTable(tableName);
            if (legacyTicket?.ticket) {
                return {
                    success: true,
                    ticket: legacyTicket.ticket,
                    url: this.getTicketUrl(legacyTicket.ticket.id, tableName)
                };
            }

            // Register terminal using inline helper (env-driven payload + retries)
            const terminalId = await registerTerminalAsync(user.name);
            debug('✅ Terminal registered:', terminalId);

            // Create terminal ticket (no table association)
            const ticket = await createTerminalTicketAsync(terminalId);
            debug('✅ Terminal ticket created:', ticket.uid);

            // Close terminal session
            await closeTerminalTicketInline();

            return {
                success: true,
                ticket,
                url: this.getTicketUrl(ticket.uid, tableName)
            };
        } catch (error) {
            debug('❌ Error creating ticket:', error);
            throw error;
        }
    },

    async createTicket({ terminalId, tableId, userId }) {
        debug('🎫 Creating ticket:', { terminalId, tableId, userId });

        try {
            const ticket = await createTerminalTicketAsync(terminalId);
            debug('✅ Terminal ticket created:', ticket);
            return {
                success: true,
                ticket
            };
        } catch (error) {
            debug('❌ Error creating ticket:', error);
            throw new Error('No se pudo crear el ticket');
        }
    },

    /**
     * Promote a single local-only ticket to server: create terminal ticket and replay orders
     */
    async promoteLocalTicket(localTicket, terminalId) {
        debug('🔁 Promoting local ticket to server:', localTicket.uid, 'terminal:', terminalId);

        if (!terminalId) {
            throw new Error('TerminalId requerido para promocionar ticket');
        }

        try {
            // 1) Create ticket on server
            const { data } = await client.mutate({
                mutation: CREATE_TERMINAL_TICKET,
                variables: { terminalId }
            });

            const serverTicket = data.createTerminalTicket;
            debug('✅ Server ticket created for promotion:', serverTicket.uid || serverTicket.id);

            // 2) Replay orders sequentially
            const orders = localTicket.orders || [];
            for (const order of orders) {
                try {
                    await orderService.addOrder(
                        terminalId,
                        order.name,
                        order.quantity,
                        order.portion
                    );
                    debug('✅ Replayed order:', order.name);
                } catch (orderErr) {
                    debug('⚠️ Failed to replay order, will continue with others:', orderErr);
                    // Continue with other orders; consider logging for later reconciliation
                }
            }

            // 3) Associate ticket with table if present
            if (localTicket.tableId) {
                try {
                    await changeEntityOfTerminalTicketAsync(terminalId, localTicket.tableId);
                    debug('✅ Assigned table to promoted ticket:', localTicket.tableId);
                } catch (assignErr) {
                    debug('⚠️ Failed to assign table to promoted ticket:', assignErr);
                }
            }

            // 4) Remove pending local ticket from cache
            try {
                cacheService.removePendingTicket(localTicket.uid);
            } catch (e) {
                debug('⚠️ Failed to remove pending ticket from cache after promotion:', e);
            }

            return {
                success: true,
                serverTicket
            };
        } catch (error) {
            debug('❌ Promotion failed:', error);
            return {
                success: false,
                error
            };
        }
    },

    /**
     * Promote all pending tickets for current user (caller should ensure terminalId available)
     */
    async promotePendingTicketsForUser(userName, terminalId) {
        debug('🔁 Promoting pending tickets for user:', userName, 'terminal:', terminalId);
        if (!terminalId) return { promoted: 0 };

        const pending = cacheService.getPendingTickets() || [];
        const userPending = pending.filter(t => t.owner === userName);

        let promotedCount = 0;
        for (const t of userPending) {
            const res = await this.promoteLocalTicket(t, terminalId);
            if (res.success) promotedCount += 1;
        }

        debug(`🔁 Promotion completed: ${promotedCount}/${userPending.length}`);
        return { promoted: promotedCount, total: userPending.length };
    },

    async getTerminalTicket(terminalId) {
        debug('🔍 Getting terminal ticket:', terminalId);

        try {
            const { data } = await client.query({
                query: GET_TERMINAL_TICKET,
                variables: { terminalId },
                fetchPolicy: 'network-only'
            });

            debug('✅ Terminal ticket retrieved:', data.getTerminalTicket);
            return {
                success: true,
                ticket: data.getTerminalTicket
            };
        } catch (error) {
            debug('❌ Error getting terminal ticket:', error);
            return {
                success: false,
                ticket: null,
                error: error.message
            };
        }
    },

    getTicketUrl(ticketId, tableName) {
        const baseUrl = window.location.hostname;
        const port = appconfig().port || '9000';
        return `http://${baseUrl}:${port}/ticket/${ticketId || 'new'}?table=${tableName}`;
    },

    async getTicketByTable(tableId) {
        debug('🔍 Getting ticket for table (hybrid method):', tableId);

        try {
            // HYBRID APPROACH: Try global tickets first
            const allTickets = await getAllOpenTickets();
            const ticketFromGlobal = getTicketForMesa(tableId, allTickets);

            if (ticketFromGlobal) {
                debug('✅ Found ticket in global tickets:', ticketFromGlobal);
                return {
                    success: true,
                    ticket: ticketFromGlobal,
                    source: 'global'
                };
            }

            // Fallback to legacy GraphQL query
            debug('🔄 Falling back to legacy getTicketByTable query...');
            const GET_TICKET_BY_TABLE = gql`
                query GetTicketByTable($tableId: String!) {
                    ticket: getTicketByTable(tableId: $tableId) {
                        id
                        type
                        number
                        date
                        totalAmount
                        remainingAmount
                        tableId
                        waiter
                        orders {
                            uid
                            productId
                            name
                            caption
                            menuItemName
                            quantity
                            price
                            portion
                            orderTags
                            comments
                        }
                        entities {
                            type
                            name
                            customData
                        }
                    }
                }
            `;

            const { data } = await client.query({
                query: GET_TICKET_BY_TABLE,
                variables: { tableId },
                fetchPolicy: 'network-only' // Always get fresh data
            });

            debug('✅ Ticket data retrieved via legacy method:', data.ticket);
            return {
                success: true,
                ticket: data.ticket,
                source: 'legacy'
            };
        } catch (error) {
            debug('❌ Error getting ticket:', error);
            return {
                success: false,
                ticket: null,
                error: error.message
            };
        }
    },

    /**
     * Checks if a ticket belongs to current user's terminal session
     */
    isOwnTicket(ticket) {
        const currentTerminalId = getCurrentTerminalId();
        return ticket.terminalId === currentTerminalId;
    },

    /**
     * Determines the best approach for operating on a ticket
     */
    getOperationMode(ticket) {
        if (this.isOwnTicket(ticket)) {
            return 'terminal'; // Use Terminal API
        } else {
            return 'direct';   // Use Direct API or load to terminal first
        }
    }
};

// Auto-register promotion handler when terminal becomes available
import terminalService from './terminalService';

try {
    terminalService.onRegistered(async (userName, terminalId) => {
        try {
            const res = await ticketService.promotePendingTicketsForUser(userName, terminalId);
            debug('🔁 Auto-promotion result:', res);
        } catch (e) {
            debug('❌ Auto-promotion failed:', e);
        }
    });
} catch (e) {
    debug('⚠️ Could not attach auto-promotion handler:', e);
}
