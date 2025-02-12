import React from 'react';
import { Box, CircularProgress } from '@mui/material';

const Loading = () => (
    <Box
        sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default'
        }}
    >
        <CircularProgress />
    </Box>
);

export default Loading;