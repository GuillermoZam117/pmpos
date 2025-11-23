import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Grid,
  Paper,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip,
  Chip,
  Collapse,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Tabs,
  Tab
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login } from '../actions/auth';
import { useTheme as useCustomTheme } from '../contexts/ThemeContext';
import { Clear as ClearIcon, Login as LoginIcon, Brightness4 as Brightness4Icon, Brightness7 as Brightness7Icon, CheckCircle as ReadyIcon, HourglassEmpty as LoadingIcon } from '@mui/icons-material';
import { useTokenPreload } from '../hooks/useTokenPreload';
import logo from '../assets/logo.png';
import { appconfig } from '../config';
import { SALES_MODES, DEFAULT_SALES_MODE, resolveSalesMode } from '../config/salesModes';

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
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [configTab, setConfigTab] = useState('sales');
  const [applyStatus, setApplyStatus] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const { toggleTheme, isDarkMode } = useCustomTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isAuthenticated = useSelector(state => state.auth.get('isAuthenticated'));
  const { isPreloading, hasPreloadedToken, isReady } = useTokenPreload();
  const authError = useSelector(state => state.auth.get('error'));
  const initialConfig = React.useMemo(() => {
    try {
      return appconfig();
    } catch {
      return {};
    }
  }, []);
  const initialModeKey = initialConfig?.salesMode?.key || localStorage.getItem('SAMBAPOS_SALES_MODE') || DEFAULT_SALES_MODE;
  const [salesModeKey, setSalesModeKey] = useState(initialModeKey);
  const [configValues, setConfigValues] = useState({
    departmentName: initialConfig?.departmentName || '',
    ticketTypeName: initialConfig?.ticketTypeName || '',
    entityTypeName: initialConfig?.entityTypeName || '',
    entityScreenName: initialConfig?.entityScreenName || '',
    menuName: initialConfig?.menuName || ''
  });
  const initialSqlConfig = React.useMemo(() => {
    if (typeof window === 'undefined') return {};
    return {
      host: localStorage.getItem('READ_SERVICE_SQL_HOST') || 'localhost',
      port: localStorage.getItem('READ_SERVICE_SQL_PORT') || '1433',
      database: localStorage.getItem('READ_SERVICE_SQL_DB') || '',
      user: localStorage.getItem('READ_SERVICE_SQL_USER') || '',
      password: localStorage.getItem('READ_SERVICE_SQL_PASSWORD') || ''
    };
  }, []);
  const [sqlConfig, setSqlConfig] = useState(initialSqlConfig);
  const [sqlConfigLoaded, setSqlConfigLoaded] = useState(false);
  const [sqlStatus, setSqlStatus] = useState({ state: 'idle', message: '' });
  const [sqlConnected, setSqlConnected] = useState(null);
  const [sqlActionLoading, setSqlActionLoading] = useState(false);

  const fetchSqlHelperStatus = React.useCallback(async () => {
    if (typeof fetch !== 'function') return;
    try {
      const resp = await fetch('/internal-api/sql-config');
      if (!resp.ok) throw new Error('No se pudo obtener el estado del helper SQL');
      const data = await resp.json();
      if (!sqlConfigLoaded && data?.config) {
        setSqlConfig(prev => ({
          ...prev,
          host: data.config.host ?? prev.host,
          port: data.config.port ?? prev.port,
          database: data.config.database ?? prev.database,
          user: data.config.user ?? prev.user
        }));
        setSqlConfigLoaded(true);
      }
      if (typeof data?.connected === 'boolean') {
        setSqlConnected(data.connected);
        if (!sqlStatus.message) {
          setSqlStatus({
            state: data.connected ? 'success' : 'warning',
            message: data.connected ? 'Helper SQL conectado' : 'Helper sin conexión'
          });
        }
      }
    } catch (err) {
      if (!sqlStatus.message) {
        setSqlStatus({ state: 'error', message: err.message || 'No se pudo leer la configuración SQL' });
      }
    }
  }, [sqlConfigLoaded, sqlStatus.message]);

  useEffect(() => {
    fetchSqlHelperStatus();
  }, [fetchSqlHelperStatus]);
  useEffect(() => {
    if (!isAuthenticated) return;
    const currentPath = window.location.hash?.replace('#', '') || window.location.pathname;
    if (!(currentPath === '/pinpad' || currentPath === '/' || currentPath === '')) return;
    const targetMode = salesModeKey || localStorage.getItem('SAMBAPOS_SALES_MODE') || DEFAULT_SALES_MODE;
    const targetRoute = targetMode === 'mostrador' ? '/pos' : '/tables';
    navigate(targetRoute, { replace: true, state: { salesMode: targetMode } });
  }, [isAuthenticated, navigate, salesModeKey]);

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

  const handleModeChange = (modeKey) => {
    setSalesModeKey(modeKey);
    const preset = resolveSalesMode(modeKey);
    setConfigValues(prev => ({
      departmentName: preset.departmentName || prev.departmentName,
      ticketTypeName: preset.ticketTypeName || prev.ticketTypeName,
      entityTypeName: preset.entityTypeName || '',
      entityScreenName: preset.entityScreenName || '',
      menuName: preset.menuName || prev.menuName || 'MENU'
    }));
    setApplyStatus(null);
  };

  const handleConfigFieldChange = (field, value) => {
    setConfigValues(prev => ({ ...prev, [field]: value }));
    setApplyStatus(null);
  };

  const handleApplyConfig = () => {
    try {
      localStorage.setItem('SAMBAPOS_SALES_MODE', salesModeKey);
      localStorage.setItem('SAMBAPOS_DEPARTMENT', configValues.departmentName || '');
      localStorage.setItem('SAMBAPOS_TICKET_TYPE', configValues.ticketTypeName || '');
      if (configValues.entityTypeName) localStorage.setItem('SAMBAPOS_ENTITY_TYPE', configValues.entityTypeName);
      else localStorage.removeItem('SAMBAPOS_ENTITY_TYPE');
      if (configValues.entityScreenName) localStorage.setItem('SAMBAPOS_ENTITY_SCREEN', configValues.entityScreenName);
      else localStorage.removeItem('SAMBAPOS_ENTITY_SCREEN');
      if (configValues.menuName) localStorage.setItem('SAMBAPOS_MENU', configValues.menuName);
      else localStorage.removeItem('SAMBAPOS_MENU');
      setApplyStatus('success');
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      console.error('Failed to apply sales mode configuration', err);
      setApplyStatus('error');
    }
  };

  const handleSqlFieldChange = (field, value) => {
    setSqlConfig(prev => ({ ...prev, [field]: value }));
    setSqlStatus({ state: 'idle', message: '' });
  };

  const handleApplySqlConfig = async () => {
    setSqlActionLoading(true);
    setSqlStatus({ state: 'saving', message: 'Guardando configuración SQL...' });
    try {
      localStorage.setItem('READ_SERVICE_SQL_HOST', sqlConfig.host || '');
      localStorage.setItem('READ_SERVICE_SQL_PORT', sqlConfig.port || '');
      localStorage.setItem('READ_SERVICE_SQL_DB', sqlConfig.database || '');
      localStorage.setItem('READ_SERVICE_SQL_USER', sqlConfig.user || '');
      localStorage.setItem('READ_SERVICE_SQL_PASSWORD', sqlConfig.password || '');
      const resp = await fetch('/internal-api/sql-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sqlConfig)
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.error || 'No se pudo guardar la configuración del helper');
      }
      setSqlStatus({ state: 'success', message: data?.message || 'Configuración aplicada' });
      await fetchSqlHelperStatus();
    } catch (err) {
      console.error('Failed to save SQL helper configuration', err);
      setSqlStatus({ state: 'error', message: err.message || 'No se pudo guardar la configuración del helper' });
    } finally {
      setSqlActionLoading(false);
    }
  };

  const handleTestSqlConnection = async () => {
    setSqlActionLoading(true);
    setSqlStatus({ state: 'testing', message: 'Probando conexión...' });
    try {
      const resp = await fetch('/internal-api/sql-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sqlConfig)
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.error || 'No se pudo establecer la conexión');
      }
      setSqlStatus({ state: 'success', message: data?.message || 'Conexión exitosa' });
    } catch (err) {
      setSqlStatus({ state: 'error', message: err.message || 'No se pudo conectar con SQL Server' });
    } finally {
      setSqlActionLoading(false);
    }
  };

  const handleReloadSqlHelper = async () => {
    setSqlActionLoading(true);
    setSqlStatus({ state: 'info', message: 'Reiniciando helper SQL...' });
    try {
      const resp = await fetch('/internal-api/sql-config/reload', { method: 'POST' });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.error || 'No se pudo reiniciar la conexión');
      }
      setSqlStatus({ state: 'success', message: data?.message || 'Helper SQL reiniciado' });
      await fetchSqlHelperStatus();
    } catch (err) {
      setSqlStatus({ state: 'error', message: err.message || 'No se pudo reiniciar la conexión SQL' });
    } finally {
      setSqlActionLoading(false);
    }
  };

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

        {/* Auth Error */}
        {authError && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {authError}
          </Alert>
        )}

        {/* Loading Indicator */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress />
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Button
          fullWidth
          variant="outlined"
          size="small"
          onClick={() => setShowConfigPanel(!showConfigPanel)}
        >
          {showConfigPanel ? 'Ocultar configuración avanzada' : 'Configurar tipo de venta'}
        </Button>

        <Collapse in={showConfigPanel} timeout="auto" unmountOnExit>
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Modo actual: {initialConfig?.salesMode?.label || resolveSalesMode(initialModeKey).label}
            </Alert>
            <Stack spacing={2}>
              <Tabs value={configTab} onChange={(_, v) => setConfigTab(v)} variant="fullWidth">
                <Tab label="Tipo de venta" value="sales" />
                <Tab label="SQL Helper" value="sql" />
              </Tabs>

              {configTab === 'sales' && (
                <Stack spacing={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="sales-mode-label">Tipo de venta</InputLabel>
                    <Select
                      labelId="sales-mode-label"
                      label="Tipo de venta"
                      value={salesModeKey}
                      onChange={(e) => handleModeChange(e.target.value)}
                    >
                      {Object.entries(SALES_MODES).map(([key, mode]) => (
                        <MenuItem key={key} value={key}>{mode.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    label="Departamento"
                    size="small"
                    value={configValues.departmentName}
                    onChange={(e) => handleConfigFieldChange('departmentName', e.target.value)}
                    helperText="Ej. VENTAS"
                  />

                  <TextField
                    label="Tipo de ticket"
                    size="small"
                    value={configValues.ticketTypeName}
                    onChange={(e) => handleConfigFieldChange('ticketTypeName', e.target.value)}
                    helperText="Ej. TICKET / REPARTO"
                  />

                  <TextField
                    label="Entity Type"
                    size="small"
                    value={configValues.entityTypeName || ''}
                    onChange={(e) => handleConfigFieldChange('entityTypeName', e.target.value)}
                    helperText="Vacío para mostrador"
                  />

                  <TextField
                    label="Entity Screen"
                    size="small"
                    value={configValues.entityScreenName || ''}
                    onChange={(e) => handleConfigFieldChange('entityScreenName', e.target.value)}
                    helperText="Ej. MESAS / CLIENTES"
                  />
                  {salesModeKey !== 'mostrador' && (
                    <TextField
                      label="Menú"
                      size="small"
                      value={configValues.menuName || ''}
                      onChange={(e) => handleConfigFieldChange('menuName', e.target.value)}
                      helperText="Nombre exacto del menú en SambaPOS (ej. MENU)"
                    />
                  )}

                  <Button variant="contained" color="primary" onClick={handleApplyConfig}>
                    Guardar y recargar
                  </Button>

                  {applyStatus === 'success' && (
                    <Alert severity="success">Configuración guardada. Recargando...</Alert>
                  )}
                  {applyStatus === 'error' && (
                    <Alert severity="error">No se pudo guardar la configuración.</Alert>
                  )}
                </Stack>
              )}

              {configTab === 'sql' && (
                <Stack spacing={2}>
                  {typeof sqlConnected === 'boolean' && (
                    <Alert severity={sqlConnected ? 'success' : 'warning'}>
                      {sqlConnected ? 'Helper SQL conectado correctamente.' : 'Helper SQL sin conexión. Actualiza los datos y prueba nuevamente.'}
                    </Alert>
                  )}
                  <TextField
                    label="Servidor SQL"
                    size="small"
                    value={sqlConfig.host}
                    onChange={(e) => handleSqlFieldChange('host', e.target.value)}
                    helperText="IP o nombre del servidor"
                  />
                  <TextField
                    label="Puerto"
                    size="small"
                    value={sqlConfig.port}
                    onChange={(e) => handleSqlFieldChange('port', e.target.value)}
                  />
                  <TextField
                    label="Base de datos"
                    size="small"
                    value={sqlConfig.database}
                    onChange={(e) => handleSqlFieldChange('database', e.target.value)}
                    helperText="Nombre exacto usado por SambaPOS"
                  />
                  <TextField
                    label="Usuario"
                    size="small"
                    value={sqlConfig.user}
                    onChange={(e) => handleSqlFieldChange('user', e.target.value)}
                  />
                  <TextField
                    label="Contraseña"
                    size="small"
                    type="password"
                    value={sqlConfig.password}
                    onChange={(e) => handleSqlFieldChange('password', e.target.value)}
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Button
                      variant="contained"
                      onClick={handleApplySqlConfig}
                      disabled={sqlActionLoading}
                    >
                      Guardar configuración SQL
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleTestSqlConnection}
                      disabled={sqlActionLoading}
                    >
                      Probar conexión
                    </Button>
                    <Button
                      variant="text"
                      onClick={handleReloadSqlHelper}
                      disabled={sqlActionLoading}
                    >
                      Reiniciar helper
                    </Button>
                  </Stack>
                  {sqlStatus.message && (
                    <Alert
                      severity={sqlStatus.state === 'error' ? 'error' : sqlStatus.state === 'success' ? 'success' : 'info'}
                    >
                      {sqlStatus.message}
                    </Alert>
                  )}
                </Stack>
              )}
            </Stack>
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
};

export default PinPad;
