import { gql } from '@apollo/client';
import { client } from '../apollo';
import Debug from 'debug';

const debug = Debug('pmpos:automation');

// GraphQL Mutations para automatización y eventos
const NOTIFY_TERMINAL_TICKET_EVENT = gql`
  mutation NotifyTerminalTicketEvent($terminalId: String!, $name: String!, $parameters: [ParameterInput]) {
    notifyTerminalTicketEvent(
      terminalId: $terminalId,
      name: $name,
      parameters: $parameters
    ) {
      success
    }
  }
`;

const EXECUTE_AUTOMATION_COMMAND_FOR_TERMINAL_TICKET = gql`
  mutation ExecuteAutomationCommandForTerminalTicket($terminalId: String!, $name: String!, $value: String) {
    executeAutomationCommandForTerminalTicket(
      terminalId: $terminalId,
      name: $name,
      value: $value
    ) {
      success
    }
  }
`;

const UPDATE_ENTITY_STATE = gql`
  mutation UpdateEntityState($entityTypeName: String!, $entityName: String!, $stateName: String!, $state: String!) {
    updateEntityState(
      entityTypeName: $entityTypeName,
      entityName: $entityName,
      stateName: $stateName,
      state: $state
    ) {
      success
    }
  }
`;

// GraphQL Queries para verificar entidades
const IS_ENTITY_EXISTS = gql`
  query IsEntityExists($type: String!, $name: String!) {
    isEntityExists(type: $type, name: $name)
  }
`;

const GET_ENTITY = gql`
  query GetEntity($type: String!, $name: String!) {
    getEntity(type: $type, name: $name) {
      id
      name
      customData
      states {
        stateName
        state
        stateValue
      }
    }
  }
`;

const GET_ENTITIES = gql`
  query GetEntities($type: String!, $search: String, $state: String) {
    getEntities(type: $type, search: $search, state: $state) {
      id
      name
      customData
      states {
        stateName
        state
        stateValue
      }
    }
  }
`;

