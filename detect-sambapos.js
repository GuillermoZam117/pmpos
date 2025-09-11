#!/usr/bin/env node

/**
 * Detect SambaPOS Discovery service and fix configuration
 */

const fs = require('fs');

console.log('🔍 Detecting SambaPOS Discovery Service...\n');

// Common ports where SambaPOS Discovery might be running
const PORTS_TO_CHECK = [9000, 8080, 3000, 5000, 8090];
const HOSTS_TO_CHECK = ['localhost', '127.0.0.1'];

async function testSambaPOSPort(host, port) {
    try {
        const testUrl = `http://${host}:${port}/graphql`;
        const response = await fetch(testUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: '{ __schema { queryType { name } } }'
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.data && !data.errors) {
                return { host, port, url: `http://${host}:${port}` };
            }
        }
        return null;
    } catch (error) {
        return null;
    }
}

async function findSambaPOS() {
    console.log('🔍 Scanning for SambaPOS Discovery...');

    for (const host of HOSTS_TO_CHECK) {
        for (const port of PORTS_TO_CHECK) {
            console.log(`   Testing ${host}:${port}...`);
            const result = await testSambaPOSPort(host, port);
            if (result) {
                console.log(`✅ Found SambaPOS Discovery at ${result.url}`);
                return result;
            }
        }
    }

    console.log('❌ No SambaPOS Discovery service found');
    return null;
}

async function testCurrentConfig() {
    console.log('🔧 Testing current configuration...');

    // Check environment variables
    const envFile = '.env';
    let currentUrl = 'http://localhost:9000'; // default

    if (fs.existsSync(envFile)) {
        const envContent = fs.readFileSync(envFile, 'utf8');
        const urlMatch = envContent.match(/REACT_APP_SAMBAPOS_URL=(.+)/);
        if (urlMatch) {
            currentUrl = urlMatch[1].trim();
        }
    }

    console.log(`Current configured URL: ${currentUrl}`);

    try {
        const response = await fetch(`${currentUrl}/graphql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: '{ __schema { queryType { name } } }'
            })
        });

        if (response.ok) {
            console.log('✅ Current configuration is working');
            return true;
        } else {
            console.log(`❌ Current configuration failing: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Current configuration error: ${error.message}`);
        return false;
    }
}

async function updateConfig(discoveredUrl) {
    console.log(`🔧 Updating configuration to use ${discoveredUrl}...`);

    // Update .env file
    const envFile = '.env';
    let envContent = '';

    if (fs.existsSync(envFile)) {
        envContent = fs.readFileSync(envFile, 'utf8');
    }

    const urlPattern = /REACT_APP_SAMBAPOS_URL=.*/;
    const newLine = `REACT_APP_SAMBAPOS_URL=${discoveredUrl}`;

    if (urlPattern.test(envContent)) {
        envContent = envContent.replace(urlPattern, newLine);
    } else {
        envContent += `\n${newLine}\n`;
    }

    fs.writeFileSync(envFile, envContent);
    console.log('✅ Updated .env file');

    // Also create a config update summary
    const summary = {
        timestamp: new Date().toISOString(),
        discoveredUrl,
        previousConfig: 'http://localhost:9000',
        status: 'updated'
    };

    fs.writeFileSync('discovery-config.json', JSON.stringify(summary, null, 2));
    console.log('✅ Created discovery-config.json');
}

async function main() {
    // Step 1: Test current config
    const currentWorks = await testCurrentConfig();

    if (currentWorks) {
        console.log('\n🎉 Current configuration is working fine!');
        console.log('The issue may be with:');
        console.log('- Order tag data in SambaPOS database');
        console.log('- Product configuration in SambaPOS');
        console.log('- Terminal registration');
        return;
    }

    console.log('\n');

    // Step 2: Find working SambaPOS instance
    const discovered = await findSambaPOS();

    if (discovered) {
        console.log(`\n🔧 Would you like to update configuration to use ${discovered.url}?`);
        console.log('This will update your .env file.');

        // For now, just show the command they should run
        console.log('\nTo update configuration, run:');
        console.log(`echo "REACT_APP_SAMBAPOS_URL=${discovered.url}" >> .env`);

        await updateConfig(discovered.url);
    } else {
        console.log('\n❌ No SambaPOS Discovery service found.');
        console.log('\n💡 Please ensure:');
        console.log('1. SambaPOS is running');
        console.log('2. Discovery service is enabled');
        console.log('3. Firewall allows the connection');
        console.log('4. SambaPOS is configured for GraphQL API');
    }

    console.log('\n🔍 Next steps for debugging:');
    console.log('1. Check SambaPOS logs for startup errors');
    console.log('2. Verify Discovery is enabled in SambaPOS settings');
    console.log('3. Test order tags configuration in SambaPOS directly');
    console.log('4. Check product portions setup in SambaPOS menu');
}

// Check for Node fetch availability
if (typeof fetch === 'undefined') {
    console.log('❌ This script requires Node.js 18+ with built-in fetch');
    process.exit(1);
}

main().catch(console.error);
