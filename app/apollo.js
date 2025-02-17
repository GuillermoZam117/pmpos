import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { tokenService } from './services/tokenService';

const httpLink = createHttpLink({
    uri: 'http://localhost:9000/api/graphql',
});

const authLink = setContext((_, { headers }) => {
    const token = tokenService.getToken();
    return {
        headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : "",
        }
    };
});

export const client = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache()
});