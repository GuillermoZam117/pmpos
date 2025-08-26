/**
 * Unified POSView Component
 * Auto-detects device type and uses appropriate layout
 */
import React from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import POSViewMobile from './POSViewMobile';

const POSViewUnified = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('lg')); // Changed to lg to prefer mobile layout

    // Always use mobile layout for now since it's fully functional
    return <POSViewMobile />;
};

export default POSViewUnified;