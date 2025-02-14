import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingScreen = () => (
  <Box 
    sx={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2
    }}
  >
    <CircularProgress size={60} />
    <Typography variant="h6">
      Cargando SambaPOS...
    </Typography>
  </Box>
);

export default LoadingScreen;