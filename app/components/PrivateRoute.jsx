import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box, CircularProgress } from '@mui/material';
import Debug from 'debug';

const debug = Debug('pmpos:route');

const PrivateRoute = ({ children }) => {
    const location = useLocation();
    const authState = useSelector(state => state.auth);
    const isAuthenticated = authState.get('isAuthenticated');
    const loading = authState.get('isLoading');

    if (loading) {
        return (
            <Box 
                display="flex" 
                justifyContent="center" 
                alignItems="center" 
                minHeight="100vh"
            >
                <CircularProgress />
            </Box>
        );
    }

    if (!isAuthenticated) {
        debug('🔒 Access denied, redirecting to PinPad...');
        return <Navigate to="/pinpad" state={{ from: location }} replace />;
    }

    return children;
};

export default PrivateRoute;
