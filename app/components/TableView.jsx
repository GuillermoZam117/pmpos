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
    Refresh as RefreshIcon,
    ViewColumn as ViewColumnIcon,
    Logout as LogoutIcon,
    Person as PersonIcon,
    Restaurant as RestaurantIcon,
    Brightness4 as ThemeIcon
} from '@mui/icons-material';
import TableCard from './TableCard';
import { getEntityScreenItems, getTicketByTable, createEmptyTicket, getTerminalTicketsForTable, loadTerminalTicketWithOrders, createTerminalTicketAsync, changeEntityOfTerminalTicketAsync, getCurrentTerminalId, debugTicketQueries, findTicketByTableAlternative, getAllOpenTickets, getMesaStatus, getTicketForMesa, getMesaColor, loadTicketToTerminal, getMesaStatusWithTime, getMesaTimeInfo } from '../queries';
import { useMesasStatus } from '../hooks/useMesasStatus';
import terminalService from '../services/terminalService';
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
    const [refreshing, setRefreshing] = useState(false);

    // Real-time mesa status polling (2 seconds)
    const {
        allTickets,
        loading: ticketsLoading,
        error: ticketsError,
        refresh: refreshTickets,
        isPolling
    } = useMesasStatus({
        pollInterval: 2000,
        enabled: true,
        networkOnly: true
    });

    // Theme context
    const { toggleTheme, isDarkMode } = useCustomTheme();

    // Select from auth slice (Immutable.js)
    const user = useSelector(state => state.auth.get('user'));
    const isAuthenticated = useSelector(state => state.auth.get('isAuthenticated'));
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Terminal UI state for status indicator and manual registration
    const [terminalIdState, setTerminalIdState] = useState(() => terminalService.getTerminalId());
    const [registering, setRegistering] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

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
                debug('❌ No ticket found for occupied table');
                setError('Mesa ocupada pero no se encontró ticket');
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

    // Keep terminal status in sync on mount
    useEffect(() => {
        try {
            setTerminalIdState(terminalService.getTerminalId());
        } catch (e) {
            // ignore
        }
    }, []);

    const handleManualRegister = async () => {
        const userName = user?.get ? user.get('name') : user?.name;
        setRegistering(true);
        try {
            const id = await terminalService.ensureTerminalRegistered(userName);
            if (id) {
                setTerminalIdState(id);
                dispatch(setTerminalInApp(id));
                setSnackbar({ open: true, message: `Terminal registrado: ${id}`, severity: 'success' });
            } else {
                setSnackbar({ open: true, message: 'No se obtuvo ID de terminal. Revisa logs.', severity: 'warning' });
            }
        } catch (err) {
            console.error('Manual registration failed:', err);
            setSnackbar({ open: true, message: `Error al registrar terminal: ${err.message || err}`, severity: 'error' });
        } finally {
            setRegistering(false);
        }
    };

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
            // Note: Real-time tickets now handled by useMesasStatus hook
            debug('📋 Loading entity screen items (tables)...');

            // Check cache first (unless forced refresh)
            if (!forceRefresh) {
                const cachedTables = cacheService.getTables();
                if (cachedTables) {
                    debug(`📦 Using cached tables (${cachedTables.length} tables)`);
                    // Process tables with hybrid status detection and time info
                    const processedTables = cachedTables.map(table => {
                        const mesaInfo = getMesaStatusWithTime(table.name, allTickets);
                        const fallbackStatus = mesaInfo.status || parseTableStatus(table);
                        return {
                            ...table,
                            status: fallbackStatus,
                            timeElapsed: parseTimeFromCaption(table.caption),
                            backgroundColor: mesaInfo.color,
                            timeInfo: mesaInfo.timeInfo // New: status-based time info
                        };
                    });
                    setTables(processedTables);
                    setError(null);
                    setLoading(false);
                    setRefreshing(false);
                    return;
                }
            }

            debug('🔄 Fetching tables from SambaPOS...');
            const config = appconfig();
            const items = await getEntityScreenItems(config.entityScreenName);

            // Process tables data with hybrid status detection and time info
            const processedTables = items.map(table => {
                const mesaInfo = getMesaStatusWithTime(table.name, allTickets);
                const fallbackStatus = mesaInfo.status || parseTableStatus(table);
                return {
                    ...table,
                    status: fallbackStatus,
                    timeElapsed: parseTimeFromCaption(table.caption),
                    backgroundColor: mesaInfo.color,
                    timeInfo: mesaInfo.timeInfo // New: status-based time info
                };
            });

            debug(`✅ Loaded ${processedTables.length} tables from server with hybrid status`);

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
    }, [allTickets]); // Add allTickets as dependency

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
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 3
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h4">
                                Mesas
                            </Typography>
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
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                variant="outlined"
                                onClick={() => {
                                    refreshTickets(); // Refresh tickets immediately
                                    loadTables(true, true); // Refresh table structure
                                }}
                                disabled={refreshing}
                                startIcon={<RefreshIcon />}
                            >
                                {refreshing ? 'Actualizando...' : 'Actualizar'}
                            </Button>

                            {/* Terminal status indicator and manual register */}
                            <Chip
                                label={terminalIdState ? `Terminal: ${terminalIdState}` : 'Terminal: sin registrar'}
                                color={terminalIdState ? 'success' : 'default'}
                                size="small"
                                sx={{ mr: 1 }}
                            />

                            <Button
                                variant="outlined"
                                color={terminalIdState ? 'inherit' : 'primary'}
                                size="small"
                                onClick={handleManualRegister}
                                disabled={registering}
                                startIcon={registering ? <CircularProgress size={14} /> : <RestaurantIcon />}
                            >
                                {registering ? 'Registrando...' : (terminalIdState ? 'Re-registrar' : 'Registrar Terminal')}
                            </Button>

                            {/* Temporary Debug Button */}
                            <Button
                                variant="outlined"
                                color="warning"
                                size="small"
                                onClick={async () => {
                                    console.log('🔧 DEBUG: Manual terminal registration test');
                                    console.log('Current terminalId:', terminalService.getTerminalId());

                                    try {
                                        console.log('Current user from selector:', user?.get ? user.get('name') : user?.name);

                                        const terminalId = await terminalService.ensureTerminalRegistered(
                                            user?.get ? user.get('name') : user?.name
                                        );
                                        console.log('✅ Debug registration successful:', terminalId);
                                        alert(`Terminal registrado: ${terminalId}`);
                                    } catch (error) {
                                        console.error('❌ Debug registration failed:', error);
                                        alert(`Error: ${error.message}`);
                                    }
                                }}
                            >
                                Debug Terminal
                            </Button>
                        </Box>
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
                                {tables.map(table => (
                                    <Grid item xs={12} sm={12 / Math.max(1, Math.min(6, cols))} key={table.name}>
                                        <TableCard
                                            table={{
                                                ...table,
                                                labelColor: table.status === 'LIBRE' ? '#000000' : '#FFFFFF',
                                                color: table.backgroundColor || getMesaColor(table.status) // Use hybrid colors
                                            }}
                                            onClick={() => handleTableClick(table)}
                                        />
                                    </Grid>
                                ))}
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

