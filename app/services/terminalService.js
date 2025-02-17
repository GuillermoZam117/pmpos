import { gql } from '@apollo/client';
import { client } from '../apollo';

const REGISTER_TERMINAL = gql`
  mutation RegisterTerminal(
    $ticketType: String!
    $terminal: String!
    $department: String!
    $user: String!
  ) {
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

const ADD_ORDER = gql`
  mutation AddOrder($terminalId: String!, $productName: String!) {
    addOrderToTerminalTicket(
      terminalId: $terminalId
      productName: $productName
    ) {
      totalAmount
    }
  }
`;

const CLOSE_TICKET = gql`
  mutation CloseTicket($terminalId: String!) {
    closeTerminalTicket(terminalId: $terminalId)
  }
`;

export const terminalService = {
    async register(user) {
        const { data } = await client.mutate({
            mutation: REGISTER_TERMINAL,
            variables: {
                ticketType: "Ticket",
                terminal: "WebClient",
                department: "Restaurant",
                user: user.name
            }
        });
        return data.registerTerminal;
    },

    async createTicket(terminalId) {
        const { data } = await client.mutate({
            mutation: CREATE_TICKET,
            variables: { terminalId }
        });
        return data.createTerminalTicket;
    },

    async addOrder(terminalId, productName) {
        const { data } = await client.mutate({
            mutation: ADD_ORDER,
            variables: { terminalId, productName }
        });
        return data.addOrderToTerminalTicket;
    },

    async closeTicket(terminalId) {
        const { data } = await client.mutate({
            mutation: CLOSE_TICKET,
            variables: { terminalId }
        });
        return data.closeTerminalTicket;
    }
};