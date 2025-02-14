import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Grid, Paper, Alert, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login } from '../actions/auth';

const PinButton = styled(Button)(({ theme }) => ({
  width: '80px',
  height: '80px',
  margin: '5px',
  fontSize: '24px',
  borderRadius: '8px',
  backgroundColor: theme.palette.mode === 'light' ? '#f5f5f5' : '#424242'
}));

const PinPad = () => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useSelector(state => state.auth.get('isAuthenticated'));
  const authError = useSelector(state => state.auth.get('error'));
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🔄 Auth state changed - navigating to tables');
      navigate('/tables', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handlePinSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const success = await dispatch(login(pin));
      if (!success) {
        setError('PIN inválido');
        setPin('');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePinClick = (value) => {
    if (pin.length < 4) {
      setPin(pin + value);
    }
  };

  const handleClear = () => setPin('');

  return (
    <Box sx={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: 'background.default'
    }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          width: '100%', 
          maxWidth: 400,
          borderRadius: 2 
        }}
      >
        <Typography variant="h4" align="center" gutterBottom>
          SambaPOS
        </Typography>
        
        {/* PIN Input with mask */}
        <TextField
          fullWidth
          type="password"
          value={pin}
          disabled={loading}
          placeholder="••••"
          sx={{ mb: 3 }}
          inputProps={{
            maxLength: 4,
            style: { 
              fontSize: '2rem',
              letterSpacing: '0.5em',
              textAlign: 'center'
            }
          }}
        />

        {/* Numeric Pad */}
        <Grid container spacing={2}>
          {[1,2,3,4,5,6,7,8,9,'C',0,'⏎'].map(key => (
            <Grid item xs={4} key={key}>
              <Button
                fullWidth
                variant="contained"
                disabled={loading}
                onClick={() => {
                  if (key === 'C') handleClear();
                  else if (key === '⏎') handlePinSubmit();
                  else handlePinClick(key);
                }}
                sx={{ height: 64 }}
              >
                {key}
              </Button>
            </Grid>
          ))}
        </Grid>

        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {/* Loading Indicator */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default PinPad;