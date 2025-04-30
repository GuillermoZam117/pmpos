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
import RestaurantIcon from '@mui/icons-material/Restaurant';
import TableCard from './TableCard';
import { getEntityScreenItems, getTicketByTable, createEmptyTicket } from '../queries';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../actions/auth';
import Debug from 'debug';
import { TABLE_STATUS } from '../constants/tableStatus';
import { terminalService } from '../services/terminalService';
import logo from '../../public/favicon.ico';  // Add this import

const debug = Debug('pmpos:tables');

const TableView = () => {
    const [error, setError] = useState(null);
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Update user selector to handle Immutable.js properly
    const user = useSelector(state => {
        const userData = state.auth.get('user');
        return userData && userData.toJS ? userData.toJS() : userData;
    });
    const isAuthenticated = useSelector(state => state.auth.get('isAuthenticated'));
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Error handler first
    const handleError = useCallback((err) => {
        debug('❌ Error:', err);
        setError(err.message);
    }, []);

    // Update handleTableClick to check user properly
    const handleTableClick = async (table) => {
        try {
            setLoading(true);
            setError(null);
            
            // Create ticket and assign table
            const ticket = await createEmptyTicket(table.name);
            
            if (!ticket?.uid) {
                throw new Error('Error al crear el ticket');
            }

            debug('✅ Ticket created:', ticket);

            // Update redux state
            dispatch({ 
                type: 'SET_CURRENT_TICKET', 
                payload: ticket 
            });

            // Navigate to POS with ticket info
            navigate('/pos', { 
                state: { 
                    ticket,
                    tableId: table.name,
                    isNew: true
                }
            });

        } catch (error) {
            debug('❌ Error:', error);
            setError(error.message || 'Error al crear ticket');
        } finally {
            setLoading(false);
        }
    };

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
        let mounted = true;
        let intervalId = null;

        if (!isAuthenticated) {
            debug('📤 Usuario no autenticado, limpiando datos...');
            setTables([]);
            navigate('/', { replace: true });
            return;
        }

        const fetchTables = async () => {
            if (!mounted) return;
            await loadTables();
        };

        fetchTables();
        intervalId = setInterval(() => fetchTables(), 30000);
        
        return () => {
            mounted = false;
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isAuthenticated, loadTables, navigate]);

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
            <AppBar position="sticky">
                <Toolbar sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    width: '100%',
                    px: 2 // Add padding
                }}>
                    {/* Logo y título */}
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 2,
                        ml: 2 // Add left margin
                    }}>
                        <img 
                            src={logo}
                            alt="Logo" 
                            style={{ 
                                width: '32px',
                                height: '32px',
                                objectFit: 'contain',
                                filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))'  // Add shadow
                            }} 
                        />
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            SambasoftMX
                        </Typography>
                    </Box>

                    {/* Usuario y botón de logout */}
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 2 
                    }}>
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