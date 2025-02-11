import fetch from 'node-fetch';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const API_URL = 'http://localhost:9000/api/graphql';
const AUTH_URL = 'http://localhost:9000/Token';

async function testSambaPOSConnection() {
    console.log('\n🔍 Testing SambaPOS API Connection\n');

    try {
        // Step 1: Get Token
        console.log('1. Requesting access token...');
        // Código de autenticación que funciona
        const tokenResponse = await fetch(AUTH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'password',
                username: 'graphiql',
                password: 'graphiql',
                client_id: 'graphiql'
            })
        });

        const tokenData = await tokenResponse.json();
        console.log('Token Response:', JSON.stringify(tokenData, null, 2));

        if (tokenData.access_token) {
            console.log('\n✅ Token obtained successfully');

            // Step 2: Test GraphQL Query
            console.log('\n2. Testing GraphQL query with token...');
            const graphqlResponse = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${tokenData.access_token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    query: `
                        query {
                            terminals {
                                id
                                name
                                isDefault
                            }
                        }
                    `
                })
            });

            const graphqlData = await graphqlResponse.json();
            console.log('\nGraphQL Response:', JSON.stringify(graphqlData, null, 2));
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

testSambaPOSConnection().catch(console.error);