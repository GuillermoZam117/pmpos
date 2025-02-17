import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ThemeProvider } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import CircularProgress from '@mui/material/CircularProgress';
import { initializeAuth } from '../actions/auth';
import { darkTheme } from '../theme';
import Debug from 'debug';

const debug = Debug('pmpos:app');

// Route constants
const ROUTES = {
    PINPAD: '/pinpad',
    TABLES: '/tables'
};

// Lazy load components
const PinPad = React.lazy(() => import('./PinPad'));
const TableView = React.lazy(() => import('./TableView'));

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

const App = () => {
    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const initApp = async () => {
            debug('🚀 Initializing application...');
            try {
                await dispatch(initializeAuth());
                debug('✅ Authentication initialized');
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
        <ThemeProvider theme={darkTheme}>
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
                        {/* Catch all route redirects to PinPad */}
                        <Route 
                            path="*" 
                            element={<Navigate to={ROUTES.PINPAD} replace />} 
                        />
                    </Routes>
                </Suspense>
            </div>
        </ThemeProvider>
    );
};

export default App;
