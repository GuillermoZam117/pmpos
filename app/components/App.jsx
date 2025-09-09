import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import CssBaseline from '@mui/material/CssBaseline';
import CircularProgress from '@mui/material/CircularProgress';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { initializeAuth } from '../actions/auth';
import { ThemeProvider } from '../contexts/ThemeContext';
import { tokenService } from '../services/tokenService';
import dataManager from '../services/dataManager';
import ticketPromotionService from '../services/ticketPromotionService';
import ConnectionStatus from './ConnectionStatus';
import Debug from 'debug';

const debug = Debug('pmpos:app');

// Route constants
const ROUTES = {
    PINPAD: '/pinpad',
    TABLES: '/tables',
    POS: '/pos/:ticketId?'  // Optional ticket ID parameter
};

// Lazy load components
// Lazy helper with retry to recover from transient chunk load errors in dev
const lazyWithRetry = (factory) => {
    return React.lazy(() =>
        factory().catch(err => {
            const isChunkError = /Loading chunk/i.test(err?.message || '');
            if (isChunkError && typeof window !== 'undefined') {
                // Force a full reload to refresh chunk map
                console.warn('🔁 Chunk load failed, reloading page...');
                window.location.reload();
            }
            throw err;
        })
    );
};

const PinPad = lazyWithRetry(() => import('./PinPad'));
const TableView = lazyWithRetry(() => import('./TableView'));
const POSViewUnified = lazyWithRetry(() => import('./POS/POSViewUnified'));

