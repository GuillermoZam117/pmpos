import React, { useEffect, useState, useCallback } from 'react';
import { 
    Box, 
    Typography, 
    Grid, 
    Alert, 
    Button,
    CircularProgress,
    AppBar,
    Toolbar,
    IconButton 
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import TableCard from './TableCard';
import { getEntityScreenItems, getTicketByTable } from '../queries';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../actions/auth';
import Debug from 'debug';

const debug = Debug('pmpos:tables');

const TableView = () => {
    const [error, setError] = useState(null);
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    const user = useSelector(state => state.auth.get('user'));
    const isAuthenticated = useSelector(state => state.auth.get('isAuthenticated'));
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Error handler first
    const handleError = useCallback((err) => {
        debug('❌ Error:', err);
        setError(err.message);
    }, []);

    // Then table click handler
    const handleTableClick = useCallback(async (table) => {
        debug('🎯 Table clicked:', table);
        
        try {
            if (table.status === 'LIBRE') {
                window.location.href = `http://localhost:9000/ticket/new?table=${table.name}`;
                return;
            }

            const ticket = await getTicketByTable(table.name);
            if (ticket) {
                debug('✅ Found ticket:', ticket.id);
                window.location.href = `http://localhost:9000/ticket/${ticket.id}`;
            } else {
                setError('No se encontró el ticket para esta mesa');
            }
        } catch (error) {
            debug('❌ Error getting ticket:', error);
            handleError(error);
        }
    }, [handleError]);

    const parseTableStatus = (table) => {
        if (!table) return 'BLOQUEADO';
        if (table.color === '#FF0000') return 'CUENTA';
        if (table.color === '#FFFF00') return 'OCUPADO';
        if (table.color === '#FFFFFF' || table.color === '#E5E3D8') return 'LIBRE';
        return 'BLOQUEADO';
    };

    const parseTimeFromCaption = (caption) => {
        if (!caption) return null;
        const match = caption.match(/(\d+)\s*min/);
        return match ? parseInt(match[1], 10) * 60000 : null;
    };

    const handleLogout = useCallback(async () => {
        debug('👋 Iniciando logout...');
        
        // Limpiar intervalos y estado
        setTables([]);
        
        try {
            await dispatch(logout());
            // Forzar navegación a pinpad
            navigate('/', { replace: true });
        } catch (error) {
            console.error('Error durante logout:', error);
        }
    }, [dispatch, navigate]);

    const loadTables = useCallback(async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            debug('🔄 Fetching tables from SambaPOS...');
            const items = await getEntityScreenItems('MESAS');
            
            // Process tables data
            const processedTables = items.map(table => ({
                ...table,
                status: parseTableStatus(table),
                timeElapsed: parseTimeFromCaption(table.caption)
            }));

            debug(`✅ Loaded ${processedTables.length} tables`);
            setTables(processedTables);
            setError(null);
        } catch (err) {
            debug('❌ Error loading tables:', err);
            setError(err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/pinpad', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        let mounted = true;
        let intervalId = null;
        
        if (isAuthenticated) {
            const fetchTables = async () => {
                if (!mounted) return;
                await loadTables();
            };

            fetchTables();
            intervalId = setInterval(() => fetchTables(), 30000);
        }
        
        return () => {
            mounted = false;
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isAuthenticated, loadTables]);

    useEffect(() => {
        if (!isAuthenticated) {
            console.log('📤 Usuario no autenticado, limpiando datos...');
            setTables([]);
            clearInterval(refreshInterval.current);
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    // If not authenticated, don't render anything
    if (!isAuthenticated) return null;

    if (error) {
        return (
            <Alert 
                severity="error" 
                action={
                    <Button color="inherit" onClick={() => window.location.reload()}>
                        Recargar
                    </Button>
                }
            >
                {error}
            </Alert>
        );
    }

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <AppBar position="sticky" color="default" elevation={1}>
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="h6">
                        SambaPOS
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1,  
                            px: 2, 
                            py: 0.5, 
                            bgcolor: 'action.selected',
                            borderRadius: 1 
                        }}>
                            <PersonIcon />
                            <Typography variant="body2">
                                {user?.name || user?.get('name') || 'Usuario'}
                            </Typography>
                        </Box>

                        <IconButton 
                            color="inherit"
                            onClick={handleLogout}
                            title="Cerrar sesión"
                        >
                            <LogoutIcon />
                        </IconButton>
                    </Box>
                </Toolbar>
            </AppBar>

            <Box sx={{ p: 3, flex: 1, overflow: 'auto' }}>
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3
                }}>
                    <Typography variant="h4">
                        Mesas
                    </Typography>
                    <Button
                        variant="outlined"
                        onClick={() => loadTables(true)}
                        disabled={refreshing}
                        startIcon={<RefreshIcon />}
                    >
                        {refreshing ? 'Actualizando...' : 'Actualizar'}
                    </Button>
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Alert 
                        severity="error"
                        action={
                            <Button color="inherit" size="small" onClick={() => loadTables()}>
                                Reintentar
                            </Button>
                        }
                    >
                        {error}
                    </Alert>
                ) : (
                    <Grid container spacing={2}>
                        {tables.map(table => (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={table.name}>
                                <TableCard 
                                    table={{
                                        ...table,
                                        labelColor: table.status === 'LIBRE' ? '#000000' : '#FFFFFF'
                                    }}
                                    onClick={() => handleTableClick(table)}
                                />
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Box>
        </Box>
    );
};


export default TableView;