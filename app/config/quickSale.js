/**
 * Quick Sale Configuration
 * Manages frequent products for fast counter sales
 */

// Default frequent products (can be overridden by localStorage)
export const DEFAULT_QUICK_PRODUCTS = [
    // These are placeholders - real products should be configured by admin
    // or loaded from menu data
];

// Get quick sale configuration from localStorage or defaults
export const getQuickSaleConfig = () => {
    if (typeof window === 'undefined') return { enabled: false, products: [] };

    try {
        const stored = localStorage.getItem('pmpos_quick_sale_config');
        if (stored) {
            const config = JSON.parse(stored);
            return {
                enabled: config.enabled ?? true,
                products: config.products || []
            };
        }
    } catch (error) {
        console.error('Error loading quick sale config:', error);
    }

    return {
        enabled: true,
        products: DEFAULT_QUICK_PRODUCTS
    };
};

// Save quick sale configuration
export const saveQuickSaleConfig = (config) => {
    if (typeof window === 'undefined') return false;

    try {
        localStorage.setItem('pmpos_quick_sale_config', JSON.stringify(config));
        return true;
    } catch (error) {
        console.error('Error saving quick sale config:', error);
        return false;
    }
};

// Add product to quick sale
export const addToQuickSale = (product) => {
    const config = getQuickSaleConfig();

    // Check if product already exists
    const exists = config.products.some(p =>
        p.id === product.id || p.productId === product.productId
    );

    if (exists) return false;

    // Add product with essential info
    const quickProduct = {
        id: product.id || product.productId,
        productId: product.productId || product.id,
        name: product.name,
        price: product.price || product.defaultPrice || 0,
        portions: product.portions || [],
        categoryName: product.categoryName || '',
        image: product.image || null,
        orderTags: product.defaultOrderTags || [],
        addedAt: new Date().toISOString()
    };

    config.products.push(quickProduct);
    return saveQuickSaleConfig(config);
};

// Remove product from quick sale
export const removeFromQuickSale = (productId) => {
    const config = getQuickSaleConfig();
    config.products = config.products.filter(p =>
        p.id !== productId && p.productId !== productId
    );
    return saveQuickSaleConfig(config);
};

// Toggle quick sale enabled/disabled
export const toggleQuickSale = () => {
    const config = getQuickSaleConfig();
    config.enabled = !config.enabled;
    return saveQuickSaleConfig(config);
};

// Get product price (handles portions)
export const getQuickProductPrice = (product) => {
    if (product.portions && product.portions.length > 0) {
        const defaultPortion = product.portions.find(p => p.isDefault) || product.portions[0];
        return parseFloat(defaultPortion.price) || 0;
    }
    return parseFloat(product.price) || 0;
};

export default {
    getQuickSaleConfig,
    saveQuickSaleConfig,
    addToQuickSale,
    removeFromQuickSale,
    toggleQuickSale,
    getQuickProductPrice
};
