/**
 * Menu Service for PMPOS
 * Enhanced menu management with robust caching and no fallbacks
 */
import { appconfig } from '../config';
import { tokenService } from './tokenService';
import cacheService from './cacheService';
import Debug from 'debug';

const debug = Debug('pmpos:menu');

class MenuService {
    constructor() {
        this.currentMenu = null;
        this.loading = false;
        this.error = null;
    }

    /**
     * Get menu with caching and retry logic
     */
    async getMenu(forceRefresh = false) {
        debug('📋 Getting menu...', { forceRefresh });
        
        // Check cache first unless forced refresh
        if (!forceRefresh && !this.loading) {
            const cachedMenu = cacheService.getMenu();
            if (cachedMenu) {
                debug('✅ Using cached menu');
                this.currentMenu = cachedMenu;
                return cachedMenu;
            }
        }

        // Prevent concurrent requests
        if (this.loading) {
            debug('⏳ Menu loading in progress, waiting...');
            await this.waitForLoad();
            return this.currentMenu;
        }

        return this.loadMenuFromServer();
    }

    /**
     * Load menu from server with enhanced error handling
     */
    async loadMenuFromServer() {
        this.loading = true;
        this.error = null;

        try {
            const token = await tokenService.getValidAccessToken();
            if (!token) {
                throw new Error('No authentication token available');
            }

            const config = appconfig();
            const queries = this.getMenuQueries();
            
            // Try each query format until one succeeds
            for (let i = 0; i < queries.length; i++) {
                debug(`📋 Trying menu query format ${i + 1}/${queries.length}...`);
                
                try {
                    const menuData = await this.executeQuery(queries[i], token, config);
                    if (menuData && this.validateMenuData(menuData)) {
                        debug('✅ Menu loaded successfully with format', i + 1);
                        
                        // Cache the successful result
                        cacheService.setMenu(menuData);
                        this.currentMenu = menuData;
                        
                        return menuData;
                    }
                } catch (queryError) {
                    debug(`❌ Query format ${i + 1} failed:`, queryError.message);
                    debug(`❌ Query was:`, queries[i]);
                    debug(`❌ Full error:`, queryError);
                    continue;
                }
            }
            
            throw new Error('All menu query formats failed');
            
        } catch (error) {
            debug('❌ Menu loading failed:', error);
            this.error = error;
            throw error;
        } finally {
            this.loading = false;
        }
    }

