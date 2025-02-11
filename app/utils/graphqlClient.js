import { GraphQLClient } from 'graphql-request';
import { appconfig } from '../config';

export const createGraphQLClient = (token) => {
    const headers = {
        authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
    };

    return new GraphQLClient(appconfig().GQLurl, { headers });
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
    `
};

export default createGraphQLClient;