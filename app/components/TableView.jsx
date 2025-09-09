import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
    Snackbar,
    Menu,
    MenuItem,
    Divider
} from '@mui/material';
import {
    ViewColumn as ViewColumnIcon,
    Logout as LogoutIcon,
    Person as PersonIcon,
    Brightness4 as ThemeIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import TableCard from './TableCard';
import { loadTerminalTicketWithOrders, createTerminalTicketAsync, changeEntityOfTerminalTicketAsync, getMesaStatus, getMesaColor, getMesaStatusWithTime, getMesaTimeInfo, ensureTicketForTable, closeTerminalTicket } from '../queries';
import { useDataManager } from '../hooks/useDataManager';
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
    const [processedTables, setProcessedTables] = useState([]);
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
    const [userMenuAnchor, setUserMenuAnchor] = useState(null);

    // UNIFIED data management - NO MORE DUPLICATED REQUESTS
    // All data comes from dataManager with centralized caching
    const {
        tickets: allTickets,
        tables: dataManagerTables,
        loading: dataLoading,
        error: dataError,
        refresh: refreshData
    } = useDataManager();

    // Theme context
    const { toggleTheme, isDarkMode } = useCustomTheme();

    // Select from auth slice (Immutable.js)
    const user = useSelector(state => state.auth.get('user'));
    const isAuthenticated = useSelector(state => state.auth.get('isAuthenticated'));
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Terminal UI state for status indicator (manual registration controls removed)
    const [registering, setRegistering] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const isMountedRef = React.useRef(true);

    React.useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);
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

        try {
            debug(`🆕 Using new SambaPOS flow for LIBRE table: ${table.name}`);

            // Use the new ensureTicketForTable flow which includes proper ticket creation and closing
            const result = await ensureTicketForTable(table.name);

            if (result?.ticket) {
                debug('✅ New SambaPOS flow completed successfully:', result.ticket);

                navigate('/pos', {
                    state: {
                        ticket: result.ticket,
                        tableId: table.name,
                        isNew: true,
                        isOwnTicket: true
                    }
                });
            } else {
                throw new Error('No ticket returned from ensureTicketForTable');
            }

        } catch (error) {
            debug('❌ Error in new SambaPOS flow for libre table:', error);
            if (isMountedRef.current) setError(`Error creando ticket: ${error.message}`);
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    };

    // Handle occupied table (load existing ticket from any user)
    const handleOccupiedTable = async (table) => {
        // Fast-path: if table already carries ticketId from SQL overlay, load it directly
        const overlayTicketId = table?.ticketId || table?.TicketId || null;
        if (overlayTicketId) {
            try {
                const userName = (user?.get ? user.get('name') : user?.name) || null;
                let terminalId = terminalService.getTerminalId();
                if (!terminalId) {
                    try { terminalId = await terminalService.ensureTerminalRegistered(userName); } catch (_) { }
                }
                debug('🎯 Using overlay ticketId to load ticket', { ticketId: String(overlayTicketId) });
                await loadTerminalTicketWithOrders(terminalId, String(overlayTicketId));
                navigate('/pos');
                return;
            } catch (e) {
                debug('⚠️ Overlay ticket load failed, falling back to discovery', e?.message || e);
            }
        }
        debug(`🔍 Accessing OCCUPIED table: ${table.name}`);

        try {
            // Find ticket from global tickets (any user)
            const existingTicket = (allTickets || []).find(t => {
                const ents = t?.entities || [];
                const wantedName = String(table.name || '').trim();
                const wantedType = (process?.env?.SAMBAPOS_ENTITY_TYPE || 'Mesas');
                return Array.isArray(ents) && ents.some(e => {
                    const ename = String(e?.name || '').trim();
                    const etype = String(e?.type || '').trim();
                    return ename === wantedName && (!etype || etype === wantedType);
                });
            });

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

            // Ensure terminal context has this ticket loaded (Discovery fast-path)
            try {
                const userName = (user?.get ? user.get('name') : user?.name) || null;
                let terminalId = terminalService.getTerminalId();
                if (!terminalId) terminalId = await terminalService.ensureTerminalRegistered(userName);
                if (terminalId && existingTicket?.id) {
                    await loadTerminalTicketWithOrders(terminalId, String(existingTicket.id));
                    debug('🔄 Ticket loaded into terminal before navigation:', existingTicket.id);
                }
            } catch (ctxErr) {
                debug('⚠️ Could not load ticket into terminal context:', ctxErr);
            }

            // Navigate with basic state; POS will have terminal context ready
            navigate('/pos', {
                state: {
                    ticket: existingTicket,
                    tableId: table.name,
                    isNew: false,
                    isOwnTicket: false,
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
            if (isMountedRef.current) setLoading(true);
            setError(null);

            let tableStatus = parseTableStatus(table);
            debug(`🔍 Clicked table ${table.name} with status: ${tableStatus}`);

            // REMOVED: Unnecessary server check that causes extra requests
            // Trust the status from allTickets (already has this data)

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
            if (isMountedRef.current) setLoading(false);
        }
    };

    const parseTableStatus = (table) => {
        // Source of truth: global tickets
        debug('🔍 parseTableStatus called for table:', table.name, 'allTickets count:', allTickets?.length || 0);
        const mesaStatus = getMesaStatus(table.name, allTickets);
        debug('🔍 getMesaStatus returned:', mesaStatus, 'for table:', table.name);

        if (mesaStatus === 'LIBRE' || mesaStatus === 'OCUPADO' || mesaStatus === 'CUENTA') {
            return mesaStatus;
        }

        // Fallback to SambaPOS color-based detection only if we couldn't determine status
        debug('⚠️ Fallback to color-based detection for table:', table.name, 'color:', table.color);
        if (!table) return 'BLOQUEADO';
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
        setProcessedTables([]);

        try {
            await dispatch(logout());
            // Forzar navegación a pinpad
            navigate('/', { replace: true });
        } catch (error) {
            console.error('Error durante logout:', error);
        }
    }, [dispatch, navigate]);

    // REMOVED: Terminal status sync - no longer needed

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

    // REMOVED: loadTables function - replaced by useDataManager hook
    // All table loading is now handled by dataManager centrally

    // SIMPLIFIED manual refresh - uses unified dataManager
    const handleManualRefresh = useCallback(async () => {
        try {
            if (isMountedRef.current) setManualRefreshing(true);
            await refreshData(true); // Force refresh all data via dataManager
            if (isMountedRef.current) setSnackbar({ open: true, message: 'Datos actualizados', severity: 'info' });
        } catch (e) {
            if (isMountedRef.current) setSnackbar({ open: true, message: 'No se pudo actualizar', severity: 'error' });
        } finally {
            if (isMountedRef.current) setManualRefreshing(false);
        }
    }, [refreshData]);

    // Process tables with status information - optimized with useMemo
    const computedTables = useMemo(() => {
        if (dataManagerTables.length === 0) {
            debug('⚠️ No tables from dataManager yet');
            return [];
        }

        debug('🔄 Processing tables from dataManager...', { tablesCount: dataManagerTables.length, ticketsCount: allTickets.length });

        const tablesWithStatus = dataManagerTables.map(table => {
            // Use backend status as primary source (Status field from backend)
            let status = table.Status || table.status;

            // If we have tickets and status is not reliable, use ticket-based detection
            if (allTickets.length > 0 && (!status || !['LIBRE', 'OCUPADO', 'CUENTA', 'BLOQUEADO'].includes(status))) {
                const mesaInfo = getMesaStatusWithTime(table.name, allTickets);
                status = mesaInfo.status || parseTableStatus(table);
            }

            // Fallback to backend status or default
            if (!status || !['LIBRE', 'OCUPADO', 'CUENTA', 'BLOQUEADO'].includes(status)) {
                status = table.Status || 'LIBRE';
            }

            // Use backend color as primary, with status-based fallbacks
            let color = table.Color || table.color;
            if (!color) {
                if (status === 'CUENTA') color = '#F44336';
                else if (status === 'BLOQUEADO') color = '#808080';
                else if (status === 'OCUPADO') color = '#FFFF00';
                else color = '#FFFFFF'; // LIBRE
            }

            return {
                ...table,
                status,
                color,
                timeElapsed: table.TimeElapsed || parseTimeFromCaption(table.caption),
                backgroundColor: color,
                timeInfo: allTickets.length > 0 ? getMesaStatusWithTime(table.name, allTickets).timeInfo : null
            };
        });

        debug('✅ Processed tables:', { count: tablesWithStatus.length, sample: tablesWithStatus[0] });
        return tablesWithStatus;
    }, [dataManagerTables, allTickets]);

    // Update processed tables state when computation changes
    useEffect(() => {
        if (computedTables.length > 0) {
            setProcessedTables(computedTables);
            setLoading(false); // Tables processed successfully, hide loading spinner
            debug('🎉 Loading state set to false - tables should now be visible!');
        }
    }, [computedTables]);

    // REMOVED: SignalR listeners duplicated with useMesasStatus hook
    // The hook already handles SignalR events and triggers refreshes
    // This was causing double requests on every SignalR event

    // REMOVED: Duplicate polling useEffect - dataManager handles all data loading and polling
    // Authentication check is now simpler
    useEffect(() => {
        if (!isAuthenticated) {
            debug('📤 Usuario no autenticado...');
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    // If not authenticated, don't render anything
    if (!isAuthenticated) return null;

    if (error || dataError) {
        return (
            <Alert
                severity="error"
                action={
                    <Button color="inherit" onClick={() => window.location.reload()}>
                        Recargar
                    </Button>
                }
            >
                {error || dataError?.message || 'Error desconocido'}
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
                        px: { xs: 1, sm: 2 },
                        pt: 'env(safe-area-inset-top, 0px)',
                        flexWrap: { xs: 'wrap', sm: 'nowrap' },
                        gap: 1
                    }}>
                        {/* Logo y título */}
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            ml: 2, // Add left margin
                            flexBasis: { xs: '100%', sm: 'auto' },
                            minWidth: 0
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
                            <Typography
                                variant="h6"
                                sx={{ color: 'common.white', fontWeight: 600, fontSize: { xs: '1.3rem', sm: '1.5rem' }, lineHeight: 1.2, letterSpacing: 0.2 }}
                                noWrap
                            >
                                SambasoftMX
                            </Typography>
                        </Box>

                        {/* Usuario y controles */}
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            flexWrap: { xs: 'wrap', sm: 'nowrap' },
                            justifyContent: { xs: 'flex-end', sm: 'flex-end' },
                            flexBasis: { xs: '100%', sm: 'auto' }
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
                            <Button
                                id="user-menu-button"
                                color="inherit"
                                variant="outlined"
                                onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                                startIcon={<PersonIcon />}
                                sx={{
                                    borderColor: 'rgba(255,255,255,0.6)',
                                    color: 'common.white',
                                    backdropFilter: 'blur(6px)',
                                    borderRadius: 2,
                                    px: 1.25,
                                    py: 0.5
                                }}
                            >
                                {user?.name || user?.get('name') || 'Usuario'}
                            </Button>
                            <Menu
                                anchorEl={(userMenuAnchor && document.body && document.body.contains(userMenuAnchor)) ? userMenuAnchor : null}
                                open={Boolean(userMenuAnchor && document.body && document.body.contains(userMenuAnchor))}
                                onClose={() => setUserMenuAnchor(null)}
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                            >
                                <MenuItem disabled>{user?.name || user?.get('name') || 'Usuario'}</MenuItem>
                                <Divider />
                                <MenuItem onClick={() => { setUserMenuAnchor(null); handleLogout(); }}>Cerrar sesión</MenuItem>
                            </Menu>
                        </Box>
                    </Toolbar>
                </AppBar>

                <Box sx={{ p: 3, flex: 1, overflow: 'auto' }}>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Typography variant="h4">Mesas</Typography>
                        {!dataLoading && (
                            <Box
                                sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: 'success.main',
                                    animation: 'pulse 2s infinite'
                                }}
                                title="Datos actualizados"
                            />
                        )}
                    </Box>

                    {loading || dataLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (error || dataError) ? (
                        <Alert
                            severity="error"
                            action={
                                <Button color="inherit" size="small" onClick={handleManualRefresh}>
                                    Reintentar
                                </Button>
                            }
                        >
                            {error || dataError?.message || 'Error desconocido'}
                        </Alert>
                    ) : (
                        <Box ref={gridRef}>
                            <Grid container spacing={2}>
                                {processedTables.map((table, idx) => {
                                    const colSpan = Math.max(1, Math.min(6, cols));
                                    const gridSize = 12 / colSpan; // valid values: 12, 6, 4, 3, 2
                                    return (
                                        <Grid item xs={gridSize} sm={gridSize} md={gridSize} lg={gridSize} key={`${table.id || table.EntityId || table.name || 'mesa'}-${idx}`}>
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



