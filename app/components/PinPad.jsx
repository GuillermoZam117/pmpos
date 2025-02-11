import React, { useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const PinButton = styled(Button)(({ theme }) => ({
  width: '80px',
  height: '80px',
  margin: '5px',
  fontSize: '24px',
  borderRadius: '8px',
  backgroundColor: theme.palette.mode === 'light' ? '#f5f5f5' : '#424242'
}));

const PinPad = ({ onAuthenticate }) => {
  const [pin, setPin] = useState('');

  const handlePinClick = (value) => {
    if (pin.length < 4) {
      setPin(pin + value);
    }
  };

  const handleSubmit = async () => {
    try {
      const result = await authenticateUser(pin);
      if (result.success) {
        onAuthenticate(result);
      }
    } catch (error) {
      console.error('PIN authentication failed:', error);
    }
  };

  const handleClear = () => setPin('');

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      p: 3,
      backgroundColor: (theme) => 
        theme.palette.mode === 'light' ? '#ffffff' : '#303030'
    }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Ingrese PIN
      </Typography>
      
      <TextField
        type="password"
        value={pin}
        inputProps={{
          style: { 
            fontSize: '24px',
            textAlign: 'center',
            letterSpacing: '0.5em'
          }
        }}
        sx={{ mb: 3, width: '200px' }}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '⏎'].map((key) => (
          <PinButton
            key={key}
            onClick={() => {
              if (key === 'C') handleClear();
              else if (key === '⏎') handleSubmit();
              else handlePinClick(key);
            }}
          >
            {key}
          </PinButton>
        ))}
      </Box>
    </Box>
  );
};

export default PinPad;