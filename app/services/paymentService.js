import { gql } from '@apollo/client';
import { client } from '../apollo';
import Debug from 'debug';

const debug = Debug('pmpos:payment');

// GraphQL Queries
const GET_PAYMENT_TYPES = gql`
  query GetPaymentTypes($userRoleId: Int) {
    getPaymentTypes(userRoleId: $userRoleId) {
      id
      name
    }
  }
`;

// GraphQL Mutations
const PAY_TERMINAL_TICKET = gql`
  mutation PayTerminalTicket($terminalId: String!, $paymentTypeName: String!, $amount: Decimal!) {
    payTerminalTicket(
      terminalId: $terminalId,
      paymentTypeName: $paymentTypeName,
      amount: $amount
    ) {
      id
      remainingAmount
      totalAmount
    }
  }
`;

const ADD_CALCULATION_TO_TERMINAL_TICKET = gql`
  mutation AddCalculationToTerminalTicket($terminalId: String!, $calculationName: String!, $amount: Decimal!) {
    addCalculationToTerminalTicket(
      terminalId: $terminalId,
      calculationName: $calculationName,
      amount: $amount
    ) {
      id
      totalAmount
      remainingAmount
    }
  }
`;

const RECALCULATE_TICKET = gql`
  mutation RecalculateTicket($terminalId: String!, $forceRecalculation: Boolean) {
    recalculateTicket(
      terminalId: $terminalId,
      forceRecalculation: $forceRecalculation
    ) {
      id
      totalAmount
      remainingAmount
    }
  }
`;