// Loading component with progress indication
const LoadingComponent = ({ progress }) => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '2rem',
        textAlign: 'center'
    }}>
        <CircularProgress size={60} />
        {progress?.stage && (
            <div style={{ marginTop: '2rem', color: '#666' }}>
                <p style={{ margin: '0.5rem 0', fontSize: '1.1rem' }}>{progress.stage}</p>
                {progress.progress > 0 && (
                    <div style={{
                        width: '300px',
                        height: '6px',
                        backgroundColor: '#e0e0e0',
                        borderRadius: '3px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${progress.progress}%`,
                            height: '100%',
                            backgroundColor: '#1976d2',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                )}
            </div>
        )}
    </div>
);

// Private route using login slice (persisted via localStorage token)
const PrivateRoute = ({ children }) => {
    const isAuthenticated = useSelector(state => state.auth?.get?.('isAuthenticated'));
    // Soft auth: if token exists in localStorage, allow access while UI rehydrates
    const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('access_token');
    return (isAuthenticated || hasToken) ? children : <Navigate to={ROUTES.PINPAD} replace />;
};

const AppContent = () => {
    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [initProgress, setInitProgress] = useState({ stage: '', progress: 0 });
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    useEffect(() => {
        const initApp = async () => {
            debug('🚀 Initializing application...');
            try {
                // Step 1: Authentication (25%)
                setInitProgress({ stage: 'Inicializando autenticación...', progress: 25 });
                console.log('🔄 Starting token preload for instant login...');
                tokenService.preloadTokenIfNeeded(); // No await - background operation

                await dispatch(initializeAuth());
                debug('✅ Authentication initialized');

                // Step 2: Initialize DataManager - loads Menu + Tables + SignalR (75%)
                setInitProgress({ stage: 'Cargando datos iniciales...', progress: 50 });
                const initResult = await dataManager.initializeApp();

                if (initResult.success) {
                    setInitProgress({ stage: 'Configurando interfaz...', progress: 90 });
                    debug(`✅ DataManager initialized - Menu: ${initResult.menu?.categories?.length || 0} categories, Tables: ${initResult.tables?.length || 0} tables`);

                    // Dispatch data to Redux store
                    if (initResult.menu) {
                        dispatch({ type: 'SET_MENU', menu: initResult.menu });
                    }
                    if (initResult.tables) {
                        dispatch({ type: 'SET_TABLES', payload: initResult.tables });
                    }
                } else {
                    debug('⚠️ DataManager initialization completed with warnings');
                }

                setInitProgress({ stage: 'Completando configuración...', progress: 100 });

                // Add debug helpers to window for testing
                if (typeof window !== 'undefined') {
                    window.debugDataManager = () => {
                        console.log('🔧 DataManager Debug Info:');
                        console.log('  - Initialized:', dataManager.isInitialized());
                        console.log('  - Status:', dataManager.getInitStatus());
                        console.log('  - Cached Menu:', !!dataManager.getCachedMenu());
                        console.log('  - Cached Tables:', dataManager.getCachedTables()?.length || 0);
                    };

                    window.debugTicketPromotion = () => {
                        console.log('🎫 Ticket Promotion Debug Info:');
                        console.log(ticketPromotionService.getPromotionStatus());
                    };

                    window.retryTicketPromotion = async (ticketUid) => {
                        console.log('🔄 Manual ticket promotion retry:', ticketUid);
                        try {
                            const result = await ticketPromotionService.retryTicketPromotion(ticketUid);
                            console.log('✅ Retry result:', result);
                            return result;
                        } catch (error) {
                            console.error('❌ Retry failed:', error);
                            throw error;
                        }
                    };

                    window.clearFailedTickets = () => {
                        console.log('🗑️ Clearing failed tickets...');
                        const count = ticketPromotionService.clearFailedTickets();
                        console.log(`✅ Cleared ${count} failed tickets`);
                        return count;
                    };

                    window.refreshData = async (type = 'all') => {
                        console.log('🔄 Refreshing data:', type);
                        try {
                            switch (type) {
                                case 'menu':
                                    const menu = await dataManager.refreshData('menu');
                                    if (menu) {
                                        dispatch({ type: 'SET_MENU', menu });
                                        console.log('✅ Menu refreshed and dispatched to Redux');
                                    }
                                    return menu;
                                case 'tables':
                                    const tables = await dataManager.refreshData('tables');
                                    if (tables) {
                                        dispatch({ type: 'SET_TABLES', payload: tables });
                                        console.log('✅ Tables refreshed and dispatched to Redux');
                                    }
                                    return tables;
                                case 'tickets':
                                    return await dataManager.refreshData('tickets');
                                default:
                                    const result = await dataManager.initializeApp();
                                    if (result.success) {
                                        if (result.menu) {
                                            dispatch({ type: 'SET_MENU', menu: result.menu });
                                        }
                                        if (result.tables) {
                                            dispatch({ type: 'SET_TABLES', payload: result.tables });
                                        }
                                        console.log('✅ All data refreshed and dispatched to Redux');
                                    }
                                    return result;
                            }
                        } catch (error) {
                            console.error('❌ Data refresh failed:', error);
                            throw error;
                        }
                    };

                    // Expose end-to-end GraphQL flow helper (create -> assign -> add -> close)
                    window.runGraphqlFlow = async (tableName, productName, quantity = 1, portion = null, closeAfter = true) => {
                        console.log('🚀 runGraphqlFlow:', { tableName, productName, quantity, portion, closeAfter });
                        try {
                            const { ticketService } = await import('../services/ticketService');
                            const terminalService = (await import('../services/terminalService')).default;
                            const userName = (window.__pmpos_user && window.__pmpos_user.name) || null;
                            let terminalId = terminalService.getTerminalId();
                            if (!terminalId) {
                                try { terminalId = await terminalService.ensureTerminalRegistered(userName); } catch (_) { }
                            }
                            const res = await ticketService.createAssignAddClose({
                                terminalId,
                                tableName,
                                order: { productName, quantity, portion },
                                close: closeAfter
                            });
                            console.log('✅ runGraphqlFlow result:', res);
                            return res;
                        } catch (e) {
                            console.error('❌ runGraphqlFlow failed:', e);
                            throw e;
                        }
                    };

                    console.log('🔧 Debug commands available:');
                    console.log('  - window.debugDataManager() - Show DataManager status');
                    console.log('  - window.debugTicketPromotion() - Show ticket promotion status');
                    console.log('  - window.retryTicketPromotion(uid) - Manually retry ticket promotion');
                    console.log('  - window.clearFailedTickets() - Clear failed tickets from cache');
                    console.log('  - window.refreshData(type) - Refresh data (menu|tables|tickets|all)');
                    console.log('  - window.runGraphqlFlow(table, product, qty?, portion?, closeAfter?)');
                }
            } catch (err) {
                debug('❌ Initialization error:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
                setInitProgress({ stage: '', progress: 0 });
            }
        };
        initApp();
    }, [dispatch]);

    // Show loading state
    if (isLoading) {
        return <LoadingComponent progress={initProgress} />;
    }

    // Show error state if initialization failed
    if (error) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                padding: '2rem',
                color: '#ff0000'
            }}>
                <h2>Error: {error}</h2>
            </div>
        );
    }

    return (
        <>
            <CssBaseline />
            {/* Connection Status Component - Always visible */}
            <ConnectionStatus />

            <div className="app-container">
                <Suspense fallback={<LoadingComponent />}>
                    <Routes>
                        {/* Default route redirects to PinPad */}
                        <Route
                            path={ROUTES.PINPAD}
                            element={<PinPad />}
                        />
                        {/* Protected Tables route */}
                        <Route
                            path={ROUTES.TABLES}
                            element={
                                <PrivateRoute>
                                    <TableView />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path={ROUTES.POS}
                            element={
                                <PrivateRoute>
                                    <POSViewUnified />
                                </PrivateRoute>
                            }
                        />
                        {/* Catch all route redirects to PinPad */}
                        <Route
                            path="*"
                            element={<Navigate to={ROUTES.PINPAD} replace />}
                        />
                    </Routes>
                </Suspense>
            </div>
        </>
    );
};

const App = () => {
    return (
        <ThemeProvider>
            <AppContent />
        </ThemeProvider>
    );
};

export default App;
