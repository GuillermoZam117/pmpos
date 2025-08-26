#!/usr/bin/env node

/**
 * Test script for MenuService menu loading functionality
 * This script helps debug menu loading issues independently
 */

// Setup environment
process.env.NODE_ENV = 'development';

const config = {
    GQLurl: 'http://localhost:8081/api/graphql',  // Dev server proxy
    menuName: 'MENU'
};

async function testMenuLoading() {
    console.log('🧪 Testing Menu Loading...');
    console.log('📊 Configuration:', config);
    
    try {
        // Test the exact GraphQL query that was working
        const query = `query GetMenu {
            getMenu(name: "MENU") {
                categories {
                    name
                    menuItems {
                        name
                        product {
                            id
                            name
                            portions { name price }
                        }
                    }
                }
            }
        }`;
        
        console.log('📝 Testing GraphQL Query:', query.substring(0, 100) + '...');
        
        const response = await fetch(config.GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Note: No auth token for initial test
            },
            body: JSON.stringify({ query })
        });
        
        console.log('📡 HTTP Response:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ HTTP Error:', errorText);
            return;
        }
        
        const data = await response.json();
        console.log('📦 Response Data:', JSON.stringify(data, null, 2));
        
        if (data.errors) {
            console.error('❌ GraphQL Errors:', data.errors);
            return;
        }
        
        const menu = data.data?.getMenu;
        if (menu && menu.categories) {
            console.log('✅ Menu loaded successfully!');
            console.log('📋 Categories:', menu.categories.length);
            menu.categories.forEach((category, i) => {
                console.log(`   ${i + 1}. ${category.name} (${category.menuItems?.length || 0} items)`);
            });
        } else {
            console.error('❌ Invalid menu structure:', menu);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Run the test
if (require.main === module) {
    testMenuLoading().then(() => {
        console.log('🏁 Test completed');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Test crashed:', error);
        process.exit(1);
    });
}

module.exports = { testMenuLoading };