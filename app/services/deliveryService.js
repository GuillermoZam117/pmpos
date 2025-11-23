/**
 * Delivery Service
 * Manages delivery status updates and workflow
 */

import { graphqlRequest } from './graphqlService';
import { UPDATE_TICKET_STATE } from '../graphql/queries';
import Debug from 'debug';

const debug = Debug('pmpos:delivery-service');

class DeliveryService {
    constructor() {
        this.statusWorkflow = {
            'NUEVO': ['PREPARANDO', 'CANCELADO'],
            'EN PROCESO': ['LISTO', 'CANCELADO'],
            'PREPARANDO': ['LISTO', 'CANCELADO'],
            'LISTO': ['EN RUTA', 'CANCELADO'],
            'EN RUTA': ['ENTREGADO', 'CANCELADO'],
            'ENTREGADO': ['PAGADO'],
            'PAGADO': [],
            'CANCELADO': []
        };

        this.statusLabels = {
            'NUEVO': 'Nuevo',
            'EN PROCESO': 'En Proceso',
            'PREPARANDO': 'Preparando',
            'LISTO': 'Listo',
            'EN RUTA': 'En Ruta',
            'ENTREGADO': 'Entregado',
            'PAGADO': 'Pagado',
            'CANCELADO': 'Cancelado'
        };

        this.statusColors = {
            'NUEVO': 'info',
            'EN PROCESO': 'warning',
            'PREPARANDO': 'warning',
            'LISTO': 'success',
            'EN RUTA': 'primary',
            'ENTREGADO': 'success',
            'PAGADO': 'default',
            'CANCELADO': 'error'
        };
    }

    /**
     * Update delivery ticket status
     * @param {string} ticketId - Ticket ID
     * @param {string} newStatus - New status
     * @param {string} stateName - State name (default: 'Status')
     * @returns {Promise<boolean>}
     */
    async updateTicketStatus(ticketId, newStatus, stateName = 'Status') {
        try {
            debug(`📦 Updating ticket ${ticketId} to status: ${newStatus}`);

            // Use GraphQL mutation to update ticket state
            const result = await graphqlRequest(UPDATE_TICKET_STATE, {
                ticketId: parseInt(ticketId),
                stateName: stateName,
                state: newStatus
            });

            debug('✅ Ticket status updated successfully:', result);
            return true;
        } catch (error) {
            debug('❌ Error updating ticket status:', error);
            throw error;
        }
    }

    /**
     * Get available transitions for current status
     * @param {string} currentStatus - Current status
     * @returns {Array} Available next statuses
     */
    getAvailableTransitions(currentStatus) {
        const normalized = (currentStatus || 'NUEVO').toUpperCase();
        return this.statusWorkflow[normalized] || [];
    }

    /**
     * Get status label
     * @param {string} status - Status code
     * @returns {string} Label
     */
    getStatusLabel(status) {
        return this.statusLabels[status] || status;
    }

    /**
     * Get status color
     * @param {string} status - Status code
     * @returns {string} MUI color
     */
    getStatusColor(status) {
        return this.statusColors[status] || 'default';
    }

    /**
     * Check if status transition is valid
     * @param {string} fromStatus - Current status
     * @param {string} toStatus - Target status
     * @returns {boolean}
     */
    isValidTransition(fromStatus, toStatus) {
        const available = this.getAvailableTransitions(fromStatus);
        return available.includes(toStatus);
    }

    /**
     * Get quick action buttons for status
     * @param {string} currentStatus - Current status
     * @returns {Array} Quick action buttons config
     */
    getQuickActions(currentStatus) {
        const normalized = (currentStatus || 'NUEVO').toUpperCase();
        const actions = [];

        switch (normalized) {
            case 'NUEVO':
            case 'EN PROCESO':
                actions.push({
                    status: 'PREPARANDO',
                    label: 'Preparando',
                    color: 'warning',
                    icon: 'kitchen'
                });
                actions.push({
                    status: 'LISTO',
                    label: 'Listo',
                    color: 'success',
                    icon: 'check'
                });
                break;

            case 'PREPARANDO':
                actions.push({
                    status: 'LISTO',
                    label: 'Marcar Listo',
                    color: 'success',
                    icon: 'check'
                });
                break;

            case 'LISTO':
                actions.push({
                    status: 'EN RUTA',
                    label: 'En Ruta',
                    color: 'primary',
                    icon: 'delivery'
                });
                break;

            case 'EN RUTA':
                actions.push({
                    status: 'ENTREGADO',
                    label: 'Entregado',
                    color: 'success',
                    icon: 'done_all'
                });
                break;

            case 'ENTREGADO':
                actions.push({
                    status: 'PAGADO',
                    label: 'Pagado',
                    color: 'default',
                    icon: 'payment'
                });
                break;
        }

        return actions;
    }
}

export default new DeliveryService();
