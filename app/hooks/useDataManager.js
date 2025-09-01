/**
 * Unified Data Manager Hook
 * 
 * Replaces useMesasStatus and other data hooks with a single centralized hook
 * that uses dataManager for all data access. This eliminates redundant requests.
 */

import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import dataManager from '../services/dataManager';
import Debug from 'debug';

const debug = Debug('pmpos:data-hook');

/**
 * Unified hook for all app data (tickets, tables, menu, etc.)
 * @returns {Object} { tickets, tables, loading, error, refresh }
 */
export const useDataManager = () => {
    const [tickets, setTickets] = useState([]);
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const mountedRef = useRef(true);
    
    // Get tables from Redux as fallback (handle both Immutable and plain objects)
    const reduxTables = useSelector(state => {
        try {
            if (state.app?.get) {
                // Immutable.js
                const tables = state.app.get('tables');
                return tables?.toJS ? tables.toJS() : tables;
            } else if (state.app?.tables) {
                // Plain object
                return Array.isArray(state.app.tables) ? state.app.tables : [];
            }
            return [];
        } catch (e) {
            debug('⚠️ Redux selector error:', e.message);
            return [];
        }
    });

    // Refresh function that gets fresh data from dataManager
    const refresh = async (force = false) => {
        if (!mountedRef.current) return;
        
        try {
            if (force) {
                debug('🔄 Force refreshing all data...');
                await dataManager.refreshData('all');
            }
            
            // Get cached data (already fresh from dataManager polling)
            const cachedTickets = dataManager.getCachedActiveTickets() || [];
            const cachedTables = dataManager.getCachedTables() || [];
            
            debug('📊 Hook refresh data check:', { 
                cachedTicketsLength: cachedTickets.length,
                cachedTablesLength: cachedTables.length,
                force,
                timestamp: new Date().toISOString()
            });
            
            // Use Redux tables as fallback if cache is empty
            const finalTables = cachedTables.length > 0 ? cachedTables : reduxTables;
            
            debug('🔄 Refreshing hook state:', { 
                ticketsCount: cachedTickets.length, 
                cachedTablesCount: cachedTables.length,
                reduxTablesCount: reduxTables.length,
                finalTablesCount: finalTables.length,
                isInitialized: dataManager.isInitialized()
            });
            
            if (mountedRef.current) {
                setTickets(cachedTickets);
                setTables(finalTables);
                setLoading(false);
                setError(null);
                
                debug('✅ Hook state updated:', { 
                    newTicketsCount: cachedTickets.length, 
                    newTablesCount: finalTables.length,
                    usingReduxFallback: finalTables === reduxTables
                });
            }
            
        } catch (err) {
            debug('❌ Error refreshing data:', err);
            if (mountedRef.current) {
                setError(err);
                setLoading(false);
            }
        }
    };

    // Initialize on mount
    useEffect(() => {
        mountedRef.current = true;
        
        const initData = async () => {
            debug('🚀 Initializing hook data...');
            
            // Wait for dataManager to be initialized (happens in App.jsx)
            let attempts = 0;
            while (!dataManager.isInitialized() && attempts < 30) {
                debug(`⏳ Waiting for DataManager... attempt ${attempts + 1}/30`);
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (dataManager.isInitialized()) {
                debug('✅ DataManager initialized, refreshing data...');
                
                // Force refresh all data and wait for completion
                await dataManager.refreshData('all');
                debug('🔄 RefreshData completed, checking cache...');
                
                // Now check cache after ensuring refresh is complete
                const cachedTickets = dataManager.getCachedActiveTickets() || [];
                const cachedTables = dataManager.getCachedTables() || [];
                
                debug('📋 Final data check after refresh:', {
                    cachedTicketsLength: cachedTickets.length,
                    cachedTablesLength: cachedTables.length,
                    reduxTablesLength: reduxTables.length,
                    willUseRedux: cachedTables.length === 0 && reduxTables.length > 0
                });
                
                // Use cached data or fallback to Redux
                const finalTables = cachedTables.length > 0 ? cachedTables : reduxTables;
                
                if (mountedRef.current) {
                    setTickets(cachedTickets);
                    setTables(finalTables);
                    setLoading(false);
                    setError(null);
                    
                    debug('✅ Hook initialized successfully:', {
                        ticketsCount: cachedTickets.length,
                        tablesCount: finalTables.length,
                        source: cachedTables.length > 0 ? 'cache' : 'redux'
                    });
                }
                
            } else {
                debug('❌ DataManager initialization timeout');
                setError(new Error('DataManager initialization timeout'));
                setLoading(false);
            }
        };

        initData();

        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Listen to dataManager events for real-time updates
    useEffect(() => {
        const handleDataRefresh = () => {
            debug('📡 Data refreshed, updating state...');
            refresh();
        };

        // DataManager emits custom events when data is refreshed
        window.addEventListener('dataManagerRefresh', handleDataRefresh);

        return () => {
            window.removeEventListener('dataManagerRefresh', handleDataRefresh);
        };
    }, []);
    
    // Also listen to Redux changes as fallback
    useEffect(() => {
        if (reduxTables.length > 0 && tables.length === 0) {
            debug('🔄 Using Redux tables as fallback:', { reduxCount: reduxTables.length });
            setTables(reduxTables);
            setLoading(false);
        }
    }, [reduxTables, tables.length]);

    return {
        tickets,
        tables,
        loading,
        error,
        refresh
    };
};

export default useDataManager;