/**
 * Ticket Promotion Service
 * Handles automatic promotion of local tickets to server tickets
 * with persistence, retry, and idempotent operations
 */
import cacheService from './cacheService';
import terminalService from './terminalService';
import { createTerminalTicketAsync, changeEntityOfTerminalTicketAsync, addOrderToTerminalTicketAsync } from '../queries';
import Debug from 'debug';

const debug = Debug('pmpos:ticket-promotion');

class TicketPromotionService {
    constructor() {
        this.promotionInProgress = false;
        this.promotionQueue = new Set();
        this.retryAttempts = new Map(); // Track retry attempts per ticket
        this.maxRetries = 3;
        this.baseRetryDelay = 2000; // 2 seconds
        
        // Start promotion service when terminal is registered
        this.setupTerminalRegistrationListener();
    }

    /**
     * Setup listener for terminal registration events
     */
    setupTerminalRegistrationListener() {
        terminalService.onRegistered((user, terminalId) => {
            debug(`🔔 Terminal registered for user ${user}: ${terminalId}, checking for pending tickets...`);
            this.promoteAllPendingTickets(user);
        });
    }

    /**
     * Promote all pending tickets for a specific user
     */
    async promoteAllPendingTickets(user) {
        if (this.promotionInProgress) {
            debug('⏳ Promotion already in progress, skipping...');
            return;
        }

        const pendingTickets = cacheService.getPendingTickets();
        const userTickets = pendingTickets.filter(ticket => ticket.owner === user);
        
        if (userTickets.length === 0) {
            debug(`✅ No pending tickets found for user: ${user}`);
            return;
        }

        debug(`🎫 Found ${userTickets.length} pending tickets for user ${user}, starting promotion...`);
        
        this.promotionInProgress = true;
        
        try {
            for (const ticket of userTickets) {
                await this.promoteTicketToServer(ticket, user);
            }
            debug('🎉 All pending tickets promotion completed');
        } catch (error) {
            debug('❌ Batch promotion failed:', error);
        } finally {
            this.promotionInProgress = false;
        }
    }

    /**
     * Promote a single ticket to the server
     */
    async promoteTicketToServer(localTicket, user) {
        const ticketUid = localTicket.uid;
        
        // Check if already being processed
        if (this.promotionQueue.has(ticketUid)) {
            debug(`⏳ Ticket ${ticketUid} already in promotion queue`);
            return null;
        }

        // Check retry count
        const attempts = this.retryAttempts.get(ticketUid) || 0;
        if (attempts >= this.maxRetries) {
            debug(`💀 Ticket ${ticketUid} exceeded max retry attempts (${this.maxRetries})`);
            return null;
        }

        this.promotionQueue.add(ticketUid);
        this.retryAttempts.set(ticketUid, attempts + 1);

        try {
            debug(`🔄 Promoting ticket ${ticketUid} (attempt ${attempts + 1}/${this.maxRetries})`);
            
            // Get current terminal ID
            const terminalId = terminalService.getTerminalId(user);
            if (!terminalId) {
                throw new Error(`No terminal ID available for user: ${user}`);
            }

            // Step 1: Create server ticket
            debug(`📝 Creating server ticket for ${ticketUid}...`);
            const serverTicket = await createTerminalTicketAsync(terminalId);
            
            if (!serverTicket || !serverTicket.id) {
                throw new Error('Failed to create server ticket - no ID returned');
            }

            debug(`✅ Server ticket created: ${serverTicket.id}`);

            // Step 2: Assign table if available
            if (localTicket.tableId) {
                debug(`🏠 Assigning table ${localTicket.tableId} to ticket ${serverTicket.id}...`);
                try {
                    await changeEntityOfTerminalTicketAsync(terminalId, localTicket.tableId);
                    debug(`✅ Table assigned successfully`);
                } catch (error) {
                    debug(`⚠️ Table assignment failed (non-critical):`, error);
                }
            }

            // Step 3: Add orders if any
            if (localTicket.orders && localTicket.orders.length > 0) {
                debug(`📦 Adding ${localTicket.orders.length} orders to server ticket...`);
                
                for (const order of localTicket.orders) {
                    try {
                        await this.addOrderToServerTicket(terminalId, serverTicket.id, order);
                        debug(`✅ Order added: ${order.name} x${order.quantity}`);
                    } catch (error) {
                        debug(`⚠️ Order addition failed:`, error);
                        // Continue with other orders
                    }
                }
            }

            // Step 4: Remove from pending tickets
            cacheService.removePendingTicket(ticketUid);
            debug(`🗑️ Removed pending ticket ${ticketUid} from cache`);

            // Step 5: Clean up tracking
            this.retryAttempts.delete(ticketUid);

            debug(`🎉 Ticket promotion completed: ${ticketUid} -> ${serverTicket.id}`);

            // Return the promoted ticket info
            return {
                localTicket,
                serverTicket,
                success: true,
                promotedAt: Date.now()
            };

        } catch (error) {
            debug(`❌ Ticket promotion failed for ${ticketUid}:`, error);
            
            const currentAttempts = this.retryAttempts.get(ticketUid) || 0;
            
            if (currentAttempts < this.maxRetries && this.isRetryableError(error)) {
                const delay = this.baseRetryDelay * Math.pow(2, currentAttempts - 1);
                debug(`⏳ Scheduling retry for ${ticketUid} in ${delay}ms (attempt ${currentAttempts}/${this.maxRetries})`);
                
                setTimeout(() => {
                    this.promotionQueue.delete(ticketUid);
                    this.promoteTicketToServer(localTicket, user);
                }, delay);
            } else {
                debug(`💀 Giving up on ticket ${ticketUid} after ${currentAttempts} attempts`);
                this.retryAttempts.delete(ticketUid);
                
                // Mark ticket as failed but keep in cache for manual retry
                const updatedTicket = {
                    ...localTicket,
                    promotionFailed: true,
                    lastError: error.message,
                    failedAt: Date.now()
                };
                
                // Update the pending ticket with error info
                const pendingTickets = cacheService.getPendingTickets();
                const updatedTickets = pendingTickets.map(t => 
                    t.uid === ticketUid ? updatedTicket : t
                );
                localStorage.setItem('pmpos_pending_tickets', JSON.stringify(updatedTickets));
            }
            
            return null;
        } finally {
            this.promotionQueue.delete(ticketUid);
        }
    }

