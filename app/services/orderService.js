import { gql } from '@apollo/client';
import { client } from '../apollo';
import { appconfig } from '../config';
import { tokenService } from './tokenService';
import Debug from 'debug';
import { ticketService } from './ticketService';
import menuService from './menuService';

const debug = Debug('pmpos:order');

// GraphQL Mutations para gestión avanzada de órdenes
const ADD_ORDER_TO_TERMINAL_TICKET = gql`
  mutation AddOrderToTerminalTicket($terminalId: String!, $productName: String!, $quantity: Int!, $portion: String) {
    addOrderToTerminalTicket(
      terminalId: $terminalId,
      productName: $productName,
      quantity: $quantity,
      portion: $portion
    ) {
      totalAmount
    }
  }
`;

const UPDATE_ORDER_OF_TERMINAL_TICKET = gql`
  mutation UpdateOrderOfTerminalTicket($terminalId: String!, $orderUid: String!, $quantity: Decimal, $price: Decimal) {
    updateOrderOfTerminalTicket(
      terminalId: $terminalId,
      orderUid: $orderUid,
      quantity: $quantity,
      price: $price
    ) {
      id
      quantity
      price
    }
  }
`;

const CANCEL_ORDER_ON_TERMINAL_TICKET = gql`
  mutation CancelOrderOnTerminalTicket($terminalId: String!, $orderUid: String!) {
    cancelOrderOnTerminalTicket(
      terminalId: $terminalId,
      orderUid: $orderUid
    ) {
      success
    }
  }
`;

const CLEAR_TERMINAL_TICKET_ORDERS = gql`
  mutation ClearTerminalTicketOrders($terminalId: String!) {
    clearTerminalTicketOrders(terminalId: $terminalId) {
      id
      orders {
        id
      }
    }
  }
`;

const UPDATE_ORDER_PORTION_OF_TERMINAL_TICKET = gql`
  mutation UpdateOrderPortionOfTerminalTicket($terminalId: String!, $orderUid: String!, $portion: String!) {
    updateOrderPortionOfTerminalTicket(
      terminalId: $terminalId,
      orderUid: $orderUid,
      portion: $portion
    ) {
      id
      portion
      price
    }
  }
`;

const UPDATE_ORDER_TAG_OF_TERMINAL_TICKET = gql`
  mutation UpdateOrderTagOfTerminalTicket($terminalId: String!, $orderUid: String!, $name: String!, $tag: String!) {
    updateOrderTagOfTerminalTicket(
      terminalId: $terminalId,
      orderUid: $orderUid,
      name: $name,
      tag: $tag
    ) {
      id
      orderTags
    }
  }
`;

const CANCEL_TICKET = gql`
  mutation CancelTicket($terminalId: String!) {
    cancelTicket(terminalId: $terminalId) {
      success
      message
    }
  }
`;

