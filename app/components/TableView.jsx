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
    IconButton,
    Chip,
    Snackbar
} from '@mui/material';
import {
    ViewColumn as ViewColumnIcon,
    Logout as LogoutIcon,
    Person as PersonIcon,
    Brightness4 as ThemeIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import TableCard from './TableCard';
import { getEntityScreenItems, getTicketByTable, createEmptyTicket, getTerminalTicketsForTable, loadTerminalTicketWithOrders, createTerminalTicketAsync, changeEntityOfTerminalTicketAsync, getCurrentTerminalId, debugTicketQueries, findTicketByTableAlternative, getAllOpenTickets, getMesaStatus, getTicketForMesa, getMesaColor, loadTicketToTerminal, getMesaStatusWithTime, getMesaTimeInfo } from '../queries';
import { useMesasStatus } from '../hooks/useMesasStatus';
import terminalService from '../services/terminalService';
import dataManager from '../services/dataManager';
import TerminalStatus from './TerminalStatus';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../actions/auth';
import { setTerminalInApp } from '../actions/app';
import { useTheme as useCustomTheme } from '../contexts/ThemeContext';
import Debug from 'debug';
import { TABLE_STATUS } from '../constants/tableStatus';
import { appconfig } from '../config';
import cacheService from '../services/cacheService';
import logo from '../../public/favicon.ico';  // Add this import

const debug = Debug('pmpos:tables');

const TableView = () => {
    const [error, setError] = useState(null);
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [autoCols, setAutoCols] = useState(() => {
        const v = localStorage.getItem('pmpos_tables_auto');
        return v === null ? true : v === 'true';
    });
    const [cols, setCols] = useState(() => {
        const v = parseInt(localStorage.getItem('pmpos_tables_cols') || '3', 10);
        return [1, 2, 3, 4, 6].includes(v) ? v : 3;
    });
    const gridRef = React.useRef(null);
    const [, setRefreshing] = useState(false);

    // Real-time mesa status polling (2 seconds)
    // This hook fetches active tickets from all users for status updates
    const {
        allTickets,
        loading: ticketsLoading,
        error: ticketsError,
        refresh: refreshTickets,
        isPolling
    } = useMesasStatus({
        pollInterval: 2000,
        enabled: true,
        networkOnly: true // This gets tickets from all users (not just current user)
    });

    // Theme context
    const { toggleTheme, isDarkMode } = useCustomTheme();

    // Select from auth slice (Immutable.js)
    const user = useSelector(state => state.auth.get('user'));
    const isAuthenticated = useSelector(state => state.auth.get('isAuthenticated'));
    const reduxTables = useSelector(state => state.app.get('tables')); // Get tables from Redux
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Terminal UI state for status indicator (manual registration controls removed)
    const [registering, setRegistering] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const [manualRefreshing, setManualRefreshing] = useState(false);

    // Error handler first
    const handleError = useCallback((err) => {
        debug('❌ Error:', err);
        setError(err.message);
    }, []);

    // Handle libre table (create new ticket with current user's terminal)
    const handleLibreTable = async (table) => {
        setError(null);
        setLoading(true);

        // Ensure terminal is registered before creating a ticket
        const userName = user?.get ? user.get('name') : user?.name;
        setRegistering(true);
        let terminalId = terminalService.getTerminalId();
        if (!terminalId) {
            try {
                terminalId = await terminalService.ensureTerminalRegistered(userName);
            } catch (err) {
                console.error('Error attempting terminal registration before creating ticket:', err);
            }
        }

        setRegistering(false);

        // If terminalId is missing (registration failed), create a local-only ticket (cache-only flow)
        if (!terminalId) {
            console.warn('⚠️ No terminal registered; creating local-only ticket and navigating to POS');
            const localTicket = {
                uid: `local-ticket-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
                id: null,
                totalAmount: 0,
                remainingAmount: 0,
                orders: [],
                localOnly: true
            };

            // Persist pending local ticket so it can be promoted later
            try {
                cacheService.addPendingTicket({
                    ...localTicket,
                    tableId: table.name,
                    createdAt: Date.now(),
                    owner: userName
                });
            } catch (e) {
                console.warn('Failed to persist pending ticket:', e);
            }

            setSnackbar({
                open: true,
                message: 'Ticket local creado (offline). Registra la terminal para enviarlo al servidor.',
                severity: 'info'
            });

            navigate('/pos', {
                state: {
                    ticket: localTicket,
                    tableId: table.name,
                    isNew: true,
                    isOwnTicket: true
                }
            });

            setLoading(false);
            return;
        }

        debug(`🆕 Creating new ticket for LIBRE table: ${table.name}`);

        try {
            // 1) createTerminalTicket() con terminalId del usuario actual
            const newTicket = await createTerminalTicketAsync(terminalId);
            debug('✅ New terminal ticket created:', newTicket);

            // 2) changeEntity para asignar la mesa
            let finalTicket = newTicket;
            try {
                const assignedTicket = await changeEntityOfTerminalTicketAsync(terminalId, table.name);
                if (assignedTicket) {
                    finalTicket = assignedTicket;
                    debug('✅ Table assigned to ticket:', finalTicket);
                }
            } catch (assignError) {
                debug('⚠️ Table assignment failed, using basic ticket:', assignError);
                // Continue with basic ticket
            }

            // Add terminalId for later operations
            if (finalTicket) {
                finalTicket.terminalId = terminalId;
            }

            navigate('/pos', {
                state: {
                    ticket: finalTicket,
                    tableId: table.name,
                    isNew: true,
                    isOwnTicket: true
                }
            });

        } catch (error) {
            debug('❌ Error creating ticket for libre table:', error);
            setError(`Error creando ticket: ${error.message}`);
        }
    };

    // Handle occupied table (load existing ticket from any user)
    const handleOccupiedTable = async (table) => {
        debug(`🔍 Accessing OCCUPIED table: ${table.name}`);

        try {
            // Find ticket from global tickets (any user)
            const existingTicket = getTicketForMesa(table.name, allTickets);

            if (!existingTicket) {
                debug('ℹ️ No open ticket found for occupied table; using Discovery fast-path by mesa binding');
                navigate('/pos', {
                    state: {
                        ticket: null,
                        tableId: table.name,
                        isNew: false,
                        isOwnTicket: false,
                        ticketId: null
                    }
                });
                return;
            }

            debug('✅ Found ticket for occupied table:', existingTicket);

            // Navigate directly with ticket (no terminal operations needed for viewing)
            navigate('/pos', {
                state: {
                    ticket: existingTicket,
                    tableId: table.name,
                    isNew: false,
                    isOwnTicket: false, // This ticket belongs to another user
                    ticketId: existingTicket.id
                }
            });

        } catch (error) {
            debug('❌ Error accessing occupied table:', error);
            setError(`Error accediendo a mesa ocupada: ${error.message}`);
        }
    };

    // Main table click handler - routes to appropriate handler
    const handleTableClick = async (table) => {
        try {
            setLoading(true);
            setError(null);

            const tableStatus = parseTableStatus(table);
            debug(`🔍 Clicked table ${table.name} with status: ${tableStatus}`);

            if (tableStatus === 'LIBRE') {
                await handleLibreTable(table);
            } else if (tableStatus === 'OCUPADO' || tableStatus === 'CUENTA') {
                await handleOccupiedTable(table);
            } else {
                debug('⚠️ Unknown table status:', tableStatus);
                setError('Estado de mesa desconocido');
            }

        } catch (error) {
            debug('❌ Error in handleTableClick:', error);
            setError(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const parseTableStatus = (table) => {
        // Use hybrid detection: check global tickets first, fallback to SambaPOS colors
        const mesaStatus = getMesaStatus(table.name, allTickets);
        if (mesaStatus !== 'LIBRE') return mesaStatus;

        // Fallback to SambaPOS color-based detection
        if (!table) return 'BLOQUEADO';
        // Mapear colores típicos de SambaPOS y los calculados
        const c = (table.color || '').toUpperCase();
        if (c === '#FF0000' || c === '#F44336') return 'CUENTA'; // rojo
        if (c === '#FFFF00' || c === '#FFEB3B') return 'OCUPADO'; // amarillo
        if (c === '#FFFFFF' || c === '#E5E3D8' || c === '#F5F1E6') return 'LIBRE'; // blanco/crema
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

    // Keep terminal status in sync on mount
    useEffect(() => {
        try {
            setTerminalIdState(terminalService.getTerminalId());
        } catch (e) {
            // ignore
        }
    }, []);

    // Manual terminal registration removed from UI

    const handleSnackbarClose = () => setSnackbar({ ...snackbar, open: false });

    const computeAutoCols = useCallback(() => {
        const container = gridRef.current;
        const allowed = [1, 2, 3, 4, 6];
        if (!container) return cols;
        const width = container.clientWidth || window.innerWidth;
        const minCard = 220; // px per card including margins
        let guess = Math.max(1, Math.floor(width / minCard));
        // map to nearest allowed
        let best = allowed[0];
        let bestDiff = Math.abs(best - guess);
        for (const a of allowed) {
            const d = Math.abs(a - guess);
            if (d < bestDiff) { best = a; bestDiff = d; }
        }
        return best;
    }, [cols]);

    React.useEffect(() => {
        if (!autoCols) return;
        const handler = () => {
            const next = computeAutoCols();
            setCols(next);
        };
        handler();
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, [autoCols, computeAutoCols]);

    const toggleColumnsMode = () => {
        const nextAuto = !autoCols;
        setAutoCols(nextAuto);
        localStorage.setItem('pmpos_tables_auto', String(nextAuto));
        if (nextAuto) {
            const next = computeAutoCols();
            setCols(next);
            localStorage.setItem('pmpos_tables_cols', String(next));
        }
    };

    const cycleManualColumns = () => {
        const ordered = [1, 2, 3, 4, 6];
        const idx = ordered.indexOf(cols);
        const next = ordered[(idx + 1) % ordered.length];
        setCols(next);
        localStorage.setItem('pmpos_tables_cols', String(next));
    };

    const loadTables = useCallback(async (forceRefresh = false, showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            debug('📋 Loading tables via DataManager...');

            let tablesData;
            
            if (forceRefresh) {
                // Force refresh via DataManager
                tablesData = await dataManager.refreshData('tables');
            } else {
                // Try Redux store first (already loaded at startup)
                if (reduxTables) {
                    debug('✅ Using tables from Redux store');
                    tablesData = reduxTables;
                } else {
                    // Try DataManager cache
                    tablesData = dataManager.getCachedTables();
                    
                    if (!tablesData) {
                        // Load from server via DataManager
                        tablesData = await dataManager.loadTables();
                    }
                }
            }

            if (tablesData) {
                debug(`✅ DataManager provided ${tablesData.length} tables`);
                
                // Process tables with hybrid status detection and time info
                const processedTables = tablesData.map(table => {
                    const mesaInfo = getMesaStatusWithTime(table.name, allTickets);
                    const fallbackStatus = mesaInfo.status || parseTableStatus(table);
                    // No sobreescribir table.color (viene del Entity Screen de SambaPOS)
                    return {
                        ...table,
                        status: fallbackStatus,
                        timeElapsed: parseTimeFromCaption(table.caption),
                        timeInfo: mesaInfo.timeInfo
                    };
                });

                setTables(processedTables);
                setError(null);
            } else {
                debug('⚠️ No tables data available from DataManager');
                setError('No hay datos de mesas disponibles');
            }

        } catch (err) {
            debug('❌ Error loading tables via DataManager:', err);

            // Fallback: try direct cache access
            const cachedTables = dataManager.getCachedTables();
            if (cachedTables) {
                debug('📦 Using cached tables as fallback');
                setTables(cachedTables);
                setError('Usando datos en caché (sin conexión)');
            } else {
                setError(err.message || 'Error cargando mesas');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [allTickets, reduxTables]);

    // Manual refresh handler (defined after loadTables to avoid TDZ)
    const handleManualRefresh = useCallback(async () => {
        try {
            setManualRefreshing(true);
            // Only refresh ticket states; do not reload full tables/menu/app
            await refreshTickets();
            setSnackbar({ open: true, message: 'Estados de mesas actualizados', severity: 'info' });
        } catch (e) {
            setSnackbar({ open: true, message: 'No se pudo actualizar estados', severity: 'error' });
        } finally {
            setManualRefreshing(false);
        }
    }, [refreshTickets]);

    // Re-process tables when tickets are updated (real-time status updates)
    useEffect(() => {
        if (tables.length > 0 && allTickets.length >= 0) {
            debug('🔄 Re-processing tables with updated tickets...');
            const processedTables = tables.map(table => {
                const mesaInfo = getMesaStatusWithTime(table.name, allTickets);
                const fallbackStatus = mesaInfo.status || parseTableStatus(table);
                return {
                    ...table,
                    status: fallbackStatus,
                    timeElapsed: parseTimeFromCaption(table.caption),
                    backgroundColor: mesaInfo.color,
                    timeInfo: mesaInfo.timeInfo
                };
            });
            setTables(processedTables);
        }
    }, [allTickets]); // Re-process when tickets change

    // SignalR real-time event listeners
    useEffect(() => {
        const handleTableStatusChanged = (event) => {
            debug('📡 SignalR: Table status changed', event.detail);
            // Refresh tables when SignalR notifies of changes
            loadTables(false, false);
        };

        const handleTicketUpdated = (event) => {
            debug('📡 SignalR: Ticket updated', event.detail);
            // Refresh tickets immediately via hook
            refreshTickets();
        };

        // Add event listeners for SignalR events
        window.addEventListener('tableStatusChanged', handleTableStatusChanged);
        window.addEventListener('ticketUpdated', handleTicketUpdated);

        return () => {
            window.removeEventListener('tableStatusChanged', handleTableStatusChanged);
            window.removeEventListener('ticketUpdated', handleTicketUpdated);
        };
    }, [loadTables, refreshTickets]);

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
        // Tables refresh every 30s (tickets refresh every 2s via hook)
        // SignalR provides real-time updates between polls
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
        <>
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

                        {/* Usuario y controles */}
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2
                        }}>
                            {/* Terminal status in topbar (compact) */}
                            <TerminalStatus compact={true} showManualRegistration={false} />

                            <IconButton
                                color="inherit"
                                onClick={handleManualRefresh}
                                title={manualRefreshing ? 'Actualizando...' : 'Refrescar mesas'}
                                disabled={manualRefreshing}
                            >
                                <RefreshIcon />
                            </IconButton>
                            <IconButton
                                color="inherit"
                                onClick={toggleTheme}
                                title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                            >
                                <ThemeIcon />
                            </IconButton>
                            <IconButton
                                color="inherit"
                                onClick={toggleColumnsMode}
                                title={autoCols ? 'Auto columnas: ON' : 'Auto columnas: OFF'}
                            >
                                <ViewColumnIcon />
                            </IconButton>
                            {!autoCols && (
                                <Button variant="outlined" color="inherit" size="small" onClick={cycleManualColumns}>
                                    {cols} col
                                </Button>
                            )}
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
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Typography variant="h4">Mesas</Typography>
                        {isPolling && (
                            <Box
                                sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: 'success.main',
                                    animation: 'pulse 2s infinite'
                                }}
                                title="Actualizando estado en tiempo real (cada 2s)"
                            />
                        )}
                    </Box>

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (error || ticketsError) ? (
                        <Alert
                            severity="error"
                            action={
                                <Button color="inherit" size="small" onClick={() => loadTables()}>
                                    Reintentar
                                </Button>
                            }
                        >
                            {error || ticketsError?.message || 'Error desconocido'}
                        </Alert>
                    ) : (
                        <Box ref={gridRef}>
                            <Grid container spacing={2}>
                                {tables.map(table => {
                                    const colSpan = Math.max(1, Math.min(6, cols));
                                    const gridSize = 12 / colSpan; // valid values: 12, 6, 4, 3, 2
                                    return (
                                    <Grid item xs={gridSize} sm={gridSize} md={gridSize} lg={gridSize} key={table.name}>
                                        <TableCard
                                            table={{
                                                ...table,
                                                labelColor: '#000000',
                                                color: table.color || getMesaColor(table.status)
                                            }}
                                            onClick={() => handleTableClick(table)}
                                        />
                                    </Grid>
                                    );
                                })}
                            </Grid>
                        </Box>
                    )}
                </Box>
            </Box>

            {/* Snackbar for user messages */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                message={snackbar.message}
            />
        </>
    );
};

export default TableView;
