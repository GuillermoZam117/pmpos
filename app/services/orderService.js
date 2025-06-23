import { gql } from '@apollo/client';
import { client } from '../apollo';
import Debug from 'debug';

const debug = Debug('pmpos:order');

// GraphQL Mutations para gestión avanzada de órdenes
const ADD_ORDER_TO_TERMINAL_TICKET = gql`
  mutation AddOrderToTerminalTicket($terminalId: String!, $productName: String!, $quantity: Decimal!, $portion: String) {
    addOrderToTerminalTicket(
      terminalId: $terminalId,
      productName: $productName,
      quantity: $quantity,
      portion: $portion
    ) {
      id
      menuItemName
      quantity
      price
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

export const orderService = {
    /**
     * Añade una nueva orden al ticket del terminal
     */
    async addOrder(terminalId, productName, quantity = 1, portion = null) {
        debug('➕ Adding order:', { terminalId, productName, quantity, portion });
        try {
            const { data } = await client.mutate({
                mutation: ADD_ORDER_TO_TERMINAL_TICKET,
                variables: {
                    terminalId,
                    productName,
                    quantity: parseFloat(quantity),
                    ...(portion && { portion })
                }
            });
            debug('✅ Order added:', data.addOrderToTerminalTicket);
            return {
                success: true,
                order: data.addOrderToTerminalTicket
            };
        } catch (error) {
            debug('❌ Failed to add order:', error);
            throw new Error(`Error al agregar orden: ${error.message}`);
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
    }
};