const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

async function debugSambaPOS() {
    console.log('🔍 Starting SambaPOS Debug...\n');
    
    const config = {
        GQLurl: process.env.SAMBAPOS_GRAPHQL_URL || 'http://localhost:9000/api/graphql',
        userName: process.env.USER_NAME || 'admin',
        password: process.env.PASSWORD || '1234'
    };

    try {
        // 1. Configuration Check
        console.log('1️⃣  Configuration Check:');
        console.log('   API URL:', config.GQLurl);
        console.log('   Username:', config.userName);
        console.log('   Password:', '****' + config.password.slice(-1));
        console.log();

        // 2. Server Check
        console.log('2️⃣  Server Check:');
        const serverResponse = await fetch(config.GQLurl);
        console.log('   Status:', serverResponse.status);
        console.log('   Headers:', JSON.stringify(Object.fromEntries(serverResponse.headers), null, 2));
        console.log();

        // 3. Authentication Test
        console.log('3️⃣  Authentication Test:');
        const authResponse = await fetch(config.GQLurl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `
                    mutation {
                        authenticate(
                            username: "${config.userName}",
                            password: "${config.password}"
                        ) {
                            token
                            refreshToken
                        }
                    }
                `
            })
        });

        const authData = await authResponse.json();
        if (authData.data?.authenticate?.token) {
            console.log('   ✅ Authentication Successful');
            console.log('   Token:', authData.data.authenticate.token.substring(0, 20) + '...');
        } else {
            console.log('   ❌ Authentication Failed');
            console.log('   Error:', authData.errors?.[0]?.message || 'Unknown error');
        }

    } catch (error) {
        console.error('\n❌ Debug Failed:', error.message);
    }
}

debugSambaPOS().catch(console.error);