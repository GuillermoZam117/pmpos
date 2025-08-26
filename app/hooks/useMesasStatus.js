/**
 * Real-time Mesa Status Hook
 * 
 * Uses polling on getAllOpenTickets() to provide "almost real-time" mesa occupancy status.
 * Since SambaPOS GraphQL doesn't expose subscriptions, we use lightweight polling every 2 seconds.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getAllOpenTickets, getMesaStatus, getMesaStatusWithTime, getTicketForMesa } from '../queries';
import Debug from 'debug';

const debug = Debug('pmpos:mesa-status');

/**
 * Custom hook for real-time mesa status monitoring
 * @param {Object} options Configuration options
 * @param {number} options.pollInterval Polling interval in milliseconds (default: 2000)
 * @param {boolean} options.enabled Whether polling is enabled (default: true)
 * @param {boolean} options.networkOnly Whether to always fetch from network (default: true)
 * @returns {Object} { allTickets, loading, error, refresh, isPolling }
 */
export const useMesasStatus = ({
    pollInterval = 2000,
    enabled = true,
    networkOnly = true
} = {}) => {
    const [allTickets, setAllTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isPolling, setIsPolling] = useState(false);
    
    const intervalRef = useRef(null);
    const mountedRef = useRef(true);
    const lastFetchRef = useRef(0);
    const tokenCacheRef = useRef(null);
    
    // Manual refresh function with token caching and throttling
    const refresh = useCallback(async () => {
        if (!mountedRef.current) return;
        
        const now = Date.now();
        
        // Throttle rapid successive calls (min 500ms between calls)
        if (now - lastFetchRef.current < 500) {
            debug('🚫 Throttling rapid refresh calls');
            return;
        }
        
        lastFetchRef.current = now;
        
        try {
            setError(null);
            debug('🔄 Refreshing mesa status...');
            
            const tickets = await getAllOpenTickets();
            
            if (mountedRef.current) {
                setAllTickets(tickets);
                setLoading(false);
                debug(`✅ Refreshed: ${tickets.length} open tickets`);
                
                // Show polling status in console (only first 3 times or every 20 polls for monitoring)
                const pollCount = parseInt(sessionStorage.getItem('pmpos_poll_count') || '0', 10);
                if (pollCount < 3 || pollCount % 20 === 0) {
                    console.log(`🔄 Mesa polling active: ${tickets.length} tickets, next update in ${pollInterval/1000}s`);
                }
                sessionStorage.setItem('pmpos_poll_count', String(pollCount + 1));
            }
        } catch (err) {
            debug('❌ Error refreshing mesa status:', err);
            if (mountedRef.current) {
                setError(err);
                setLoading(false);
            }
        }
    }, [pollInterval]);
    
    // Start polling
    const startPolling = useCallback(() => {
        if (intervalRef.current || !enabled) return;
        
        debug(`🔄 Starting mesa status polling every ${pollInterval}ms`);
        setIsPolling(true);
        
        // Initial load
        refresh();
        
        // Set up polling interval
        intervalRef.current = setInterval(() => {
            if (mountedRef.current) {
                refresh();
            }
        }, pollInterval);
    }, [pollInterval, enabled, refresh]);
    
    // Stop polling
    const stopPolling = useCallback(() => {
        if (intervalRef.current) {
            debug('⏹️ Stopping mesa status polling');
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            setIsPolling(false);
        }
    }, []);
    
    // Setup and cleanup - StrictMode safe
    useEffect(() => {
        mountedRef.current = true;
        
        // Prevent double execution in React StrictMode
        const effectId = `mesa-polling-${Date.now()}`;
        sessionStorage.setItem('mesa-polling-effect', effectId);
        
        if (enabled) {
            // Small delay to prevent StrictMode duplicate effects
            const timer = setTimeout(() => {
                // Only start if this effect is still the latest one
                if (sessionStorage.getItem('mesa-polling-effect') === effectId) {
                    startPolling();
                }
            }, 100);
            
            return () => {
                clearTimeout(timer);
                mountedRef.current = false;
                stopPolling();
            };
        }
        
        return () => {
            mountedRef.current = false;
            stopPolling();
        };
    }, [enabled, startPolling, stopPolling]);
    
    // Handle interval change
    useEffect(() => {
        if (enabled && isPolling) {
            stopPolling();
            startPolling();
        }
    }, [pollInterval, enabled, isPolling, stopPolling, startPolling]);
    
    return {
        allTickets,
        loading,
        error,
        refresh,
        isPolling,
        startPolling,
        stopPolling
    };
};

/**
 * Helper hook that provides mesa-specific status from the global tickets
 * @param {string|number} mesaNumber Mesa number to get status for
 * @param {Array} allTickets All open tickets from useMesasStatus
 * @returns {Object} { status, timeInfo, color, ticket }
 */
export const useMesaStatus = (mesaNumber, allTickets = []) => {
    const mesaStr = String(mesaNumber);
    
    const status = getMesaStatus(mesaStr, allTickets);
    const statusWithTime = getMesaStatusWithTime(mesaStr, allTickets);
    const ticket = getTicketForMesa(mesaStr, allTickets);
    
    return {
        status: statusWithTime.status,
        timeInfo: statusWithTime.timeInfo,
        color: statusWithTime.color,
        ticket
    };
};

/**
 * Higher-order hook that combines mesa status polling with table data
 * This replaces the manual polling logic in TableView
 */
export const useTablesWithStatus = ({
    pollInterval = 2000,
    enabled = true
} = {}) => {
    const { allTickets, loading: ticketsLoading, error: ticketsError, refresh: refreshTickets, isPolling } = useMesasStatus({
        pollInterval,
        enabled
    });
    
    // Create a map of mesa statuses for easy lookup
    const mesaStatusMap = new Map();
    
    // Process all tickets to create status map
    allTickets.forEach(ticket => {
        if (!ticket.entities) return;
        
        const mesaEntity = ticket.entities.find(entity => entity.type === 'Mesas');
        if (!mesaEntity) return;
        
        const mesaNumber = mesaEntity.name;
        const status = getMesaStatus(mesaNumber, allTickets);
        const statusWithTime = getMesaStatusWithTime(mesaNumber, allTickets);
        
        mesaStatusMap.set(mesaNumber, {
            ...statusWithTime,
            ticket
        });
    });
    
    return {
        allTickets,
        mesaStatusMap,
        loading: ticketsLoading,
        error: ticketsError,
        refresh: refreshTickets,
        isPolling
    };
};

export default useMesasStatus;