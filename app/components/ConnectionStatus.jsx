import React, { useState, useEffect } from 'react';
import {
    Alert,
    Snackbar,
    Box,
    Typography,
    Button,
    LinearProgress,
    Chip
} from '@mui/material';
import {
    WifiOff as OfflineIcon,
    Wifi as OnlineIcon,
    Warning as WarningIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import networkHealthService from '../services/networkHealthService';

const ConnectionStatus = () => {
    const [networkStatus, setNetworkStatus] = useState(networkHealthService.getSambaPOSStatus());
    const [showAlert, setShowAlert] = useState(false);
    const [retrying, setRetrying] = useState(false);

    useEffect(() => {
        const checkInterval = setInterval(() => {
            const status = networkHealthService.getSambaPOSStatus();
            setNetworkStatus(status);

            // Mostrar alerta si hay problemas de conectividad
            if (status.status === 'offline' || status.status === 'timeout') {
                setShowAlert(true);
            } else if (status.status === 'online') {
                setShowAlert(false);
            }
        }, 10000); // Check every 10 seconds (reduced frequency from 5s)

        return () => clearInterval(checkInterval);
    }, []);

    const handleRetry = async () => {
        setRetrying(true);
        try {
            await networkHealthService.checkSambaPOSConnectivity();
            const newStatus = networkHealthService.getSambaPOSStatus();
            setNetworkStatus(newStatus);

            if (newStatus.status === 'online') {
                setShowAlert(false);
                // Intentar recargar la página para reinicializar tokens
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        } catch (error) {
            console.error('Retry failed:', error);
        } finally {
            setRetrying(false);
        }
    };

    const getStatusInfo = () => {
        switch (networkStatus.status) {
            case 'online':
                return {
                    severity: 'success',
                    icon: <OnlineIcon />,
                    title: 'Conectado',
                    message: 'Conexión con SambaPOS establecida'
                };
            case 'timeout':
                return {
                    severity: 'warning',
                    icon: <WarningIcon />,
                    title: 'Conexión Lenta',
                    message: 'El servidor SambaPOS responde lentamente. Verifica la red.'
                };
            case 'offline':
                return {
                    severity: 'error',
                    icon: <OfflineIcon />,
                    title: 'Sin Conexión',
                    message: 'No se puede conectar al servidor SambaPOS. Verifica que esté ejecutándose.'
                };
            default:
                return {
                    severity: 'info',
                    icon: <WarningIcon />,
                    title: 'Verificando...',
                    message: 'Verificando conexión con SambaPOS...'
                };
        }
    };

    const statusInfo = getStatusInfo();

    // No mostrar chip de estado en la esquina cuando todo está bien
    // ya que ahora se muestra integrado en TerminalStatus
    if (networkStatus.status === 'online' && !showAlert) {
        return null; // No mostrar nada cuando está conectado
    }

    return (
        <>
            <Snackbar
                open={showAlert}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                autoHideDuration={null} // No auto-hide for connection issues
            >
                <Alert
                    severity={statusInfo.severity}
                    variant="filled"
                    sx={{ minWidth: 300 }}
                    action={
                        <Button
                            color="inherit"
                            size="small"
                            onClick={handleRetry}
                            disabled={retrying}
                            startIcon={<RefreshIcon />}
                        >
                            {retrying ? 'Reintentando...' : 'Reintentar'}
                        </Button>
                    }
                >
                    <Box>
                        <Typography variant="body2" fontWeight="bold">
                            {statusInfo.title}
                        </Typography>
                        <Typography variant="body2">
                            {statusInfo.message}
                        </Typography>
                        {retrying && (
                            <LinearProgress
                                sx={{ mt: 1 }}
                                color="inherit"
                            />
                        )}
                        {networkStatus.lastCheck && (
                            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                Última verificación: {networkStatus.lastCheck.toLocaleTimeString()}
                            </Typography>
                        )}
                    </Box>
                </Alert>
            </Snackbar>
        </>
    );
};

export default ConnectionStatus;
