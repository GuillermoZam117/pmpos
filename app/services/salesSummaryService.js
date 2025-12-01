/**
 * Sales Summary Service
 * Provides sales analytics and summary data for the current shift
 */

import { graphqlRequest } from './graphqlService';
import { GET_OPEN_TICKETS } from '../graphql/queries';
import Debug from 'debug';

const debug = Debug('pmpos:sales-summary');

class SalesSummaryService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 60000; // 1 minute cache
    }

    /**
     * Get sales summary for today (or custom date range)
     */
    async getSalesSummary(options = {}) {
        const {
            departmentName = null,
            startDate = null,
            endDate = null,
            useCache = true
        } = options;

        const cacheKey = `summary_${departmentName}_${startDate}_${endDate}`;

        // Check cache
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                debug('📊 Using cached sales summary');
                return cached.data;
            }
        }

        try {
            debug('📊 Fetching sales summary...');

            // Get all tickets (open only - will need filtering for closed)
            const response = await graphqlRequest(GET_OPEN_TICKETS, {});
            const allTickets = response?.getTickets || [];

            // Filter tickets
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const filteredTickets = allTickets.filter(ticket => {
                // Filter by date
                const ticketDate = ticket.date ? new Date(ticket.date) : null;
                if (!ticketDate) return false;

                const isToday = ticketDate >= today;
                if (!isToday && !startDate) return false;

                // Filter by department if specified
                if (departmentName && ticket.departmentName !== departmentName) {
                    return false;
                }

                // Filter by closed status
                return ticket.isClosed === true;
            });

            // Calculate summary
            const summary = {
                ticketCount: filteredTickets.length,
                totalSales: 0,
                avgTicket: 0,
                totalTax: 0,
                totalPayments: 0,
                totalRemaining: 0,
                byPaymentType: {},
                byUser: {},
                period: {
                    start: startDate || today.toISOString(),
                    end: endDate || new Date().toISOString()
                }
            };

            filteredTickets.forEach(ticket => {
                const total = parseFloat(ticket.totalAmount) || 0;
                const tax = parseFloat(ticket.taxTotal) || 0;
                const paid = parseFloat(ticket.paymentAmount) || 0;
                const remaining = parseFloat(ticket.remainingAmount) || 0;

                summary.totalSales += total;
                summary.totalTax += tax;
                summary.totalPayments += paid;
                summary.totalRemaining += remaining;

                // Group by payment type
                if (ticket.payments && Array.isArray(ticket.payments)) {
                    ticket.payments.forEach(payment => {
                        const type = payment.paymentType || 'Sin especificar';
                        const amount = parseFloat(payment.amount) || 0;

                        if (!summary.byPaymentType[type]) {
                            summary.byPaymentType[type] = {
                                count: 0,
                                total: 0
                            };
                        }

                        summary.byPaymentType[type].count++;
                        summary.byPaymentType[type].total += amount;
                    });
                }

                // Group by user
                const user = ticket.userName || 'Desconocido';
                if (!summary.byUser[user]) {
                    summary.byUser[user] = {
                        count: 0,
                        total: 0
                    };
                }
                summary.byUser[user].count++;
                summary.byUser[user].total += total;
            });

            // Calculate average
            summary.avgTicket = summary.ticketCount > 0
                ? summary.totalSales / summary.ticketCount
                : 0;

            // Round values
            summary.totalSales = Math.round(summary.totalSales * 100) / 100;
            summary.totalTax = Math.round(summary.totalTax * 100) / 100;
            summary.totalPayments = Math.round(summary.totalPayments * 100) / 100;
            summary.totalRemaining = Math.round(summary.totalRemaining * 100) / 100;
            summary.avgTicket = Math.round(summary.avgTicket * 100) / 100;

            debug('✅ Sales summary calculated:', summary);

            // Cache result
            this.cache.set(cacheKey, {
                data: summary,
                timestamp: Date.now()
            });

            return summary;
        } catch (error) {
            debug('❌ Error getting sales summary:', error);
            throw error;
        }
    }

    /**
     * Get quick summary (just totals, no breakdown)
     */
    async getQuickSummary(departmentName = null) {
        try {
            const summary = await this.getSalesSummary({ departmentName, useCache: true });
            return {
                count: summary.ticketCount,
                total: summary.totalSales,
                avg: summary.avgTicket
            };
        } catch (error) {
            debug('❌ Error getting quick summary:', error);
            return {
                count: 0,
                total: 0,
                avg: 0
            };
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        debug('🗑️ Sales summary cache cleared');
    }

    /**
     * Get sales summary from SQL read service (faster, if available)
     */
    async getSalesSummaryFromSQL(options = {}) {
        const {
            departmentName = null,
            date = null
        } = options;

        try {
            const targetDate = date || new Date().toISOString().split('T')[0];

            const params = new URLSearchParams();
            params.append('date', targetDate);
            if (departmentName) {
                params.append('department', departmentName);
            }

            const response = await fetch(`/api/sales-summary?${params.toString()}`);

            if (!response.ok) {
                throw new Error('SQL read service unavailable');
            }

            const data = await response.json();
            debug('✅ Sales summary from SQL:', data);

            return data;
        } catch (error) {
            debug('⚠️ SQL read service failed, falling back to GraphQL:', error);
            // Fallback to GraphQL
            return this.getSalesSummary(options);
        }
    }
}

export default new SalesSummaryService();
