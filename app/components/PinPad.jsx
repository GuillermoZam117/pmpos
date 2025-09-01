import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Grid, Paper, Alert, CircularProgress, useTheme, useMediaQuery, IconButton, Tooltip, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login } from '../actions/auth';
import { useTheme as useCustomTheme } from '../contexts/ThemeContext';
import { Clear as ClearIcon, Login as LoginIcon, Brightness4 as Brightness4Icon, Brightness7 as Brightness7Icon, CheckCircle as ReadyIcon, HourglassEmpty as LoadingIcon } from '@mui/icons-material';
import { useTokenPreload } from '../hooks/useTokenPreload';
import logo from '../assets/logo.png';

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
  const theme = useTheme();
  const { toggleTheme, isDarkMode } = useCustomTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isAuthenticated = useSelector(state => state.auth.get('isAuthenticated'));
  const { isPreloading, hasPreloadedToken, isReady } = useTokenPreload();
  const authError = useSelector(state => state.auth.get('error'));
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🔄 Auth state changed - navigating to tables');
      // Only navigate if we're actually in PinPad view, not from other contexts
      const currentPath = window.location.hash?.replace('#', '') || window.location.pathname;
      if (currentPath === '/pinpad' || currentPath === '/' || currentPath === '') {
        navigate('/tables', { replace: true });
      }
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
    // Allow up to 32 digits (same as TextField inputProps)
    const MAX_LEN = 32;
    if (pin.length < MAX_LEN) {
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
      bgcolor: 'background.default',
      position: 'relative'
    }}>
      {/* Theme Toggle - Top Right Corner */}
      <Box sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000
      }}>
        <Tooltip title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
          <IconButton 
            onClick={toggleTheme}
            color="primary"
            sx={{
              backgroundColor: 'background.paper',
              boxShadow: 2,
              '&:hover': {
                backgroundColor: 'action.hover',
                boxShadow: 4
              }
            }}
          >
            {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Tooltip>
      </Box>
      <Paper 
        elevation={3} 
        sx={{ 
          p: isMobile ? (isSmallMobile ? 2 : 3) : 3, 
          width: '100%', 
          maxWidth: isMobile ? (isSmallMobile ? 300 : 360) : 320, // Reduced from 400 to 320
          borderRadius: 3,
          mx: 2
        }}
      >
        {/* SambaPOS Logo */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <img 
            src={logo} 
            alt="SambaPOS" 
            style={{ 
              maxWidth: '200px', 
              maxHeight: '120px',
              objectFit: 'contain'
            }} 
          />
        </Box>
        
        {/* Token Preload Status Indicator */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          {isPreloading ? (
            <Chip 
              icon={<LoadingIcon />}
              label="Preparando..."
              size="small"
              color="warning"
              sx={{ fontSize: '0.75rem' }}
            />
          ) : isReady ? (
            <Chip 
              icon={<ReadyIcon />}
              label="Listo para login instantáneo"
              size="small"
              color="success"
              sx={{ fontSize: '0.75rem' }}
            />
          ) : null}
        </Box>
        
        <Typography 
          variant={isMobile ? (isSmallMobile ? 'h5' : 'h4') : 'h5'} 
          align="center" 
          gutterBottom
          sx={{ mb: 2 }}
        >
          SambasoftMX
        </Typography>
        
        {/* Enhanced Mobile-Friendly PIN Input */}
        <TextField
          fullWidth
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          disabled={loading}
          placeholder="••••"
          sx={{ 
            mb: 3,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              boxShadow: 1
            }
          }}
          inputProps={{
            maxLength: 32,
            pattern: '[0-9]*',
            inputMode: 'numeric',
            style: { 
              fontSize: isMobile ? (isSmallMobile ? '2.5rem' : '2.8rem') : '2rem',
              fontWeight: 'bold',
              letterSpacing: isMobile ? '0.8em' : '0.5em',
              textAlign: 'center',
              padding: isMobile ? '20px' : '16px'
            }
          }}
        />

        {/* Compact Numeric Pad with Icons */}
        <Grid container spacing={1}>
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
                sx={{ 
                  height: isMobile ? (isSmallMobile ? 56 : 60) : 52, // Reduced from 72-80 to 52-60
                  minHeight: 52,
                  fontSize: isMobile ? (isSmallMobile ? '1.5rem' : '1.6rem') : '1.3rem', // Reduced font size
                  fontWeight: 'bold',
                  borderRadius: 2,
                  boxShadow: 2,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: 3
                  },
                  '&:active': {
                    transform: 'translateY(0px)',
                    boxShadow: 2
                  },
                  // Special styling for action buttons
                  ...(key === 'C' && {
                    backgroundColor: theme.palette.error.main,
                    '&:hover': {
                      backgroundColor: theme.palette.error.dark,
                      transform: 'translateY(-1px)',
                      boxShadow: 3
                    }
                  }),
                  ...(key === '⏎' && {
                    backgroundColor: theme.palette.success.main,
                    '&:hover': {
                      backgroundColor: theme.palette.success.dark,
                      transform: 'translateY(-1px)',
                      boxShadow: 3
                    }
                  })
                }}
              >
                <Box sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  px: 0.5
                }}>
                  {key === 'C' ? (
                    <ClearIcon sx={{ fontSize: isMobile ? '1.5rem' : '1.3rem' }} />
                  ) : key === '⏎' ? (
                    <LoginIcon sx={{ fontSize: isMobile ? '1.5rem' : '1.3rem' }} />
                  ) : (
                    key
                  )}
                </Box>
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
