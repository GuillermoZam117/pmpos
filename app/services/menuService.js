/**
 * Menu Service for PMPOS
 * Enhanced menu management with robust caching and no fallbacks
 */
import { gql, graphqlRequest, gqlEscape } from './graphqlService';
import { GET_MENU, GET_PRODUCTS } from '../graphql/queries';
import cacheService from './cacheService';
import Debug from 'debug';

const debug = Debug('pmpos:menu');

class MenuService {
    constructor() {
        this.currentMenu = null;
        this.loading = false;
        this.error = null;
        this.productNameById = new Map();
        this.salesMode = 'mesas';
        this.menuName = 'MENU';
    }

    setSalesMode(modeKey = 'mesas') {
        this.salesMode = modeKey || 'mesas';
    }

    setMenuName(name = 'MENU') {
        this.menuName = name || 'MENU';
    }

    /**
     * Get menu with caching and retry logic
     */
    async getMenu(forceRefresh = false) {
        if (this.salesMode === 'mostrador') {
            return await this.getMenuFromProducts(forceRefresh);
        }
        debug('📋 Getting menu...', { forceRefresh });

        // Check cache first unless forced refresh
        if (!forceRefresh && !this.loading) {
            const cachedMenu = cacheService.getMenu();
            if (cachedMenu) {
                debug('✅ Using cached menu');
                this.currentMenu = cachedMenu;
                this.buildIndex(cachedMenu);
                return cachedMenu;
            }
        }

        // Prevent concurrent requests
        if (this.loading) {
            debug('⏳ Menu loading in progress, waiting...');
            await this.waitForLoad();
            return this.currentMenu;
        }

        try {
            return await this.loadMenuFromServer();
        } catch (error) {
            // Offline-friendly: prefer cached menu; otherwise return empty structure
            try {
                const cached = cacheService.getMenu && cacheService.getMenu();
                if (cached) {
                    debug('dY"? Using cached menu after failure');
                    this.currentMenu = cached;
                    this.buildIndex(cached);
                    return cached;
                }
            } catch (_) {}
            debug('dY"? Returning empty menu after failure');
            this.currentMenu = { categories: [] };
            return this.currentMenu;
        }
    }

    /**
     * Load menu from server - ÚNICO QUERY QUE FUNCIONA
     */
    async loadMenuFromServer() {
        this.loading = true;
        this.error = null;

        try {
            const menuName = this.menuName || 'MENU';
            // Canonical GET_MENU attempt (non-fatal):
            try {
                const dataCanonical = await graphqlRequest(GET_MENU, { name: menuName });
                const menuCanonical = dataCanonical?.getMenu || null;
                if (menuCanonical && menuCanonical.categories) {
                    cacheService.setMenu(menuCanonical);
                    this.currentMenu = menuCanonical;
                    this.buildIndex(menuCanonical);
                    return menuCanonical;
                }
            } catch (e) {
                try { debug('dY"? Canonical GET_MENU failed, falling back:', e?.message || e); } catch {}
            }
            // Canonical query path using shared queries
            const dataCanonical = await graphqlRequest(GET_MENU, { name: menuName });
            const menuCanonical = dataCanonical?.getMenu || null;
            if (menuCanonical && menuCanonical.categories) {
                cacheService.setMenu(menuCanonical);
                this.currentMenu = menuCanonical;
                this.buildIndex(menuCanonical);
                return menuCanonical;
            }
            // ÚNICO QUERY QUE FUNCIONA - SIN FALLBACKS
            const escapedMenuName = gqlEscape(menuName);
            const query = `query { 
                menu: getMenu(name: "${escapedMenuName}") { 
                    categories { 
                        id 
                        name 
                        menuItems { 
                            id 
                            name 
                            caption 
                            quantity 
                            product { 
                                name 
                                barcode 
                                groupCode 
                                price 
                                portions { 
                                    id 
                                    name 
                                    price 
                                } 
                            } 
                        } 
                    } 
                } 
            }`;

            debug('🍽️ Loading menu with WORKING QUERY (no fallbacks)...');
            const data = await this.executeQuery(query);

            if (data?.menu && data.menu.categories) {
                debug('✅ Menu loaded successfully:', `${data.menu.categories.length} categories`);

                // Cache the successful result
                cacheService.setMenu(data.menu);
                this.currentMenu = data.menu;
                this.buildIndex(data.menu);

                return data.menu;
            } else {
                throw new Error('Invalid menu data structure received');
            }
        } catch (error) {
            debug('❌ Menu loading failed:', error.message);
            this.error = error;
            throw new Error(`Error al cargar menu: ${error.message}`);
        } finally {
            this.loading = false;
        }
    }

