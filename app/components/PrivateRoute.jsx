import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box, CircularProgress } from '@mui/material';

const PrivateRoute = ({ children }) => {
    const location = useLocation();
    const auth = useSelector(state => state.auth);
    const isAuthenticated = auth.get('isAuthenticated');
    const loading = auth.get('loading');

    // Show loading state
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

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // Render protected route content
    return children;
};

export default PrivateRoute;