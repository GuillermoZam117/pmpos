import { appconfig } from '../config';
import { debugAuth } from '../utils/debug';
import { getTicketByTable } from '../queries';
import { gql } from '@apollo/client';
import { client } from '../apollo';
import Debug from 'debug';

const debug = Debug('pmpos:ticket');

// GraphQL Mutations
const REGISTER_TERMINAL = gql`
    mutation RegisterTerminal($user: String!) {
        registerTerminal(
            ticketType: "Ticket"
            terminal: "WebClient"
            department: "Restaurant"
            user: $user
        )
    }
`;

const CREATE_TICKET = gql`
    mutation CreateTicket($terminalId: String!, $tableId: String!) {
        createTerminalTicket(
            terminalId: $terminalId,
            table: $tableId
        ) {
            id
            type
            tableId
            status
            totalAmount
        }
    }
`;

const CLOSE_TERMINAL_TICKET = gql`
    mutation CloseTerminalTicket($terminalId: String!) {
        closeTerminalTicket(terminalId: $terminalId)
    }
`;

export const ticketService = {
    async openTicket(tableName, user) {
        try {
            debug('📝 Opening ticket for table:', tableName);

            // First check for existing ticket
            const existingTicket = await getTicketByTable(tableName);
            if (existingTicket?.data?.ticket) {
                return {
                    success: true,
                    ticket: existingTicket.data.ticket,
                    url: this.getTicketUrl(existingTicket.data.ticket.id, tableName)
                };
            }

            // Register terminal
            const { data: registerData } = await client.mutate({
                mutation: REGISTER_TERMINAL,
                variables: { user: user.name }
            });

            const terminalId = registerData.registerTerminal;
            debug('✅ Terminal registered:', terminalId);

            // Create ticket
            const { data: ticketData } = await client.mutate({
                mutation: CREATE_TICKET,
                variables: { 
                    terminalId,
                    tableId: tableName
                }
            });

            const ticket = ticketData.createTerminalTicket;
            debug('✅ Ticket created:', ticket.id);

            // Close terminal session
            await client.mutate({
                mutation: CLOSE_TERMINAL_TICKET,
                variables: { terminalId }
            });

            return {
                success: true,
                ticket,
                url: this.getTicketUrl(ticket.id, tableName)
            };
        } catch (error) {
            debug('❌ Error creating ticket:', error);
            throw error;
        }
    },

    async createTicket({ terminalId, tableId, userId }) {
        debug('🎫 Creating ticket:', { terminalId, tableId, userId });
        
        try {
            const { data } = await client.mutate({
                mutation: CREATE_TICKET,
                variables: { 
                    terminalId,
                    tableId 
                }
            });

            debug('✅ Ticket created:', data.createTerminalTicket);
            return {
                success: true,
                ticket: data.createTerminalTicket
            };
        } catch (error) {
            debug('❌ Error creating ticket:', error);
            throw new Error('No se pudo crear el ticket');
        }
    },

    getTicketUrl(ticketId, tableName) {
        const baseUrl = window.location.hostname;
        const port = appconfig().port || '9000';
        return `http://${baseUrl}:${port}/ticket/${ticketId || 'new'}?table=${tableName}`;
    }
};