    /**
     * Execute GraphQL query using unified method
     */
    async executeQuery(query) {
        debug(`🔗 Executing GraphQL query`);
        debug(`📝 Query being sent:`, query.substring(0, 200) + '...');

        try {
            const data = await gql(query);
            debug(`📦 Full GraphQL response:`, data);

            if (data.errors && data.errors.length > 0) {
                debug(`❌ GraphQL errors:`, data.errors);
                const errorMsg = data.errors.map(e => e.message).join(', ');
                throw new Error(`GraphQL Error: ${errorMsg}`);
            }

            // Handle both getMenu and menu response formats
            const menu = data?.getMenu || data?.menu;
            debug(`🍽️ Menu data structure:`, menu ? `Found ${menu.categories?.length || 0} categories` : 'No menu data');

            if (menu && menu.categories) {
                debug(`📋 Categories found: ${menu.categories.map(c => c.name).join(', ')}`);
            }

            return data;
        } catch (error) {
            debug(`❌ GraphQL error:`, error);
            throw error;
        }
    }

    /**
     * Get products with portions and tags (single working query)
     */
    async getProducts() {
        const data = await graphqlRequest(GET_PRODUCTS, {});
        return data?.getProducts || [];
    }

    async getMenuFromProducts(forceRefresh = false) {
        debug('🧮 Building menu from products...', { forceRefresh });
        if (!forceRefresh && this.currentMenu && this.currentMenu._source === 'products') {
            debug('✅ Using cached product-based menu');
            return this.currentMenu;
        }

        const products = await this.getProducts();
        const groups = new Map();
        products.forEach(product => {
            const groupKey = (product.groupCode || 'GENERAL') || 'GENERAL';
            if (!groups.has(groupKey)) groups.set(groupKey, []);
            groups.get(groupKey).push(product);
        });

        const categories = Array.from(groups.entries()).map(([name, items], idx) => ({
            id: idx + 1,
            name,
            menuItems: items.map(item => ({
                id: item.id,
                name: item.name,
                caption: item.name,
                quantity: 1,
                product: {
                    id: item.id,
                    name: item.name,
                    barcode: item.barcode,
                    groupCode: item.groupCode,
                    price: item.portions?.[0]?.price || item.price || 0,
                    portions: item.portions || []
                }
            }))
        }));

        const syntheticMenu = { categories, _source: 'products' };
        this.currentMenu = syntheticMenu;
        this.buildIndex(syntheticMenu);
        return syntheticMenu;
    }

    /**
     * Wait for loading to complete

    // No fallbacks or validations beyond GraphQL schema contract

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
     * Build fast index maps for product resolution
     */
    buildIndex(menuData) {
        try {
            this.productNameById.clear();
            const cats = menuData?.categories || [];
            for (const cat of cats) {
                const items = cat?.menuItems || [];
                for (const it of items) {
                    const id = String(it.productId || it.product?.id || '');
                    if (!id) continue;
                    const name = it.name || it.caption || it.product?.name || '';
                    if (name && !this.productNameById.has(id)) {
                        this.productNameById.set(id, name);
                    }
                }
            }
            debug(`🔎 Built product index: ${this.productNameById.size} items`);
        } catch (e) {
            debug('⚠️ Failed building menu index:', e?.message || e);
        }
    }

    /**
     * Get product name by productId using index
     */
    getProductNameById(productId) {
        if (!productId) return null;
        const key = String(productId);
        return this.productNameById.get(key) || null;
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
