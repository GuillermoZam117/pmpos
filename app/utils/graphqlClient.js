import { GraphQLClient } from 'graphql-request';
import { appconfig } from '../config';
import { resolveGqlUrl } from './gqlEndpoint';

export const createGraphQLClient = (token) => {
    const headers = {
        authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
    };

    const url = resolveGqlUrl(appconfig());
    return new GraphQLClient(url, { headers });
};

export const queries = {
    // Terminal queries
    getTerminal: `
        query getTerminal($terminalName: String!) {
            terminal(name: $terminalName) {
                id
                name
                department
                type
            }
        }
    `,

    // Authentication mutations
    login: `
        mutation login($username: String!, $password: String!) {
            authenticate(username: $username, password: $password) {
                token
                refreshToken
            }
        }
    `,

    // Ticket queries
    getTerminalTicket: `
        query getTerminalTicket($terminalId: String!) {
            ticket: getTerminalTicket(terminalId: $terminalId) {
                id
                uid
                type
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
                    uid
                    name
                    quantity
                    price
                }
            }
        }
    `,

    // Discovery - aligned GraphQL operations (work with GraphQLClient)
    createTerminalTicket: `
        mutation createTerminalTicket($terminalId: String!) {
            createTerminalTicket(terminalId: $terminalId) {
                id
                uid
                type
                totalAmount
                remainingAmount
            }
        }
    `,

    loadTerminalTicket: `
        mutation loadTerminalTicket($terminalId: String!, $ticketId: String!) {
            loadTerminalTicket(terminalId: $terminalId, ticketId: $ticketId) {
                id
                uid
                number
                type
                totalAmount
                remainingAmount
                entities { name type }
                orders {
                    id
                    uid
                    name
                    quantity
                    price
                    portion
                }
            }
        }
    `,

    changeEntityOfTerminalTicket: `
        mutation changeEntityOfTerminalTicket($terminalId: String!, $type: String!, $name: String!) {
            changeEntityOfTerminalTicket(terminalId: $terminalId, type: $type, name: $name) {
                id
                uid
                number
                totalAmount
                remainingAmount
                entities { name type }
            }
        }
    `,

    closeTerminalTicket: `
        mutation closeTerminalTicket($terminalId: String!) {
            closeTerminalTicket(terminalId: $terminalId)
        }
    `
};

export default createGraphQLClient;
