/**
 * Terminal Status Component
 * Shows terminal registration status and provides manual registration option
 */
import React, { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Button,
    Box,
    Alert,
    Chip,
    IconButton,
    Collapse,
    LinearProgress,
    Tooltip
} from '@mui/material';
import {
    Computer as TerminalIcon,
    CheckCircle as SuccessIcon,
    Error as ErrorIcon,
    Refresh as RefreshIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Wifi as ConnectedIcon,
    WifiOff as DisconnectedIcon
} from '@mui/icons-material';
import terminalService from '../services/terminalService';
import networkHealthService from '../services/networkHealthService';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';

const TerminalStatus = ({ showManualRegistration = true, compact = false }) => {
    const [terminalId, setTerminalId] = useState(null);
    const [isRegistering, setIsRegistering] = useState(false);
    const [registrationError, setRegistrationError] = useState(null);
    const [expanded, setExpanded] = useState(false);
    const [retryAttempt, setRetryAttempt] = useState(0);
    const [networkStatus, setNetworkStatus] = useState(networkHealthService.getSambaPOSStatus());

    const user = useSelector(state => state.auth.get('user'));
    const userName = user?.name || 'Unknown';

    useEffect(() => {
        checkTerminalStatus();

        // Check network status periodically
        const networkInterval = setInterval(() => {
            const status = networkHealthService.getSambaPOSStatus();
            setNetworkStatus(status);
        }, 10000); // Check network status every 10 seconds (reduced from 5s)

        // Listen for terminal registration events
        const cleanup = terminalService.onRegistered((user, terminalId) => {
            console.log(`🔔 Terminal registered: ${terminalId}`);
            setTerminalId(terminalId);
            setRegistrationError(null);
            setRetryAttempt(0);
        });

        return () => {
            clearInterval(networkInterval);
            cleanup();
        };
    }, []);

    const checkTerminalStatus = () => {
        const currentTerminalId = terminalService.getTerminalId();
        setTerminalId(currentTerminalId);

        if (currentTerminalId) {
            setRegistrationError(null);
        }
    };

    const handleManualRegistration = async () => {
        if (isRegistering) return;

        setIsRegistering(true);
        setRegistrationError(null);
        setRetryAttempt(prev => prev + 1);

        try {
            console.log('🔄 Manual terminal registration initiated...');

            // Force re-registration
            const newTerminalId = await terminalService.forceReRegister(userName);

            if (newTerminalId) {
                setTerminalId(newTerminalId);
                console.log('✅ Manual registration successful:', newTerminalId);
            } else {
                throw new Error('Registration returned no terminal ID');
            }

        } catch (error) {
            console.error('❌ Manual registration failed:', error);
            setRegistrationError(error.message || 'Registration failed');
        } finally {
            setIsRegistering(false);
        }
    };

    const getStatusColor = () => {
        if (terminalId) return 'success';
        if (registrationError) return 'error';
        if (isRegistering) return 'warning';
        return 'default';
    };

    const getStatusIcon = () => {
        if (isRegistering) return <RefreshIcon className="rotating" />;
        if (terminalId) return <SuccessIcon color="success" />;
        if (registrationError) return <ErrorIcon color="error" />;
        return <DisconnectedIcon color="disabled" />;
    };

    const getStatusText = () => {
        if (isRegistering) return `Registrando... (intento ${retryAttempt})`;
        if (terminalId) return 'Terminal Registrado';
        if (registrationError) return 'Error de Registro';
        return 'Terminal No Registrado';
    };

    const getNetworkStatusIcon = () => {
        switch (networkStatus.status) {
            case 'online':
                return <ConnectedIcon />;
            case 'offline':
            case 'timeout':
            default:
                return <DisconnectedIcon />;
        }
    };

    const getNetworkStatusColor = () => {
        switch (networkStatus.status) {
            case 'online':
                return 'success';
            case 'timeout':
                return 'warning';
            case 'offline':
            default:
                return 'error';
        }
    };

    const getNetworkStatusText = () => {
        switch (networkStatus.status) {
            case 'online':
                return 'Conectado';
            case 'timeout':
                return 'Lento';
            case 'offline':
            default:
                return 'Sin Conexión';
        }
    };

    if (compact) {
        return (
            <Box display="flex" alignItems="center" gap={1}>
                {/* Estado de Conexión */}
                <Tooltip title={`SambaPOS: ${getNetworkStatusText()}`}>
                    <Chip
                        icon={getNetworkStatusIcon()}
                        label={getNetworkStatusText()}
                        color={getNetworkStatusColor()}
                        size="small"
                        variant="filled"
                    />
                </Tooltip>

                {/* Estado del Terminal */}
                <Tooltip title={getStatusText()}>
                    <Chip
                        icon={getStatusIcon()}
                        label={terminalId ? `Terminal: ${terminalId.slice(-8)}` : getStatusText()}
                        color={getStatusColor()}
                        size="small"
                        variant={terminalId ? 'filled' : 'outlined'}
                    />
                </Tooltip>

                {showManualRegistration && !terminalId && (
                    <Tooltip title="Registro Manual">
                        <IconButton
                            size="small"
                            onClick={handleManualRegistration}
                            disabled={isRegistering}
                        >
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>
        );
    }

    return (
        <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={2}>
                        <TerminalIcon color="primary" />
                        <Box>
                            <Typography variant="h6" component="div">
                                Estado del Terminal
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Usuario: {userName}
                            </Typography>
                        </Box>
                    </Box>

                    <Box display="flex" alignItems="center" gap={1}>
                        {getStatusIcon()}
                        <Typography variant="body1" fontWeight="bold">
                            {getStatusText()}
                        </Typography>

                        <IconButton
                            onClick={() => setExpanded(!expanded)}
                            size="small"
                        >
                            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                    </Box>
                </Box>

                {isRegistering && (
                    <Box mt={2}>
                        <LinearProgress />
                        <Typography variant="body2" color="text.secondary" align="center" mt={1}>
                            Conectando con SambaPOS...
                        </Typography>
                    </Box>
                )}

                <Collapse in={expanded}>
                    <Box mt={2}>
                        {/* Información de conexión */}
                        <Alert
                            severity={networkStatus.status === 'online' ? 'success' : networkStatus.status === 'timeout' ? 'warning' : 'error'}
                            sx={{ mb: 2 }}
                        >
                            <Typography variant="body2">
                                <strong>Conexión SambaPOS:</strong> {getNetworkStatusText()}<br />
                                <strong>Estado:</strong> {networkStatus.status === 'online' ? 'Servidor accesible' :
                                    networkStatus.status === 'timeout' ? 'Respuesta lenta' : 'Servidor no disponible'}<br />
                                {networkStatus.lastCheck && (
                                    <>
                                        <strong>Última verificación:</strong> {networkStatus.lastCheck.toLocaleTimeString()}
                                    </>
                                )}
                            </Typography>
                        </Alert>

                        {/* Información del terminal */}
                        {terminalId ? (
                            <Alert severity="success" sx={{ mb: 2 }}>
                                <Typography variant="body2">
                                    <strong>Terminal ID:</strong> {terminalId}<br />
                                    <strong>Estado:</strong> Registrado en SambaPOS<br />
                                    <strong>Usuario:</strong> {userName}<br />
                                    <strong>Funcionalidad:</strong> Crear tickets, agregar órdenes, procesar pagos
                                </Typography>
                            </Alert>
                        ) : (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                <Typography variant="body2">
                                    El terminal no está registrado con SambaPOS.
                                    Algunas funcionalidades pueden estar limitadas:
                                </Typography>
                                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                                    <li>No se pueden crear tickets en el servidor</li>
                                    <li>Los tickets se almacenan localmente</li>
                                    <li>La sincronización está deshabilitada</li>
                                </ul>
                            </Alert>
                        )}

                        {registrationError && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                <Typography variant="body2">
                                    <strong>Error:</strong> {registrationError}
                                </Typography>
                                <Typography variant="body2" mt={1}>
                                    Posibles causas:
                                </Typography>
                                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                                    <li>SambaPOS no está ejecutándose</li>
                                    <li>Message Server API no está habilitado</li>
                                    <li>Usuario "{userName}" no existe en SambaPOS</li>
                                    <li>Problema de conectividad de red</li>
                                </ul>
                            </Alert>
                        )}

                        {showManualRegistration && (
                            <Box display="flex" gap={2}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleManualRegistration}
                                    disabled={isRegistering}
                                    startIcon={isRegistering ? <RefreshIcon className="rotating" /> : <ConnectedIcon />}
                                >
                                    {isRegistering ? 'Registrando...' : 'Registrar Terminal'}
                                </Button>

                                <Button
                                    variant="outlined"
                                    onClick={checkTerminalStatus}
                                    disabled={isRegistering}
                                    startIcon={<RefreshIcon />}
                                >
                                    Verificar Estado
                                </Button>
                            </Box>
                        )}

                        <Typography variant="caption" color="text.secondary" display="block" mt={2}>
                            El registro del terminal es automático durante el login.
                            Use el botón manual solo si hay problemas de conexión.
                        </Typography>
                    </Box>
                </Collapse>
            </CardContent>

            <style>{`
                .rotating {
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </Card>
    );
};

TerminalStatus.propTypes = {
    showManualRegistration: PropTypes.bool,
    compact: PropTypes.bool
};

export default TerminalStatus;