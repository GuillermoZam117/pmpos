import { graphqlSimple, gqlEscape } from './graphqlService';
import Debug from 'debug';

const debug = Debug('pmpos:automation');

/**
 * Automation Service usando el método simple de smoke tests
 * SIN Apollo Client - solo fetch directo como smoke tests
 */
export const automationService = {
    /**
     * Ejecuta un comando de automatización en el ticket del terminal
     */
    async executeAutomationCommand(terminalId, commandName, orderUid = null, value = null) {
        debug('🤖 Executing automation command (simple method):', { terminalId, commandName, orderUid, value });

        if (!terminalId || !commandName) {
            throw new Error('Terminal ID and command name are required');
        }

        try {
            let query;

            if (orderUid) {
                // Command for specific order
                query = `mutation { 
                    executeAutomationCommandForTerminalTicket(
                        terminalId: "${gqlEscape(terminalId)}", 
                        name: "${gqlEscape(commandName)}", 
                        orderUid: "${gqlEscape(orderUid)}"
                    ) { 
                        id 
                    } 
                }`;
            } else if (value) {
                // Command with value
                query = `mutation { 
                    executeAutomationCommandForTerminalTicket(
                        terminalId: "${gqlEscape(terminalId)}", 
                        name: "${gqlEscape(commandName)}", 
                        value: "${gqlEscape(value)}"
                    ) { 
                        id 
                    } 
                }`;
            } else {
                // Simple command
                query = `mutation { 
                    executeAutomationCommandForTerminalTicket(
                        terminalId: "${gqlEscape(terminalId)}", 
                        name: "${gqlEscape(commandName)}"
                    ) { 
                        id 
                    } 
                }`;
            }

            const data = await graphqlSimple(query);
            const result = data?.executeAutomationCommandForTerminalTicket;

            // According to DISCOVERY GRAPHQL documentation, returns { id } not { success }
            if (result && (result.id !== undefined || result.success)) {
                debug('✅ Automation command executed successfully', result);
                return { success: true, ...result };
            } else {
                debug('⚠️ Automation command response:', result);
                throw new Error('Automation command failed');
            }
        } catch (error) {
            debug('❌ Failed to execute automation command:', error.message);
            throw new Error(`Error al ejecutar comando: ${error.message}`);
        }
    },

    /**
     * Notifica un evento del ticket del terminal
     */
    async notifyTerminalTicketEvent(terminalId, eventName, parameters = []) {
        debug('📢 Notifying terminal ticket event (simple method):', { terminalId, eventName, parameters });

        if (!terminalId || !eventName) {
            throw new Error('Terminal ID and event name are required');
        }

        try {
            // For now, simple events without parameters
            const query = `mutation { 
                notifyTerminalTicketEvent(
                    terminalId: "${gqlEscape(terminalId)}", 
                    name: "${gqlEscape(eventName)}"
                ) { 
                    success 
                } 
            }`;

            const data = await graphqlSimple(query);
            const result = data?.notifyTerminalTicketEvent;

            if (result?.success) {
                debug('✅ Event notified successfully');
                return { success: true };
            } else {
                throw new Error('Event notification failed');
            }
        } catch (error) {
            debug('❌ Failed to notify event:', error.message);
            throw new Error(`Error al notificar evento: ${error.message}`);
        }
    },

    /**
     * Obtiene los botones de comandos de automatización disponibles para el ticket del terminal
     */
    async getAutomationCommandButtons(terminalId, orderUids = null) {
        debug('🔘 Getting automation command buttons:', { terminalId, orderUids });

        if (!terminalId) {
            throw new Error('Terminal ID is required');
        }

        try {
            let query;

            if (orderUids && Array.isArray(orderUids) && orderUids.length > 0) {
                // Get buttons for specific orders
                const orderUidsStr = orderUids.map(uid => `"${gqlEscape(uid)}"`).join(',');
                query = `query { 
                    getAutomationCommandButtonsForTerminalTicket(
                        terminalId: "${gqlEscape(terminalId)}", 
                        orderUids: [${orderUidsStr}]
                    ) { 
                        name 
                        caption
                        enabled
                        color
                    } 
                }`;
            } else {
                // Get buttons for ticket
                query = `query { 
                    getAutomationCommandButtonsForTerminalTicket(
                        terminalId: "${gqlEscape(terminalId)}"
                    ) { 
                        name 
                        caption
                        enabled
                        color
                    } 
                }`;
            }

            const data = await graphqlSimple(query);
            const buttons = data?.getAutomationCommandButtonsForTerminalTicket || [];

            debug(`✅ Retrieved ${buttons.length} automation buttons`);
            return buttons;
        } catch (error) {
            debug('❌ Failed to get automation buttons:', error.message);
            return []; // Return empty array instead of throwing to prevent UI breaks
        }
    }
};