export const paymentService = {
    /**
     * Obtiene los tipos de pago disponibles
     */
    async getPaymentTypes(userRoleId = null) {
        debug('💳 Fetching payment types for user role:', userRoleId);
        try {
            const { data } = await client.query({
                query: GET_PAYMENT_TYPES,
                variables: userRoleId ? { userRoleId } : {},
                fetchPolicy: 'cache-first'
            });
            debug('✅ Payment types fetched:', data.getPaymentTypes);
            return data.getPaymentTypes;
        } catch (error) {
            debug('❌ Failed to fetch payment types:', error);
            // Fallback con tipos de pago por defecto
            return [
                { id: 1, name: 'Efectivo' },
                { id: 2, name: 'Tarjeta de Crédito' },
                { id: 3, name: 'Tarjeta de Débito' },
                { id: 4, name: 'Transferencia' }
            ];
        }
    },

    /**
     * Realiza un pago en el ticket del terminal
     */
    async payTicket(terminalId, paymentTypeName, amount) {
        debug('💰 Processing payment:', { terminalId, paymentTypeName, amount });
        try {
            const { data } = await client.mutate({
                mutation: PAY_TERMINAL_TICKET,
                variables: {
                    terminalId,
                    paymentTypeName,
                    amount: parseFloat(amount)
                }
            });
            debug('✅ Payment processed:', data.payTerminalTicket);
            return {
                success: true,
                ticket: data.payTerminalTicket
            };
        } catch (error) {
            debug('❌ Payment failed:', error);
            throw new Error(`Error al procesar el pago: ${error.message}`);
        }
    },

    /**
     * Añade un cálculo al ticket (descuento, propina, etc.)
     */
    async addCalculation(terminalId, calculationName, amount) {
        debug('🧮 Adding calculation:', { terminalId, calculationName, amount });
        try {
            const { data } = await client.mutate({
                mutation: ADD_CALCULATION_TO_TERMINAL_TICKET,
                variables: {
                    terminalId,
                    calculationName,
                    amount: parseFloat(amount)
                }
            });
            debug('✅ Calculation added:', data.addCalculationToTerminalTicket);
            return {
                success: true,
                ticket: data.addCalculationToTerminalTicket
            };
        } catch (error) {
            debug('❌ Failed to add calculation:', error);
            throw new Error(`Error al agregar cálculo: ${error.message}`);
        }
    },

    /**
     * Recalcula el ticket
     */
    async recalculateTicket(terminalId, forceRecalculation = false) {
        debug('🔄 Recalculating ticket:', { terminalId, forceRecalculation });
        try {
            const { data } = await client.mutate({
                mutation: RECALCULATE_TICKET,
                variables: {
                    terminalId,
                    forceRecalculation
                }
            });
            debug('✅ Ticket recalculated:', data.recalculateTicket);
            return {
                success: true,
                ticket: data.recalculateTicket
            };
        } catch (error) {
            debug('❌ Failed to recalculate ticket:', error);
            throw new Error(`Error al recalcular ticket: ${error.message}`);
        }
    },

    /**
     * Aplica un descuento al ticket
     */
    async applyDiscount(terminalId, discountType, discountValue) {
        debug('💸 Applying discount:', { terminalId, discountType, discountValue });
        
        const calculationName = discountType === 'percentage' 
            ? `Descuento ${discountValue}%`
            : `Descuento $${discountValue}`;
        
        const calculationAmount = discountType === 'percentage'
            ? -(discountValue / 100) // Negative percentage
            : -Math.abs(discountValue); // Negative fixed amount
        
        return await this.addCalculation(terminalId, calculationName, calculationAmount);
    },

    /**
     * Aplica una propina al ticket
     */
    async applyTip(terminalId, tipAmount) {
        debug('💡 Applying tip:', { terminalId, tipAmount });
        return await this.addCalculation(terminalId, 'Propina', Math.abs(tipAmount));
    },

    /**
     * Calcula el cambio para un pago
     */
    calculateChange(totalAmount, paidAmount) {
        const change = parseFloat(paidAmount) - parseFloat(totalAmount);
        return Math.max(0, change);
    },

    /**
     * Valida si se puede procesar un pago
     */
    validatePayment(amount, remainingAmount) {
        const paymentAmount = parseFloat(amount);
        const remaining = parseFloat(remainingAmount);
        
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            throw new Error('El monto del pago debe ser mayor a 0');
        }
        
        if (paymentAmount > remaining) {
            return {
                isValid: true,
                isOverpayment: true,
                change: paymentAmount - remaining
            };
        }
        
        return {
            isValid: true,
            isOverpayment: false,
            change: 0
        };
    },

    /**
     * Procesa un pago completo (función principal)
     */
    async processPayment(terminalId, paymentTypeName, amount, discounts = [], tips = []) {
        debug('🏦 Processing complete payment:', { terminalId, paymentTypeName, amount, discounts, tips });
        
        try {
            // 1. Aplicar descuentos si los hay
            for (const discount of discounts) {
                await this.applyDiscount(terminalId, discount.type, discount.value);
            }
            
            // 2. Aplicar propinas si las hay
            for (const tip of tips) {
                await this.applyTip(terminalId, tip.amount);
            }
            
            // 3. Recalcular ticket después de descuentos/propinas
            await this.recalculateTicket(terminalId, true);
            
            // 4. Procesar el pago
            const paymentResult = await this.payTicket(terminalId, paymentTypeName, amount);
            
            debug('✅ Complete payment processed successfully');
            return paymentResult;
            
        } catch (error) {
            debug('❌ Complete payment failed:', error);
            throw error;
        }
    },

    /**
     * Calcula el total de una lista de orders
     */
    calculateTotal(orders) {
        if (!Array.isArray(orders)) {
            debug('⚠️ calculateTotal: orders is not an array:', orders);
            return 0;
        }
        
        const total = orders.reduce((sum, order) => {
            const quantity = Number(order.quantity) || 0;
            const price = Number(order.price) || 0;
            return sum + (quantity * price);
        }, 0);
        
        debug('💰 Calculated total:', { orders: orders.length, total });
        return total;
    }
};

// Función de conveniencia para acceso directo
export const processPayment = paymentService.processPayment.bind(paymentService);
export const calculateTotal = paymentService.calculateTotal.bind(paymentService); 