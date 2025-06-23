import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { tokenService } from './services/tokenService';

const httpLink = createHttpLink({
    uri: 'http://localhost:9000/api/graphql',
});

const authLink = setContext(async (_, { headers }) => {
    try {
        const token = await tokenService.getValidAccessToken();
        return {
            headers: {
                ...headers,
                authorization: token ? `Bearer ${token}` : "",
            }
        };
    } catch (error) {
        console.error('❌ Failed to get valid access token:', error);
        return {
            headers: {
                ...headers,
            }
        };
    }
});

export const client = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache()
});