export const automationService = {
    /**
     * Notifica un evento de ticket al sistema
     */
    async notifyTicketEvent(terminalId, eventName, parameters = []) {
        debug('📢 Notifying ticket event:', { terminalId, eventName, parameters });
        try {
            const { data } = await client.mutate({
                mutation: NOTIFY_TERMINAL_TICKET_EVENT,
                variables: {
                    terminalId,
                    name: eventName,
                    parameters: parameters.map(param => ({
                        name: param.name,
                        value: param.value?.toString() || ''
                    }))
                }
            });
            debug('✅ Event notified:', data.notifyTerminalTicketEvent);
            return {
                success: data.notifyTerminalTicketEvent.success
            };
        } catch (error) {
            debug('❌ Failed to notify event:', error);
            throw new Error(`Error al notificar evento: ${error.message}`);
        }
    },

    /**
     * Ejecuta un comando de automatización en el ticket
     */
    async executeAutomationCommand(terminalId, commandName, value = '') {
        debug('🤖 Executing automation command:', { terminalId, commandName, value });
        try {
            const { data } = await client.mutate({
                mutation: EXECUTE_AUTOMATION_COMMAND_FOR_TERMINAL_TICKET,
                variables: {
                    terminalId,
                    name: commandName,
                    value: value?.toString() || ''
                }
            });
            debug('✅ Automation command executed:', data.executeAutomationCommandForTerminalTicket);
            return {
                success: data.executeAutomationCommandForTerminalTicket.success
            };
        } catch (error) {
            debug('❌ Failed to execute automation command:', error);
            throw new Error(`Error al ejecutar comando: ${error.message}`);
        }
    },

    /**
     * Actualiza el estado de una entidad
     */
    async updateEntityState(entityTypeName, entityName, stateName, state) {
        debug('🔄 Updating entity state:', { entityTypeName, entityName, stateName, state });
        try {
            const { data } = await client.mutate({
                mutation: UPDATE_ENTITY_STATE,
                variables: {
                    entityTypeName,
                    entityName,
                    stateName,
                    state
                }
            });
            debug('✅ Entity state updated:', data.updateEntityState);
            return {
                success: data.updateEntityState.success
            };
        } catch (error) {
            debug('❌ Failed to update entity state:', error);
            throw new Error(`Error al actualizar estado: ${error.message}`);
        }
    },

    /**
     * Verifica si una entidad existe
     */
    async entityExists(type, name) {
        debug('🔍 Checking if entity exists:', { type, name });
        try {
            const { data } = await client.query({
                query: IS_ENTITY_EXISTS,
                variables: { type, name },
                fetchPolicy: 'no-cache'
            });
            debug('✅ Entity existence checked:', data.isEntityExists);
            return data.isEntityExists;
        } catch (error) {
            debug('❌ Failed to check entity existence:', error);
            throw new Error(`Error al verificar entidad: ${error.message}`);
        }
    },

    /**
     * Obtiene información de una entidad específica
     */
    async getEntity(type, name) {
        debug('📋 Getting entity:', { type, name });
        try {
            const { data } = await client.query({
                query: GET_ENTITY,
                variables: { type, name },
                fetchPolicy: 'no-cache'
            });
            debug('✅ Entity retrieved:', data.getEntity);
            return data.getEntity;
        } catch (error) {
            debug('❌ Failed to get entity:', error);
            throw new Error(`Error al obtener entidad: ${error.message}`);
        }
    },

    /**
     * Obtiene una lista de entidades filtradas
     */
    async getEntities(type, search = null, state = null) {
        debug('📋 Getting entities:', { type, search, state });
        try {
            const variables = { type };
            if (search) variables.search = search;
            if (state) variables.state = state;

            const { data } = await client.query({
                query: GET_ENTITIES,
                variables,
                fetchPolicy: 'no-cache'
            });
            debug('✅ Entities retrieved:', data.getEntities);
            return data.getEntities;
        } catch (error) {
            debug('❌ Failed to get entities:', error);
            throw new Error(`Error al obtener entidades: ${error.message}`);
        }
    },

    /**
     * Eventos predefinidos del sistema
     */
    events: {
        TICKET_CREATED: 'TicketCreated',
        TICKET_CLOSED: 'TicketClosed',
        ORDER_ADDED: 'OrderAdded',
        ORDER_CANCELLED: 'OrderCancelled',
        PAYMENT_PROCESSED: 'PaymentProcessed',
        TABLE_OCCUPIED: 'TableOccupied',
        TABLE_FREED: 'TableFreed'
    },

    /**
     * Comandos de automatización comunes
     */
    commands: {
        PRINT_BILL: 'PrintBill',
        PRINT_RECEIPT: 'PrintReceipt',
        SEND_TO_KITCHEN: 'SendToKitchen',
        NOTIFY_WAITER: 'NotifyWaiter',
        UPDATE_DISPLAY: 'UpdateDisplay',
        LOCK_TERMINAL: 'LockTerminal',
        UNLOCK_TERMINAL: 'UnlockTerminal'
    },

    /**
     * Estados de entidad comunes
     */
    entityStates: {
        TABLE_STATUS: 'Status',
        ORDER_STATE: 'State',
        PAYMENT_STATUS: 'PaymentStatus',
        TICKET_STATE: 'TicketState'
    },

    /**
     * Valores de estado comunes
     */
    stateValues: {
        // Estados de mesa
        TABLE_AVAILABLE: 'Available',
        TABLE_OCCUPIED: 'Occupied',
        TABLE_RESERVED: 'Reserved',
        TABLE_CLEANING: 'Cleaning',
        
        // Estados de orden
        ORDER_NEW: 'New',
        ORDER_SUBMITTED: 'Submitted',
        ORDER_PREPARING: 'Preparing',
        ORDER_READY: 'Ready',
        ORDER_SERVED: 'Served',
        ORDER_CANCELLED: 'Cancelled',
        
        // Estados de pago
        PAYMENT_PENDING: 'Pending',
        PAYMENT_PARTIAL: 'Partial',
        PAYMENT_COMPLETE: 'Complete',
        PAYMENT_REFUNDED: 'Refunded'
    },

    /**
     * Ejecuta una secuencia de automatización completa
     */
    async executeWorkflow(terminalId, workflowName, context = {}) {
        debug('🔄 Executing workflow:', { terminalId, workflowName, context });
        
        try {
            switch (workflowName) {
                case 'COMPLETE_ORDER':
                    return await this.completeOrderWorkflow(terminalId, context);
                case 'PROCESS_PAYMENT':
                    return await this.processPaymentWorkflow(terminalId, context);
                case 'CLOSE_TABLE':
                    return await this.closeTableWorkflow(terminalId, context);
                default:
                    throw new Error(`Workflow desconocido: ${workflowName}`);
            }
        } catch (error) {
            debug('❌ Workflow execution failed:', error);
            throw error;
        }
    },

    /**
     * Workflow para completar una orden
     */
    async completeOrderWorkflow(terminalId, context) {
        debug('📝 Executing complete order workflow');
        
        // 1. Notificar que la orden fue enviada
        await this.notifyTicketEvent(terminalId, this.events.ORDER_ADDED, [
            { name: 'OrderCount', value: context.orderCount || 1 },
            { name: 'TableName', value: context.tableName || '' }
        ]);

        // 2. Enviar a cocina
        await this.executeAutomationCommand(terminalId, this.commands.SEND_TO_KITCHEN);

        // 3. Actualizar estado de la mesa si es necesario
        if (context.tableName) {
            await this.updateEntityState('Tables', context.tableName, 'Status', 'Occupied');
        }

        return { success: true, message: 'Orden completada exitosamente' };
    },

    /**
     * Workflow para procesar pago
     */
    async processPaymentWorkflow(terminalId, context) {
        debug('💳 Executing payment workflow');
        
        // 1. Notificar pago procesado
        await this.notifyTicketEvent(terminalId, this.events.PAYMENT_PROCESSED, [
            { name: 'Amount', value: context.amount || 0 },
            { name: 'PaymentType', value: context.paymentType || 'Cash' }
        ]);

        // 2. Imprimir recibo si está configurado
        if (context.printReceipt) {
            await this.executeAutomationCommand(terminalId, this.commands.PRINT_RECEIPT);
        }

        return { success: true, message: 'Pago procesado exitosamente' };
    },

    /**
     * Workflow para cerrar mesa
     */
    async closeTableWorkflow(terminalId, context) {
        debug('🏠 Executing close table workflow');
        
        // 1. Notificar cierre de ticket
        await this.notifyTicketEvent(terminalId, this.events.TICKET_CLOSED, [
            { name: 'TicketTotal', value: context.ticketTotal || 0 },
            { name: 'TableName', value: context.tableName || '' }
        ]);

        // 2. Liberar mesa
        if (context.tableName) {
            await this.updateEntityState('Tables', context.tableName, 'Status', 'Available');
        }

        // 3. Imprimir factura final si es necesario
        if (context.printBill) {
            await this.executeAutomationCommand(terminalId, this.commands.PRINT_BILL);
        }

        return { success: true, message: 'Mesa cerrada exitosamente' };
    }
}; 