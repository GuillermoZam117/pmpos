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
import { getEntityScreenItems, getTicketByTable, createEmptyTicket, getTerminalTicketsForTable, loadTerminalTicketWithOrders, createTerminalTicketAsync, changeEntityOfTerminalTicketAsync, registerTerminalAsync, debugTicketQueries, findTicketByTableAlternative } from '../queries';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../actions/auth';
import Debug from 'debug';
import { TABLE_STATUS } from '../constants/tableStatus';
import { terminalService } from '../services/terminalService';
import { appconfig } from '../config';
import cacheService from '../services/cacheService';
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
            
            const tableStatus = parseTableStatus(table);
            debug(`🔍 Clicked table ${table.name} with status: ${tableStatus}`);
            
            // First, register terminal to get terminalId
            debug('🔄 Registering terminal...');
            const terminalId = await registerTerminalAsync();
            debug('✅ Terminal registered:', terminalId);
            
            // Generate fallback terminal ID if registration fails
            const effectiveTerminalId = terminalId || `fallback_${Date.now()}`;
            
            // DEBUG: If this is Mesa 3, run debug queries
            if (table.name === 'Mesa 3') {
                debug('🔍 Running debug queries for Mesa 3...');
                await debugTicketQueries(effectiveTerminalId);
            }
            
            // Check if table is occupied (has existing ticket)
            if (tableStatus === 'OCUPADO') {
                debug('🎫 Table is occupied, looking for existing tickets...');
                try {
                    // Try the alternative ticket finding method first
                    debug('🔍 Using alternative ticket search...');
                    const existingTicket = await findTicketByTableAlternative(table.name);
                    
                    if (existingTicket) {
                        debug('✅ Found existing ticket using alternative method:', existingTicket);
                        // Use the terminalId from the ticket if available, otherwise use current
                        const ticketTerminalId = existingTicket.terminalId || effectiveTerminalId;
                        existingTicket.terminalId = ticketTerminalId;
                        
                        navigate('/pos', { 
                            state: { 
                                ticket: existingTicket,
                                tableId: table.name,
                                isNew: false
                            }
                        });
                        return;
                    }
                    
                    // Fallback to original method
                    debug('🔄 Fallback to original terminal tickets method...');
                    const existingTickets = await getTerminalTicketsForTable(effectiveTerminalId, table.name);
                    if (existingTickets && existingTickets.length > 0) {
                        // Load the most recent ticket for this table
                        const ticketForTable = existingTickets.find(ticket => 
                            ticket.entities && ticket.entities.some(entity => entity.name === table.name)
                        );
                        
                        if (ticketForTable) {
                            debug('✅ Found existing ticket for table:', ticketForTable);
                            // Load the complete ticket with orders
                            const fullTicket = await loadTerminalTicketWithOrders(effectiveTerminalId, ticketForTable.id);
                            if (fullTicket) {
                                debug('✅ Loaded complete ticket with orders:', fullTicket);
                                // Add terminalId to ticket for later use
                                fullTicket.terminalId = effectiveTerminalId;
                                navigate('/pos', { 
                                    state: { 
                                        ticket: fullTicket,
                                        tableId: table.name,
                                        isNew: false
                                    }
                                });
                                return;
                            }
                        }
                    }
                    debug('⚠️ No existing ticket found for occupied table, creating new one...');
                } catch (error) {
                    debug('❌ Error loading existing ticket:', error);
                    debug('⚠️ Falling back to creating new ticket...');
                }
            }
            
            // Create new ticket (either for LIBRE table or as fallback)
            debug(`🆕 Creating new ticket for table:`, table.name);
            const ticket = await createTerminalTicketAsync(effectiveTerminalId);
            debug('✅ New ticket created:', ticket);
            
            // Create a fallback ticket if GraphQL operations fail
            let updatedTicket = ticket || {
                id: `fallback_${Date.now()}`,
                uid: `fallback_${Date.now()}`,
                number: `TEMP-${Date.now()}`,
                date: new Date().toISOString(),
                totalAmount: 0,
                remainingAmount: 0,
                orders: [],
                entities: []
            };
            
            // Try to assign table to ticket, but continue if it fails
            try {
                if (ticket) {
                    debug(`🏷️ Assigning table ${table.name} to ticket...`);
                    const assignedTicket = await changeEntityOfTerminalTicketAsync(effectiveTerminalId, table.name);
                    if (assignedTicket) {
                        updatedTicket = assignedTicket;
                        debug('✅ Table assigned to ticket:', updatedTicket);
                    } else {
                        throw new Error('Assignment returned null');
                    }
                } else {
                    throw new Error('No ticket to assign table to');
                }
            } catch (assignError) {
                debug('⚠️ Could not assign table to ticket (continuing anyway):', assignError.message);
                // Create a ticket with table info manually added
                updatedTicket = {
                    ...updatedTicket,
                    entities: [{
                        name: table.name,
                        type: 'MESAS' // Using the entity type from config
                    }]
                };
                debug('✅ Table info added manually to ticket:', updatedTicket);
            }
            
            // Add terminalId to ticket for later use (ensure updatedTicket exists)
            if (updatedTicket) {
                updatedTicket.terminalId = effectiveTerminalId;
            }
            
            navigate('/pos', { 
                state: { 
                    ticket: updatedTicket,
                    tableId: table.name,
                    isNew: true
                }
            });
            
        } catch (error) {
            debug('❌ Error in handleTableClick:', error);
            setError(`Error: ${error.message}`);
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

    const loadTables = useCallback(async (forceRefresh = false, showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            // Check cache first (unless forced refresh)
            if (!forceRefresh) {
                const cachedTables = cacheService.getTables();
                if (cachedTables) {
                    debug(`📦 Using cached tables (${cachedTables.length} tables)`);
                    setTables(cachedTables);
                    setError(null);
                    setLoading(false);
                    setRefreshing(false);
                    return;
                }
            }

            debug('🔄 Fetching tables from SambaPOS...');
            const config = appconfig();
            const items = await getEntityScreenItems(config.entityScreenName);
            
            // Process tables data
            const processedTables = items.map(table => ({
                ...table,
                status: parseTableStatus(table),
                timeElapsed: parseTimeFromCaption(table.caption)
            }));

            debug(`✅ Loaded ${processedTables.length} tables from server`);
            
            // Cache the results
            cacheService.setTables(processedTables);
            
            setTables(processedTables);
            setError(null);
        } catch (err) {
            debug('❌ Error loading tables:', err);
            
            // If network fails, try to use cached data as fallback
            const cachedTables = cacheService.getTables();
            if (cachedTables) {
                debug('📦 Using cached tables as fallback');
                setTables(cachedTables);
                setError('Usando datos en caché (sin conexión)');
            } else {
                setError(err.message);
            }
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
                        onClick={() => loadTables(true, true)}
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