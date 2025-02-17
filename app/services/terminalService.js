import { gql } from '@apollo/client';
import { client } from '../apollo';
import Debug from 'debug';

const debug = Debug('pmpos:terminal');

const REGISTER_TERMINAL = gql`
  mutation RegisterTerminal($ticketType: String!, $terminal: String!, $department: String!, $user: String!) {
    registerTerminal(
      ticketType: $ticketType
      terminal: $terminal
      department: $department
      user: $user
    )
  }
`;

const CREATE_TICKET = gql`
  mutation CreateTerminalTicket($terminalId: String!) {
    createTerminalTicket(terminalId: $terminalId) {
      uid
    }
  }
`;

export const terminalService = {
    async register(user) {
        debug('📱 Registering terminal for user:', user.name);
        try {
            const { data } = await client.mutate({
                mutation: REGISTER_TERMINAL,
                variables: {
                    ticketType: "Ticket",
                    terminal: "WebClient",
                    department: "Restaurant",
                    user: user.name
                }
            });
            debug('✅ Terminal registered:', data.registerTerminal);
            return data.registerTerminal;
        } catch (error) {
            debug('❌ Terminal registration failed:', error);
            throw error;
        }
    },

    async createTicket(terminalId) {
        debug('🎫 Creating ticket with terminal:', terminalId);
        try {
            const { data } = await client.mutate({
                mutation: CREATE_TICKET,
                variables: { terminalId }
            });
            debug('✅ Ticket created:', data.createTerminalTicket);
            return data.createTerminalTicket;
        } catch (error) {
            debug('❌ Ticket creation failed:', error);
            throw error;
        }
    }
};