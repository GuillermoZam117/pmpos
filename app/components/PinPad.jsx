import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../actions/auth';

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
  const dispatch = useDispatch();
  const auth = useSelector(state => state.auth);

  useEffect(() => {
    console.group('🔐 PIN Pad Component');
    console.log('PIN pad mounted');
    return () => {
      console.log('PIN pad unmounted');
      console.groupEnd();
    };
  }, []);

  const handlePinClick = (value) => {
    if (pin.length < 4) {
      setPin(pin + value);
    }
  };

  const handleSubmit = async () => {
    console.group('🔑 PIN Submit');
    console.time('PIN Authentication');
    
    try {
        console.log('Attempting login with PIN');
        const success = await dispatch(login(pin));
        if (success) {
            const userName = auth.user?.name;
            console.log('✅ Login successful:', userName);
        } else {
            console.log('❌ Login failed: Invalid PIN');
            setPin('');
        }
    } catch (error) {
        console.error('❌ Login failed:', error);
        setPin('');
    } finally {
        console.timeEnd('PIN Authentication');
        console.groupEnd();
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
            fontSize: '36px',
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
      <Button onClick={handleSubmit}>Submit</Button>
      {auth.error && (
        <Typography color="error">
          {auth.error}
        </Typography>
      )}
    </Box>
  );
};

export default PinPad;