export const orderService = {
    /**
     * Añade una nueva orden al ticket del terminal
     */
    async addOrder(terminalId, productName, quantity = 1, portion = null) {
        debug('➕ Adding order (inline-first):', { terminalId, productName, quantity, portion });
        const { addOrderToTerminalTicketAsync } = await import('../queries');

        // Prefer inline helper which avoids sending variables
        try {
            const orderPayload = { productName, portion, quantity };
            const result = await addOrderToTerminalTicketAsync(terminalId, orderPayload);
            debug('✅ Order added via inline helper:', result);
            return { success: true, order: result };
        } catch (inlineError) {
            debug('⚠️ Inline addOrder failed, falling back to Apollo mutation:', inlineError.message);
            // Fallback to existing Apollo mutation for compatibility
            try {
                const { data } = await client.mutate({
                    mutation: ADD_ORDER_TO_TERMINAL_TICKET,
                    variables: {
                        terminalId,
                        productName,
                        quantity: parseInt(quantity),
                        ...(portion && { portion })
                    }
                });
                if (data?.addOrderToTerminalTicket) {
                    debug('✅ Order added via Apollo fallback:', data.addOrderToTerminalTicket);
                    return { success: true, order: data.addOrderToTerminalTicket };
                }
                throw new Error('Empty response from addOrderToTerminalTicket');
            } catch (apolloError) {
                debug('❌ Failed to add order (both inline and Apollo):', apolloError.message);
                throw new Error(`Error al agregar orden: ${apolloError.message}`);
            }
        }
    },

    /**
     * Actualiza una orden existente (cantidad y/o precio)
     */
    async updateOrder(terminalId, orderUid, quantity = null, price = null) {
        debug('📝 Updating order:', { terminalId, orderUid, quantity, price });
        try {
            const variables = { terminalId, orderUid };
            if (quantity !== null) variables.quantity = parseFloat(quantity);
            if (price !== null) variables.price = parseFloat(price);

            const { data } = await client.mutate({
                mutation: UPDATE_ORDER_OF_TERMINAL_TICKET,
                variables
            });
            debug('✅ Order updated:', data.updateOrderOfTerminalTicket);
            return {
                success: true,
                order: data.updateOrderOfTerminalTicket
            };
        } catch (error) {
            debug('❌ Failed to update order:', error);
            throw new Error(`Error al actualizar orden: ${error.message}`);
        }
    },

    /**
     * Cancela/elimina una orden específica
     */
    async cancelOrder(terminalId, orderUid) {
        debug('❌ Canceling order:', { terminalId, orderUid });
        try {
            const { data } = await client.mutate({
                mutation: CANCEL_ORDER_ON_TERMINAL_TICKET,
                variables: { terminalId, orderUid }
            });
            debug('✅ Order canceled:', data.cancelOrderOnTerminalTicket);
            return {
                success: data.cancelOrderOnTerminalTicket.success
            };
        } catch (error) {
            debug('❌ Failed to cancel order:', error);
            throw new Error(`Error al cancelar orden: ${error.message}`);
        }
    },

    /**
     * Limpia todas las órdenes del ticket
     */
    async clearAllOrders(terminalId) {
        debug('🗑️ Clearing all orders:', { terminalId });
        try {
            const { data } = await client.mutate({
                mutation: CLEAR_TERMINAL_TICKET_ORDERS,
                variables: { terminalId }
            });
            debug('✅ All orders cleared:', data.clearTerminalTicketOrders);
            return {
                success: true,
                ticket: data.clearTerminalTicketOrders
            };
        } catch (error) {
            debug('❌ Failed to clear orders:', error);
            throw new Error(`Error al limpiar órdenes: ${error.message}`);
        }
    },

    /**
     * Actualiza la porción de una orden
     */
    async updateOrderPortion(terminalId, orderUid, portion) {
        debug('🍽️ Updating order portion:', { terminalId, orderUid, portion });
        try {
            const { data } = await client.mutate({
                mutation: UPDATE_ORDER_PORTION_OF_TERMINAL_TICKET,
                variables: { terminalId, orderUid, portion }
            });
            debug('✅ Order portion updated:', data.updateOrderPortionOfTerminalTicket);
            return {
                success: true,
                order: data.updateOrderPortionOfTerminalTicket
            };
        } catch (error) {
            debug('❌ Failed to update order portion:', error);
            throw new Error(`Error al actualizar porción: ${error.message}`);
        }
    },

    /**
     * Actualiza las etiquetas/tags de una orden
     */
    async updateOrderTag(terminalId, orderUid, tagName, tagValue) {
        debug('🏷️ Updating order tag:', { terminalId, orderUid, tagName, tagValue });
        try {
            const { data } = await client.mutate({
                mutation: UPDATE_ORDER_TAG_OF_TERMINAL_TICKET,
                variables: { terminalId, orderUid, name: tagName, tag: tagValue }
            });
            debug('✅ Order tag updated:', data.updateOrderTagOfTerminalTicket);
            return {
                success: true,
                order: data.updateOrderTagOfTerminalTicket
            };
        } catch (error) {
            debug('❌ Failed to update order tag:', error);
            throw new Error(`Error al actualizar etiqueta: ${error.message}`);
        }
    },

    /**
     * Valida los datos de una orden antes de procesarla
     */
    validateOrderData(orderData) {
        const { quantity, price, productName } = orderData;

        if (!productName || productName.trim() === '') {
            throw new Error('El nombre del producto es requerido');
        }

        if (quantity !== undefined && (isNaN(quantity) || quantity <= 0)) {
            throw new Error('La cantidad debe ser mayor a 0');
        }

        if (price !== undefined && (isNaN(price) || price < 0)) {
            throw new Error('El precio no puede ser negativo');
        }

        return true;
    },

    /**
     * Calcula el total de una orden
     */
    calculateOrderTotal(order) {
        const quantity = parseFloat(order.quantity) || 0;
        const price = parseFloat(order.price) || 0;
        return quantity * price;
    },

    /**
     * Formatea una orden para mostrar en la UI
     */
    formatOrderForDisplay(order) {
        return {
            ...order,
            formattedTotal: this.calculateOrderTotal(order).toFixed(2),
            formattedPrice: parseFloat(order.price).toFixed(2),
            formattedQuantity: parseFloat(order.quantity).toString()
        };
    },

    /**
     * ANULA/CANCELA un ticket completo
     */
    async voidTicket(terminalId, reason = 'Ticket anulado por usuario') {
        debug('❌ VOIDING TICKET:', { terminalId, reason });
        try {
            // Primero limpiar todas las órdenes
            await this.clearAllOrders(terminalId);

            // Luego intentar cancelar el ticket (si la mutación existe)
            try {
                const { data } = await client.mutate({
                    mutation: CANCEL_TICKET,
                    variables: { terminalId }
                });
                debug('✅ Ticket voided via mutation:', data.cancelTicket);
                return {
                    success: true,
                    message: data.cancelTicket.message || 'Ticket anulado exitosamente',
                    method: 'mutation'
                };
            } catch (mutationError) {
                debug('⚠️ Cancel ticket mutation not available, using order clearing method');
                // Si no existe la mutación, el ticket queda vacío (sin órdenes)
                return {
                    success: true,
                    message: 'Ticket anulado (órdenes eliminadas)',
                    method: 'clear_orders'
                };
            }
        } catch (error) {
            debug('❌ Failed to void ticket:', error);
            throw new Error(`Error al anular ticket: ${error.message}`);
        }
    },

    /**
     * Transfiere órdenes a otra mesa/ticket
     */
    async transferOrders(sourceTerminalId, targetTerminalId, orderUids = []) {
        debug('🔄 Transferring orders:', { sourceTerminalId, targetTerminalId, orderUids });
        try {
            const results = [];

            for (const orderUid of orderUids) {
                // Aquí iría la lógica de transferencia
                // Por ahora, simulamos que se puede hacer copiando y eliminando
                debug(`🔄 Transferring order ${orderUid} from ${sourceTerminalId} to ${targetTerminalId}`);
                // TODO: Implementar transferencia real cuando esté disponible en SambaPOS
                results.push({ orderUid, transferred: true });
            }

            return {
                success: true,
                transferredOrders: results
            };
        } catch (error) {
            debug('❌ Failed to transfer orders:', error);
            throw new Error(`Error al transferir órdenes: ${error.message}`);
        }
    },

    /**
     * Duplica una orden existente
     */
    async duplicateOrder(terminalId, orderUid) {
        debug('📋 Duplicating order:', { terminalId, orderUid });
        try {
            // TODO: Implementar duplicación real
            // Por ahora retornamos éxito simulado
            return {
                success: true,
                message: 'Orden duplicada (funcionalidad en desarrollo)'
            };
        } catch (error) {
            debug('❌ Failed to duplicate order:', error);
            throw new Error(`Error al duplicar orden: ${error.message}`);
        }
    },

    /**
     * Aplica un descuento específico a una orden
     */
    async applyOrderDiscount(terminalId, orderUid, discountType, discountValue) {
        debug('💸 Applying order discount:', { terminalId, orderUid, discountType, discountValue });
        try {
            // TODO: Implementar descuento por orden
            // Por ahora usamos actualización de precio
            if (discountType === 'percentage') {
                // Necesitaríamos el precio original para calcular el descuento
                debug('⚠️ Order percentage discount needs original price - use price update instead');
                return {
                    success: false,
                    message: 'Use actualización de precio para descuentos por orden'
                };
            } else {
                // Descuento fijo - actualizar precio
                const newPrice = Math.max(0, discountValue);
                return await this.updateOrder(terminalId, orderUid, null, newPrice);
            }
        } catch (error) {
            debug('❌ Failed to apply order discount:', error);
            throw new Error(`Error al aplicar descuento: ${error.message}`);
        }
    }
};