    /**
     * Add an order to a server ticket
     */
    async addOrderToServerTicket(terminalId, ticketId, order) {
        const orderPayload = {
            productId: order.productId || order.product?.id,
            quantity: order.quantity || 1,
            price: order.price || 0,
            portion: order.portion?.name || 'Normal',
            orderTags: order.orderTags || [],
            comments: order.comments || ''
        };

        return await addOrderToTerminalTicketAsync(terminalId, orderPayload);
    }

    /**
     * Check if an error should trigger a retry
     */
    isRetryableError(error) {
        if (!error) return false;
        
        const errorMsg = error.message || error.toString();
        
        // Network errors that should be retried
        const retryablePatterns = [
            'network',
            'timeout',
            'ECONNREFUSED',
            'ENOTFOUND', 
            'ETIMEDOUT',
            'fetch',
            'Failed to fetch',
            'NetworkError',
            '500',
            '502',
            '503',
            '504'
        ];
        
        const shouldRetry = retryablePatterns.some(pattern => 
            errorMsg.toLowerCase().includes(pattern.toLowerCase())
        );
        
        debug(`🔍 Retry analysis for error "${errorMsg}": ${shouldRetry ? 'RETRYABLE' : 'FINAL'}`);
        
        return shouldRetry;
    }

    /**
     * Manually trigger promotion for a specific ticket
     */
    async retryTicketPromotion(ticketUid) {
        const pendingTickets = cacheService.getPendingTickets();
        const ticket = pendingTickets.find(t => t.uid === ticketUid);
        
        if (!ticket) {
            debug(`❌ Ticket ${ticketUid} not found in pending tickets`);
            return null;
        }

        const user = ticket.owner;
        if (!user) {
            debug(`❌ No owner found for ticket ${ticketUid}`);
            return null;
        }

        // Reset retry counter for manual retry
        this.retryAttempts.delete(ticketUid);
        
        debug(`🔄 Manual retry for ticket ${ticketUid} by user ${user}`);
        return await this.promoteTicketToServer(ticket, user);
    }

    /**
     * Get promotion status for all pending tickets
     */
    getPromotionStatus() {
        const pendingTickets = cacheService.getPendingTickets();
        const queuedTickets = Array.from(this.promotionQueue);
        
        return {
            pendingCount: pendingTickets.length,
            queuedCount: queuedTickets.length,
            retryingCount: this.retryAttempts.size,
            inProgress: this.promotionInProgress,
            pendingTickets: pendingTickets.map(ticket => ({
                uid: ticket.uid,
                owner: ticket.owner,
                tableId: ticket.tableId,
                createdAt: ticket.createdAt,
                orderCount: ticket.orders?.length || 0,
                failed: !!ticket.promotionFailed,
                lastError: ticket.lastError,
                retryAttempts: this.retryAttempts.get(ticket.uid) || 0
            }))
        };
    }

    /**
     * Clear failed tickets from cache
     */
    clearFailedTickets() {
        const pendingTickets = cacheService.getPendingTickets();
        const activeTickets = pendingTickets.filter(t => !t.promotionFailed);
        
        localStorage.setItem('pmpos_pending_tickets', JSON.stringify(activeTickets));
        
        const removedCount = pendingTickets.length - activeTickets.length;
        debug(`🗑️ Cleared ${removedCount} failed tickets from cache`);
        
        return removedCount;
    }
}

// Export singleton instance
export default new TicketPromotionService();
export { TicketPromotionService };