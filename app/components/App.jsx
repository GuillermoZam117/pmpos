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

// Lazy load components
const PinPad = React.lazy(() => import('./PinPad'));
const TableView = React.lazy(() => import('./TableView'));

const LoadingComponent = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
    <CircularProgress />
  </div>
);

const PrivateRoute = ({ children }) => {
    const isAuthenticated = useSelector(state => state.auth.get('isAuthenticated'));
    return isAuthenticated ? children : <Navigate to="/pinpad" />;
};

const App = () => {
    const dispatch = useDispatch();
    const isAuthenticated = useSelector(state => state.auth.get('isAuthenticated'));
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initApp = async () => {
            debug('Initializing application...');
            try {
                await dispatch(initializeAuth());
                debug('Authentication initialized');
            } finally {
                setIsLoading(false);
            }
        };
        initApp();
    }, [dispatch]);

    if (isLoading) {
        return <LoadingComponent />;
    }

    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <div className="app-container">
                <Suspense fallback={<LoadingComponent />}>
                    <Routes>
                        <Route path="/" element={<Navigate to="/pinpad" replace />} />
                        <Route path="/pinpad" element={<PinPad />} />
                        <Route 
                            path="/tables" 
                            element={
                                <PrivateRoute>
                                    <TableView />
                                </PrivateRoute>
                            } 
                        />
                        <Route path="*" element={<Navigate to="/pinpad" replace />} />
                    </Routes>
                </Suspense>
            </div>
        </ThemeProvider>
    );
};

export default App;
