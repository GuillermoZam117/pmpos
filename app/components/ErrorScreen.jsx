import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const ErrorScreen = ({ error, onRetry }) => (
  <Box
    sx={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3
    }}
  >
    <ErrorOutlineIcon sx={{ fontSize: 60, color: 'error.main' }} />
    <Typography variant="h6" color="error">
      {error || 'Ha ocurrido un error'}
    </Typography>
    <Button variant="contained" onClick={onRetry}>
      Reintentar
    </Button>
  </Box>
);

export default ErrorScreen;