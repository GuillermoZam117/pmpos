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
import Debug from 'debug';

const debug = Debug('pmpos:app');

// Route constants
const ROUTES = {
    PINPAD: '/pinpad',
    TABLES: '/tables',
    POS: '/pos/:ticketId?'  // Optional ticket ID parameter
};

// Lazy load components
const PinPad = React.lazy(() => import('./PinPad'));
const TableView = React.lazy(() => import('./TableView'));
const POSViewUnified = React.lazy(() => import('./POS/POSViewUnified'));

// Loading component with better styling
const LoadingComponent = () => (
    <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '100vh',
        padding: '2rem' 
    }}>
        <CircularProgress />
    </div>
);

// Private route using auth selector
const PrivateRoute = ({ children }) => {
    const isAuthenticated = useSelector(state => state.auth.get('isAuthenticated'));
    return isAuthenticated ? children : <Navigate to={ROUTES.PINPAD} replace />;
};

const AppContent = () => {
    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    useEffect(() => {
        const initApp = async () => {
            debug('🚀 Initializing application...');
            try {
                // Start token preload immediately (background operation)
                console.log('🔄 Starting token preload for instant login...');
                tokenService.preloadTokenIfNeeded(); // No await - background operation
                
                // Initialize auth system
                await dispatch(initializeAuth());
                debug('✅ Authentication initialized');
                
                // Add debug helpers to window for testing
                if (typeof window !== 'undefined') {
                    window.debugTerminal = () => {
                        console.log('🔧 Terminal Debug Info:');
                        console.log('  - Terminal ID:', terminalService.getTerminalId());
                        console.log('  - Is Registered:', terminalService.isRegistered());
                        console.log('  - localStorage terminalId:', localStorage.getItem('currentTerminalId'));
                        console.log('  - window.currentTerminalId:', window.currentTerminalId);
                    };
                    
                    window.registerTerminalManual = async (user = 'graphiql') => {
                        console.log('🔧 Manual terminal registration for:', user);
                        try {
                            const id = await terminalService.ensureTerminalRegistered(user);
                            console.log('✅ Manual registration successful:', id);
                            return id;
                        } catch (error) {
                            console.error('❌ Manual registration failed:', error);
                            throw error;
                        }
                    };
                    
                    console.log('🔧 Debug commands available:');
                    console.log('  - window.debugTerminal() - Show terminal status');
                    console.log('  - window.registerTerminalManual(user) - Manual registration');
                }
            } catch (err) {
                debug('❌ Initialization error:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        initApp();
    }, [dispatch]);

    // Show loading state
    if (isLoading) {
        return <LoadingComponent />;
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
