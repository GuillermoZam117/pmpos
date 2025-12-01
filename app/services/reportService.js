/**
 * Report Service
 * Handles sales analytics and reporting data aggregation
 */

import { graphqlRequest } from './graphqlService';
import { GET_OPEN_TICKETS } from '../graphql/queries';
import Debug from 'debug';

const debug = Debug('pmpos:report-service');

class ReportService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 120000; // 2 minutes cache
    }

    /**
     * Get hourly sales breakdown for today
     * @param {Object} options - Options
     * @param {string} options.departmentName - Filter by department
     * @param {Date} options.date - Target date (default: today)
     * @param {boolean} options.useCache - Use cached data
     * @returns {Promise<Array>} Array of {hour, sales, tickets, avgTicket}
     */
    async getHourlySales(options = {}) {
        const {
            departmentName = null,
            date = new Date(),
            useCache = true
        } = options;

        const cacheKey = `hourly_${departmentName}_${date.toISOString().split('T')[0]}`;

        // Check cache
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                debug('📊 Using cached hourly sales');
                return cached.data;
            }
        }

        try {
            debug('📊 Fetching hourly sales...');

            // Get all tickets
            const response = await graphqlRequest(GET_OPEN_TICKETS, {});
            const allTickets = response?.getTickets || [];

            // Filter tickets for target date
            const targetDate = new Date(date);
            targetDate.setHours(0, 0, 0, 0);
            const nextDay = new Date(targetDate);
            nextDay.setDate(nextDay.getDate() + 1);

            const filteredTickets = allTickets.filter(ticket => {
                if (!ticket.date) return false;

                const ticketDate = new Date(ticket.date);

                // Check date range
                if (ticketDate < targetDate || ticketDate >= nextDay) {
                    return false;
                }

                // Filter by department if specified
                if (departmentName && ticket.departmentName !== departmentName) {
                    return false;
                }

                // Only closed tickets for accurate sales
                return ticket.isClosed === true;
            });

            // Group by hour
            const hourlyMap = {};
            for (let i = 0; i < 24; i++) {
                hourlyMap[i] = {
                    hour: i,
                    label: `${i.toString().padStart(2, '0')}:00`,
                    sales: 0,
                    tickets: 0,
                    avgTicket: 0
                };
            }

            filteredTickets.forEach(ticket => {
                const ticketDate = new Date(ticket.date);
                const hour = ticketDate.getHours();
                const total = parseFloat(ticket.totalAmount) || 0;

                hourlyMap[hour].sales += total;
                hourlyMap[hour].tickets += 1;
            });

            // Calculate averages and round
            const hourlyData = Object.values(hourlyMap).map(hour => ({
                ...hour,
                sales: Math.round(hour.sales * 100) / 100,
                avgTicket: hour.tickets > 0
                    ? Math.round((hour.sales / hour.tickets) * 100) / 100
                    : 0
            }));

            debug('✅ Hourly sales calculated:', hourlyData.filter(h => h.sales > 0).length, 'hours with sales');

            // Cache result
            this.cache.set(cacheKey, {
                data: hourlyData,
                timestamp: Date.now()
            });

            return hourlyData;
        } catch (error) {
            debug('❌ Error getting hourly sales:', error);
            throw error;
        }
    }

    /**
     * Get top products by quantity and revenue
     * @param {Object} options - Options
     * @param {string} options.departmentName - Filter by department
     * @param {Date} options.date - Target date (default: today)
     * @param {number} options.limit - Max products to return (default: 10)
     * @param {boolean} options.useCache - Use cached data
     * @returns {Promise<Array>} Array of {name, quantity, total, avgPrice, category}
     */
    async getTopProducts(options = {}) {
        const {
            departmentName = null,
            date = new Date(),
            limit = 10,
            useCache = true
        } = options;

        const cacheKey = `top_products_${departmentName}_${date.toISOString().split('T')[0]}_${limit}`;

        // Check cache
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                debug('📊 Using cached top products');
                return cached.data;
            }
        }

        try {
            debug('📊 Fetching top products...');

            // Get all tickets
            const response = await graphqlRequest(GET_OPEN_TICKETS, {});
            const allTickets = response?.getTickets || [];

            // Filter tickets for target date
            const targetDate = new Date(date);
            targetDate.setHours(0, 0, 0, 0);
            const nextDay = new Date(targetDate);
            nextDay.setDate(nextDay.getDate() + 1);

            const filteredTickets = allTickets.filter(ticket => {
                if (!ticket.date) return false;

                const ticketDate = new Date(ticket.date);

                // Check date range
                if (ticketDate < targetDate || ticketDate >= nextDay) {
                    return false;
                }

                // Filter by department if specified
                if (departmentName && ticket.departmentName !== departmentName) {
                    return false;
                }

                // Only closed tickets for accurate sales
                return ticket.isClosed === true;
            });

            // Aggregate products
            const productMap = {};

            filteredTickets.forEach(ticket => {
                if (!ticket.orders || !Array.isArray(ticket.orders)) {
                    return;
                }

                ticket.orders.forEach(order => {
                    const productKey = order.menuItemName || order.name || 'Sin nombre';
                    const quantity = parseFloat(order.quantity) || 0;
                    const price = parseFloat(order.price) || 0;
                    const total = quantity * price;

                    if (!productMap[productKey]) {
                        productMap[productKey] = {
                            name: productKey,
                            quantity: 0,
                            total: 0,
                            category: order.category || 'General'
                        };
                    }

                    productMap[productKey].quantity += quantity;
                    productMap[productKey].total += total;
                });
            });

            // Convert to array and calculate averages
            const products = Object.values(productMap)
                .map(product => ({
                    ...product,
                    total: Math.round(product.total * 100) / 100,
                    quantity: Math.round(product.quantity * 10) / 10,
                    avgPrice: Math.round((product.total / product.quantity) * 100) / 100
                }))
                .sort((a, b) => b.quantity - a.quantity) // Sort by quantity
                .slice(0, limit);

            debug('✅ Top products calculated:', products.length, 'products');

            // Cache result
            this.cache.set(cacheKey, {
                data: products,
                timestamp: Date.now()
            });

            return products;
        } catch (error) {
            debug('❌ Error getting top products:', error);
            throw error;
        }
    }

    /**
     * Get sales by payment type
     * @param {Object} options - Options
     * @returns {Promise<Object>} Payment type breakdown
     */
    async getSalesByPaymentType(options = {}) {
        const {
            departmentName = null,
            date = new Date(),
            useCache = true
        } = options;

        const cacheKey = `payment_types_${departmentName}_${date.toISOString().split('T')[0]}`;

        // Check cache
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                debug('📊 Using cached payment types');
                return cached.data;
            }
        }

        try {
            debug('📊 Fetching sales by payment type...');

            // Get all tickets
            const response = await graphqlRequest(GET_OPEN_TICKETS, {});
            const allTickets = response?.getTickets || [];

            // Filter and aggregate
            const paymentTypeMap = {};

            allTickets.forEach(ticket => {
                if (!ticket.payments || !Array.isArray(ticket.payments)) {
                    return;
                }

                ticket.payments.forEach(payment => {
                    const type = payment.paymentType || 'Sin especificar';
                    const amount = parseFloat(payment.amount) || 0;

                    if (!paymentTypeMap[type]) {
                        paymentTypeMap[type] = {
                            type,
                            count: 0,
                            total: 0
                        };
                    }

                    paymentTypeMap[type].count += 1;
                    paymentTypeMap[type].total += amount;
                });
            });

            // Convert to array
            const paymentTypes = Object.values(paymentTypeMap)
                .map(pt => ({
                    ...pt,
                    total: Math.round(pt.total * 100) / 100,
                    avgPayment: Math.round((pt.total / pt.count) * 100) / 100
                }))
                .sort((a, b) => b.total - a.total);

            debug('✅ Payment types calculated:', paymentTypes.length, 'types');

            // Cache result
            this.cache.set(cacheKey, {
                data: paymentTypes,
                timestamp: Date.now()
            });

            return paymentTypes;
        } catch (error) {
            debug('❌ Error getting payment types:', error);
            throw error;
        }
    }

    /**
     * Clear all caches
     */
    clearCache() {
        this.cache.clear();
        debug('🗑️ Report cache cleared');
    }
}

export default new ReportService();
