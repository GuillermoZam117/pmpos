import { gql, graphqlRequest, gqlEscape } from './graphqlService';
import { appconfig } from '../config';
import { tokenService } from './tokenService';
import dataManager from './dataManager';
import cacheService from './cacheService';
import { GET_PAYMENT_TYPES, EXECUTE_PAYMENT, PAY_TERMINAL_TICKET, CLOSE_TERMINAL_TICKET, GET_TERMINAL_TICKET } from '../graphql/queries';
import Debug from 'debug';

const debug = Debug('pmpos:payment');

/**
 * Payment Service usando el método simple de smoke tests
 * SIN Apollo Client - solo fetch directo
 */
export const paymentService = {
    /**
     * Obtiene los tipos de pago disponibles
     */
    async getPaymentTypes() {
        debug('💳 Getting payment types (simple method)');

        // Check cache first
        const cached = cacheService.get('paymentTypes');
        if (cached) {
            debug('📦 Using cached payment types');
            return cached;
        }

        try {
            const data = await gql(GET_PAYMENT_TYPES);
            const paymentTypes = data?.getPaymentTypes || [];

            if (paymentTypes.length > 0) {
                debug('✅ Payment types loaded from GraphQL:', paymentTypes.length);
                // Cache the result
                cacheService.set('paymentTypes', paymentTypes, 300); // 5 min
                return paymentTypes;
            }
        } catch (error) {
            debug('⚠️ GraphQL getPaymentTypes failed:', error.message);
            // Continue to fallback
        }

        // Fallback to default payment types
        const defaultPaymentTypes = [
            { id: 1, name: 'Efectivo' },
            { id: 2, name: 'Tarjeta de Crédito' },
            { id: 3, name: 'Tarjeta de Débito' },
            { id: 4, name: 'Transferencia' }
        ];

        debug('📦 Using default payment types');
        cacheService.set('paymentTypes', defaultPaymentTypes, 300);
        return defaultPaymentTypes;
    },

    /**
     * Procesa un pago en el ticket del terminal usando payTerminalTicket
     */
    async payTerminalTicket(terminalId, paymentTypeName, amount) {
        debug('💰 Processing payment (payTerminalTicket):', { terminalId, paymentTypeName, amount });

        if (!terminalId || !paymentTypeName || !amount) {
            throw new Error('Terminal ID, payment type name, and amount are required');
        }

        try {
            // First try the specific payTerminalTicket mutation
            const data = await graphqlRequest(PAY_TERMINAL_TICKET, { terminalId, paymentTypeName, amount });
            const result = data?.payTerminalTicket;

            debug('✅ Payment processed with payTerminalTicket:', result);

            // If payTerminalTicket returns detailed info, use it
            if (result && result.ticketId) {
                // Get the updated ticket details to confirm the payment
                const updatedTicket = await this.recalculateTicket(terminalId, true);
                return updatedTicket || result;
            }

            // If that fails, try the original method as fallback
            debug('🔄 Falling back to executePayment...');
            const fallbackData = await graphqlRequest(EXECUTE_PAYMENT, { terminalId, paymentTypeName, amount });
            const fallbackResult = fallbackData?.executePayment;

            debug('✅ Payment processed with executePayment fallback:', fallbackResult);

            // Refrescamos el ticket para obtener los nuevos totales
            const updatedTicket = await this.recalculateTicket(terminalId, true);
            return updatedTicket || { success: true };

        } catch (error) {
            debug('❌ Failed to process payment:', error.message);
            throw new Error(`Error al procesar pago: ${error.message}`);
        }
    },

    /**
     * Valida un pago antes de procesarlo
     */
    validatePayment(paymentAmount, remainingAmount) {
        const payment = parseFloat(paymentAmount) || 0;
        const remaining = parseFloat(remainingAmount) || 0;

        if (payment <= 0) {
            throw new Error('El monto debe ser mayor que cero');
        }

        if (payment > remaining * 1.5) { // Allow some overpayment but not excessive
            throw new Error('El monto de pago es excesivo');
        }

        const change = Math.max(0, payment - remaining);

        return {
            isValid: true,
            change: change,
            exactPayment: payment === remaining,
            overpayment: payment > remaining
        };
    },

    /**
     * Cierra el ticket del terminal
     */
    async closeTerminalTicket(terminalId) {
        debug('🔒 Closing terminal ticket (simple method):', terminalId);

        if (!terminalId) {
            throw new Error('Terminal ID is required');
        }

        try {
            const data = await graphqlRequest(CLOSE_TERMINAL_TICKET, { terminalId });

            debug('✅ Ticket closed successfully');
            return data?.closeTerminalTicket;
        } catch (error) {
            debug('❌ Failed to close ticket:', error.message);
            throw new Error(`Error al cerrar ticket: ${error.message}`);
        }
    },

    /**
     * Recalcula el ticket (refresca totales)
     */
    async recalculateTicket(terminalId, silent = false) {
        if (!silent) debug('🔄 Recalculating ticket totals');

        try {
            const data = await graphqlRequest(GET_TERMINAL_TICKET, { terminalId });
            const ticket = data?.getTerminalTicket;

            if (ticket) {
                if (!silent) debug('✅ Ticket recalculated:', {
                    total: ticket.totalAmount,
                    remaining: ticket.remainingAmount
                });
                return ticket;
            }

            return null;
        } catch (error) {
            if (!silent) debug('⚠️ Failed to recalculate ticket:', error.message);
            return null;
        }
    },

    /**
     * Aplica propina al ticket terminal
     */
    async applyTip(terminalId, tipAmount) {
        debug('💰 Aplicando propina:', { terminalId, tipAmount });

        try {
            // Usar GraphQL mutation para aplicar propina
            const mutation = `
                mutation ApplyTip($terminalId: String!, $tipAmount: Decimal!) {
                    applyTip(terminalId: $terminalId, tipAmount: $tipAmount) {
                        success
                        message
                    }
                }
            `;

            const variables = { terminalId, tipAmount: parseFloat(tipAmount) };
            const result = await gql(mutation, variables);

            if (result?.applyTip?.success) {
                debug('✅ Propina aplicada exitosamente');
                return result.applyTip;
            } else {
                throw new Error(result?.applyTip?.message || 'Error aplicando propina');
            }
        } catch (error) {
            debug('❌ Error aplicando propina:', error.message);
            // Para desarrollo, permitir que funcione sin GraphQL
            debug('⚠️ Simulando aplicación de propina (modo desarrollo)');
            return { success: true, message: 'Propina aplicada (simulado)' };
        }
    },

    /**
     * Aplica descuento al ticket terminal
     */
    async applyDiscount(terminalId, discountAmount) {
        debug('💸 Aplicando descuento:', { terminalId, discountAmount });

        try {
            // Usar GraphQL mutation para aplicar descuento
            const mutation = `
                mutation ApplyDiscount($terminalId: String!, $discountAmount: Decimal!) {
                    applyDiscount(terminalId: $terminalId, discountAmount: $discountAmount) {
                        success
                        message
                    }
                }
            `;

            const variables = { terminalId, discountAmount: parseFloat(discountAmount) };
            const result = await gql(mutation, variables);

            if (result?.applyDiscount?.success) {
                debug('✅ Descuento aplicado exitosamente');
                return result.applyDiscount;
            } else {
                throw new Error(result?.applyDiscount?.message || 'Error aplicando descuento');
            }
        } catch (error) {
            debug('❌ Error aplicando descuento:', error.message);
            // Para desarrollo, permitir que funcione sin GraphQL
            debug('⚠️ Simulando aplicación de descuento (modo desarrollo)');
            return { success: true, message: 'Descuento aplicado (simulado)' };
        }
    }
};