    /**
     * Execute GraphQL query with enhanced diagnostics
     */
    async executeQuery(query, token, config) {
        debug(`🔗 Executing GraphQL query to: ${config.GQLurl}`);
        debug(`🔑 Token status: ${token ? `Present (${token.substring(0, 10)}...)` : 'Missing'}`);
        debug(`📝 Query being sent:`, query.substring(0, 200) + '...');
        
        try {
            const response = await fetch(config.GQLurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ query })
            });

            debug(`📡 HTTP Response: ${response.status} ${response.statusText}`);
            debug(`📡 Response headers:`, Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text();
                debug(`❌ HTTP Error response body:`, errorText);
                
                // Provide specific error messages for common issues
                if (response.status === 401) {
                    throw new Error(`Authentication failed (401). Check SambaPOS credentials and token.`);
                } else if (response.status === 404) {
                    throw new Error(`GraphQL endpoint not found (404). Check SambaPOS URL: ${config.GQLurl}`);
                } else if (response.status === 500) {
                    throw new Error(`SambaPOS server error (500). Check SambaPOS service status.`);
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
                }
            }

            const data = await response.json();
            debug(`📦 Full GraphQL response:`, data);
            
            if (data.errors && data.errors.length > 0) {
                debug(`❌ GraphQL errors:`, data.errors);
                const errorMsg = data.errors.map(e => e.message).join(', ');
                throw new Error(`GraphQL Error: ${errorMsg}`);
            }

            // Handle both getMenu and menu response formats
            const menu = data.data?.getMenu || data.data?.menu;
            debug(`🍽️ Menu data structure:`, menu ? `Found ${menu.categories?.length || 0} categories` : 'No menu data');
            
            if (menu && menu.categories) {
                debug(`📋 Categories found: ${menu.categories.map(c => c.name).join(', ')}`);
            }
            
            return menu;
            
        } catch (fetchError) {
            debug(`❌ Fetch error:`, fetchError);
            
            // Provide user-friendly error messages for network issues
            if (fetchError.name === 'TypeError' && fetchError.message.includes('Failed to fetch')) {
                throw new Error(`Cannot connect to SambaPOS server at ${config.GQLurl}. Check if SambaPOS is running and accessible.`);
            }
            
            throw fetchError;
        }
    }

    /**
     * Get different menu query formats for compatibility
     */
    getMenuQueries() {
        return [
            // Exact query format that worked in GraphiQL testing
            `query GetMenu {
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
            }`,
            // Enhanced query with complete product information
            `query GetMenu {
                menu {
                    id
                    name
                    categories {
                        id
                        name
                        caption
                        color
                        foreground
                        sortOrder
                        menuItems {
                            id
                            name
                            caption
                            productId
                            sortOrder
                            image
                            description
                            product {
                                id
                                name
                                caption
                                description
                                portions {
                                    id
                                    name
                                    price
                                    isDefault
                                }
                            }
                            portions {
                                id
                                name
                                price
                                isDefault
                            }
                            tags {
                                id
                                name
                                value
                            }
                            defaultOrderTags {
                                id
                                name
                                value
                                price
                            }
                        }
                    }
                }
            }`,
            // Standard query format
            `query GetMenu {
                menu {
                    categories {
                        id
                        name
                        caption
                        color
                        menuItems {
                            id
                            name
                            caption
                            productId
                            product {
                                id
                                name
                                portions {
                                    id
                                    name
                                    price
                                }
                            }
                            portions {
                                id
                                name
                                price
                            }
                            defaultOrderTags {
                                id
                                name
                                value
                                price
                            }
                        }
                    }
                }
            }`,
            // Simplified fallback query
            `query GetMenu {
                menu {
                    categories {
                        name
                        menuItems {
                            name
                            productId
                            portions {
                                name
                                price
                            }
                        }
                    }
                }
            }`
        ];
    }

    /**
     * Validate menu data structure
     */
    validateMenuData(menuData) {
        if (!menuData) {
            debug('❌ No menu data received');
            return false;
        }

        if (!menuData.categories || !Array.isArray(menuData.categories)) {
            debug('❌ Invalid menu structure: no categories array');
            return false;
        }

        if (menuData.categories.length === 0) {
            debug('⚠️ Empty menu: no categories found');
            return false;
        }

        // Validate each category has required fields
        for (const category of menuData.categories) {
            if (!category.name) {
                debug('❌ Invalid category: missing name');
                return false;
            }

            if (category.menuItems && Array.isArray(category.menuItems)) {
                for (const item of category.menuItems) {
                    if (!item.name && !item.caption) {
                        debug('❌ Invalid menu item: missing name/caption');
                        return false;
                    }
                }
            }
        }

        debug('✅ Menu data validation passed');
        return true;
    }

    /**
     * Wait for loading to complete
     */
    async waitForLoad() {
        const maxWait = 30000; // 30 seconds
        const interval = 100; // Check every 100ms
        let waited = 0;

        return new Promise((resolve) => {
            const check = () => {
                if (!this.loading || waited >= maxWait) {
                    resolve();
                } else {
                    waited += interval;
                    setTimeout(check, interval);
                }
            };
            check();
        });
    }

    /**
     * Find menu item by product ID
     */
    findMenuItemByProductId(productId) {
        if (!this.currentMenu?.categories) return null;

        for (const category of this.currentMenu.categories) {
            if (category.menuItems) {
                const menuItem = category.menuItems.find(item => 
                    item.productId === productId || item.id === productId
                );
                if (menuItem) {
                    return { ...menuItem, categoryName: category.name };
                }
            }
        }
        return null;
    }

    /**
     * Get all menu items across categories
     */
    getAllMenuItems() {
        if (!this.currentMenu?.categories) return [];

        const allItems = [];
        for (const category of this.currentMenu.categories) {
            if (category.menuItems) {
                category.menuItems.forEach(item => {
                    allItems.push({
                        ...item,
                        categoryName: category.name,
                        categoryColor: category.color
                    });
                });
            }
        }
        return allItems;
    }

    /**
     * Clear menu cache
     */
    clearCache() {
        cacheService.clearMenu();
        this.currentMenu = null;
    }

    /**
     * Get current menu without loading
     */
    getCurrentMenu() {
        return this.currentMenu;
    }

    /**
     * Check if menu is currently loading
     */
    isLoading() {
        return this.loading;
    }

    /**
     * Get last error
     */
    getError() {
        return this.error;
    }
}

export default new MenuService();
export { MenuService };
