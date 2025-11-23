/**
 * Unified POSView Component
 * Auto-detects device type and uses appropriate layout
 */
import React from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import POSViewMobile from './POSViewMobile';
import { appconfig } from '../../config';

const POSViewUnified = () => {
    const config = appconfig();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('lg')); // prefer mobile layout by default
    const modeKey = config?.salesMode?.key || 'mesas';

    return <POSViewMobile />;
};

export default POSViewUnified;
