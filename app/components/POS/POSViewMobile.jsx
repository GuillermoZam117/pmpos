/**
 * Mobile-Optimized POSView Component
 * Redesigned for mobile devices with space optimization and modern UX
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
    Box,
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Fab,
    Badge,
    Paper,
    List,
    ListItem,
    ListItemText,
    Divider,
    Card,
    CardContent,
    Button,
    Chip,
    Alert,
    Snackbar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Collapse,
    Menu,
    CircularProgress,
    useTheme,
    useMediaQuery,
    Grid,
    Stack,
    Tooltip,
} from '@mui/material';
import {
    ArrowBackOutlined as BackIcon,
    ReceiptLongOutlined as ReceiptIcon,
    RestaurantMenuOutlined as MenuIcon,
    PaymentOutlined as PaymentIcon,
    SendOutlined as SendIcon,
    RestaurantOutlined as CookIcon,
    PrintOutlined as PrintIcon,
    MoreHorizOutlined as MoreIcon,
    LabelOutlined as LabelIcon,
    AddCircleOutline as AddIcon,
    RemoveCircleOutline as RemoveIcon,
    DeleteOutline as DeleteIcon,
    CancelOutlined as CancelIcon,
    CardGiftcardOutlined as GiftIcon,
    Brightness4Outlined as ThemeIcon,
    ExpandMoreOutlined as ExpandIcon,
    ExpandLessOutlined as CollapseIcon,
    ChatBubbleOutline as CommentIcon,
    LockOpenOutlined as UnlockIcon,
    CloseOutlined as CloseIcon,
    ComputerOutlined as TerminalIcon,
    WifiOutlined as ConnectedIcon,
    WifiOffOutlined as DisconnectedIcon,
    CheckCircleOutlined as ReadyIcon,
    PendingOutlined as PendingIcon,
} from '@mui/icons-material';
import { formatMXN } from '../../utils/currencyFormatter';
import MobileMenu from '../Menu/MobileMenu';
import ProductDetailsModal from '../ProductDetailsModal';
import PaymentDialog from '../PaymentDialog';
import PaymentProcessor from '../PaymentProcessor';
import OrderTagSelector from '../OrderTagSelector';
// Replaced PinPad page with inline numeric input for admin PIN
import { useTheme as useCustomTheme } from '../../contexts/ThemeContext';
import menuService from '../../services/menuService';
import dataManager from '../../services/dataManager';
import { orderService } from '../../services/orderService';
import { ticketService } from '../../services/ticketService';
import { paymentService } from '../../services/paymentService';
import { automationService } from '../../services/automationService';
import terminalService from '../../services/terminalService';
import { userService } from '../../services/userService';
import orderTagService from '../../services/orderTagService';
import adminService from '../../services/adminService';
import { closeTerminalTicket, getTicketById } from '../../queries';
import Debug from 'debug';

const debug = Debug('pmpos:pos-mobile');
const LABEL_SUBMIT = process.env.SAMBAPOS_LABEL_SUBMIT || 'Comandar';
const LABEL_PRINT_BILL = process.env.SAMBAPOS_LABEL_PRINT_BILL || 'Imprimir Cuenta';
const SUBMIT_CMD = process.env.SAMBAPOS_SUBMIT_ORDERS_COMMAND || 'Imprimir pedido';
const PRINT_JOB = process.env.SAMBAPOS_PRINT_JOB_NAME || 'Imprimir factura CAJA';
const LABEL_PAY = process.env.SAMBAPOS_LABEL_PAY || 'Pagar';
const ORDER_COMMENT_COMMAND = process.env.SAMBAPOS_ORDER_COMMENT_COMMAND || 'TagOrder';
const GIFT_COMMAND = process.env.SAMBAPOS_AUTOCMD_GIFT || 'Regalo';
const VOID_COMMAND = process.env.SAMBAPOS_AUTOCMD_VOID || 'Anular';

// Helper function to determine order status from SambaPOS orderStates JSON or states array
const determineOrderStatus = (orderStatesJson = '', statesArray = null) => {
    console.log('🔍 [determineOrderStatus] Input JSON:', orderStatesJson, typeof orderStatesJson);
    console.log('🔍 [determineOrderStatus] Input Array:', statesArray);

    // First try to use the states array (newer format from GraphQL)
    if (Array.isArray(statesArray) && statesArray.length > 0) {
        console.log('🔍 [determineOrderStatus] Using states array format');

        // Look for Status state
        const statusState = statesArray.find(state =>
            (state.stateName || '').toLowerCase() === 'status'
        );

        if (statusState && statusState.state) {
            const status = statusState.state;
            console.log('🔍 [determineOrderStatus] Found status from array:', status);

            switch (status?.toLowerCase()) {
                case 'submitted':
                case 'enviado':
                    console.log('🔍 [determineOrderStatus] Returning ENVIADO for', status);
                    return 'ENVIADO';
                case 'preparing':
                case 'preparando':
                    return 'PREPARANDO';
                case 'ready':
                case 'listo':
                    return 'LISTO';
                case 'served':
                case 'servido':
                    return 'SERVIDO';
                case 'cancelled':
                case 'cancelado':
                    return 'CANCELADO';
                case 'void':
                case 'anulado':
                    return 'ANULADO';
                case 'new':
                case 'nuevo':
                    return 'NUEVO';
                default:
                    console.log('🔍 [determineOrderStatus] Unknown status from array:', status);
                    return status || 'NUEVO';
            }
        }
    }

    // Fallback to legacy JSON format
    if (!orderStatesJson) {
        console.log('🔍 [determineOrderStatus] No orderStates provided, returning NUEVO');
        return 'NUEVO';
    }

    try {
        // Parse the JSON string to get states object
        const parsed = typeof orderStatesJson === 'string' ? JSON.parse(orderStatesJson) : orderStatesJson;
        console.log('🔍 [determineOrderStatus] Parsed states:', parsed);

        // Handle the format {"S":"Submitted"} or similar
        if (parsed && typeof parsed === 'object') {
            const stateValues = Object.values(parsed);
            console.log('🔍 [determineOrderStatus] State values:', stateValues);
            if (stateValues.length > 0) {
                const status = stateValues[0];
                console.log('🔍 [determineOrderStatus] Raw status:', status);
                // Map SambaPOS states to our display states
                switch (status?.toLowerCase()) {
                    case 'submitted':
                        console.log('🔍 [determineOrderStatus] Returning ENVIADO for submitted');
                        return 'ENVIADO';
                    case 'enviado':
                        console.log('🔍 [determineOrderStatus] Returning ENVIADO for enviado');
                        return 'ENVIADO';
                    case 'preparing': return 'PREPARANDO';
                    case 'ready': return 'LISTO';
                    case 'served': return 'SERVIDO';
                    case 'cancelled': return 'CANCELADO';
                    case 'void': return 'ANULADO';
                    case 'new': return 'NUEVO';
                    default:
                        console.log('🔍 [determineOrderStatus] Unknown status, returning:', status || 'NUEVO');
                        return status || 'NUEVO';
                }
            }
        }
    } catch (e) {
        console.error('❌ [determineOrderStatus] Error parsing order states:', e);
        debug('❌ Error parsing order states:', e);
    }

    console.log('🔍 [determineOrderStatus] Fallback to NUEVO');
    return 'NUEVO';
};// Helper function to check if order is sent/submitted to kitchen
const isOrderSent = (order) => {
    if (!order) return false;

    console.log('🔍 [isOrderSent] Checking order:', {
        name: order.name,
        status: order.status,
        isExisting: order.isExisting,
        states: order.states
    });

    // Check if it's an existing order (already in SambaPOS) and has sent status
    if (order.isExisting) {
        const status = order.status?.toLowerCase();
        const isSent = status === 'enviado' || status === 'sent' || status === 'submitted' || status === 'preparando' || status === 'ready' || status === 'listo' || status === 'served' || status === 'servido';
        console.log('🔍 [isOrderSent] Existing order check:', { status, isSent });
        return isSent;
    }

    // For new orders (not yet sent), check states array
    if (Array.isArray(order.states)) {
        const isSent = order.states.some(state => {
            const stateName = state.stateName?.toLowerCase();
            const stateValue = state.state?.toLowerCase();
            return (stateName === 'status' || stateName === 'estado') &&
                (stateValue === 'enviado' || stateValue === 'sent' || stateValue === 'submitted' || stateValue === 'preparando' || stateValue === 'ready' || stateValue === 'listo' || stateValue === 'served' || stateValue === 'servido');
        });
        console.log('🔍 [isOrderSent] States array check:', { states: order.states, isSent });
        return isSent;
    }

    console.log('🔍 [isOrderSent] No match found, returning false');
    return false;
};

const POSViewMobile = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const theme = useTheme();
    const { toggleTheme, isDarkMode } = useCustomTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Role-based permissions (simple config-based): default Mesero
    const authUser = useSelector(state => state.auth.get('user'));
    const storedRole = (typeof window !== 'undefined' ? localStorage.getItem('pmpos_user_role') : null) || process.env.SAMBAPOS_USER_ROLE || 'Mesero';
    const storedIsAdmin = (typeof window !== 'undefined' ? localStorage.getItem('pmpos_user_isAdmin') : null);
    const storedUserObj = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } })();
    const roleFromState = authUser?.get ? (authUser.get('role') || authUser.get('roleName')) : (authUser?.role || authUser?.roleName);
    const isAdminFlagFromState = authUser?.get ? (authUser.get('isAdmin') === true) : (authUser?.isAdmin === true);
    const userRole = roleFromState || storedRole;
    const roleUpper = String(userRole || '').trim().toUpperCase();
    // Estricto: ADMIN por bandera isAdmin, roleUpper === 'ADMIN', roleUpper inicia con 'ADMIN', o flag en localStorage
    const isAdminLocal = storedIsAdmin === '1' || (storedIsAdmin && storedIsAdmin.toLowerCase && ['1', 'true', 'yes', 'si', 'sí'].includes(storedIsAdmin.toLowerCase())) || (storedUserObj && storedUserObj.isAdmin === true);
    const canPay = !!(isAdminFlagFromState || isAdminLocal || roleUpper === 'ADMIN' || roleUpper.startsWith('ADMIN'));
    const isAdmin = canPay;
    debug('auth-gating', { userRole, roleUpper, isAdminFlagFromState, isAdminLocal, canPay });

    // Ensure admin flag via SQL read-service (does not affect token)
    const [adminChecked, setAdminChecked] = useState(false);
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const name = (authUser?.get ? authUser.get('name') : authUser?.name) || storedUserObj?.name;
                if (!name) return;
                const ok = await adminService.isAdminByName(name);
                if (alive) setAdminChecked(true);
                debug('adminService.isAdminByName', { name, ok });
            } catch {
                if (alive) setAdminChecked(true);
            }
        })();
        return () => { alive = false; };
    }, [authUser, storedUserObj?.name]);
    const isWaiter = ['Mesero'].includes(userRole);

    // Get data from navigation state
    const { ticket, tableId, isNew = false } = location.state || {};

    // State management
    const [activeTab, setActiveTab] = useState(0);
    const [orders, setOrders] = useState([]);
    const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
    const [menuLoading, setMenuLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [productModalOpen, setProductModalOpen] = useState(false);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [paymentProcessorOpen, setPaymentProcessorOpen] = useState(false);
    const [expandedOrderIndex, setExpandedOrderIndex] = useState(-1);
    const [ticketBlocked, setTicketBlocked] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const [configurationError, setConfigurationError] = useState(null);
    const [adminPinOpen, setAdminPinOpen] = useState(false);
    const [adminPin, setAdminPin] = useState('');
    const [adminAction, setAdminAction] = useState(null); // 'gift' | 'void'
    const [adminTargetOrder, setAdminTargetOrder] = useState(null);
    const [adminValidating, setAdminValidating] = useState(false);
    const [adminPinValidated, setAdminPinValidated] = useState(false);
    const [adminPinError, setAdminPinError] = useState('');
    const [adminReason, setAdminReason] = useState('');
    const [availableReasons, setAvailableReasons] = useState([]);
    const [reasonsLoading, setReasonsLoading] = useState(false);
    const [allowedOrderCmds, setAllowedOrderCmds] = useState({}); // { [uid]: Set([...names]) }
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [terminalReady, setTerminalReady] = useState(false);
    const [page, setPage] = useState(0);

    // Estados para etiquetas de orden
    const [orderTagsOpen, setOrderTagsOpen] = useState(false);
    const [selectedOrderForTags, setSelectedOrderForTags] = useState(null);
    const [gridRows, setGridRows] = useState(4);
    const [ticketTotals, setTicketTotals] = useState({ totalAmount: 0, remainingAmount: 0 });

    // Estados para indicadores de estado
    const [terminalStatus, setTerminalStatus] = useState('disconnected'); // 'connected', 'connecting', 'disconnected'
    const [connectionStatus, setConnectionStatus] = useState('checking'); // 'connected', 'disconnected', 'checking'
    const [shouldRefreshOrders, setShouldRefreshOrders] = useState(0); // Counter to trigger refresh

    const productsBoxRef = useRef(null);
    const [actionsModalOpen, setActionsModalOpen] = useState(false);
    const isMountedRef = useRef(true);

    // Prevent infinite loops
    const loadingRef = useRef(false);
    const menuLoadedRef = useRef(false);
    const terminalTicketOpenRef = useRef(false); // track open terminal ticket in session
    const boundTableRef = useRef(null); // track which mesa is bound

    // Redux state
    const appState = useSelector(state => state.app);
    const menu = appState?.get ? appState.get('menu') : appState?.menu;
    const menuJS = (menu && menu.toJS ? menu.toJS() : menu) || null;

    // Helper functions for status monitoring
    const updateTerminalStatus = useCallback(async () => {
        try {
            const terminalId = terminalService.getTerminalId();
            if (terminalId) {
                setTerminalStatus('connected');
                // Test connection to GraphQL
                try {
                    await ticketService.testConnection();
                    setConnectionStatus('connected');
                } catch {
                    setConnectionStatus('disconnected');
                }
            } else {
                setTerminalStatus('disconnected');
                setConnectionStatus('checking');
            }
        } catch (error) {
            setTerminalStatus('disconnected');
            setConnectionStatus('disconnected');
        }
    }, []);

    // Monitor terminal and connection status
    useEffect(() => {
        updateTerminalStatus();
        const interval = setInterval(updateTerminalStatus, 45000); // Check every 45 seconds (reduced frequency)
        return () => clearInterval(interval);
    }, [updateTerminalStatus]);

    const productNameById = React.useMemo(() => {
        const map = new Map();
        const categories = menuJS?.categories || [];
        for (const cat of categories) {
            const items = cat?.menuItems || [];
            for (const it of items) {
                const id = String(it.productId || it.product?.id || '');
                if (!id) continue;
                const name = it.name || it.caption || it.product?.name || '';
                if (name && !map.has(id)) map.set(id, name);
            }
        }
        return map;
    }, [menuJS]);

    // Helper: resolve product name by productId using cached menu
    const resolveProductName = useCallback((pid) => {
        if (!pid) return null;
        // Prefer global index from menuService
        const fromSvc = menuService.getProductNameById(pid);
        if (fromSvc) return fromSvc;
        const key = String(pid);
        return productNameById.get(key) || null;
    }, [productNameById]);

    // Load menu on mount - Optimized to use pre-loaded data
    useEffect(() => {
        let alive = true;
        const loadMenu = async () => {
            // Prevent multiple simultaneous loads
            if (loadingRef.current) {
                debug('?? Menu loading already in progress, skipping...');
                return;
            }

            debug('?? Starting optimized menu load...');
            debug('?? Current Redux menu state:', menu);

            // Step 1: Check if menu is already loaded in Redux (from App initialization)
            if (menu && menu.categories && menu.categories.length > 0) {
                debug('?? ? Menu already available in Redux from startup, using cached data');
                if (!alive) return;
                setMenuLoading(false);
                menuLoadedRef.current = true;
                return;
            }

            // Step 2: Try DataManager cache (faster than network)
            const cachedMenu = dataManager.getCachedMenu();
            if (cachedMenu && cachedMenu.categories && cachedMenu.categories.length > 0) {
                debug('?? ? Menu available in DataManager cache, dispatching to Redux');
                if (!alive) return;
                dispatch({ type: 'SET_MENU', menu: cachedMenu });
                setMenuLoading(false);
                menuLoadedRef.current = true;
                return;
            }

            // Step 3: Only if no cached data available, load from network
            loadingRef.current = true;
            setMenuLoading(true);

            try {
                debug('?? No cached menu available, loading from network...');

                // Use DataManager for optimized loading (includes caching)
                const menuData = await dataManager.refreshData('menu');

                if (!menuData || !menuData.categories || menuData.categories.length === 0) {
                    throw new Error('Invalid menu data structure from server');
                }

                debug('?? ? Menu loaded from network via DataManager:', menuData);
                if (!alive) return;
                dispatch({ type: 'SET_MENU', menu: menuData });
                menuLoadedRef.current = true;

            } catch (error) {
                debug('? Failed to load menu:', error);
                console.error('Menu loading failed:', error);

                // Check if it's a terminal registration/configuration error
                if (error.message.includes('Terminal registration') ||
                    error.message.includes('configuration required') ||
                    error.message.includes('SETUP REQUIRED')) {
                    setConfigurationError(error.message);
                }
            } finally {
                if (alive) setMenuLoading(false);
                loadingRef.current = false;
            }
        };

        debug('?? Menu loading effect triggered');

        // Only load if we don't have a menu or if the loading failed previously
        if (!menu || (menu && (!menu.categories || menu.categories.length === 0))) {
            loadMenu();
        } else {
            debug('?? Menu already exists and is valid:', menu);
            if (alive) {
                setMenuLoading(false);
                menuLoadedRef.current = true;
            }
        }
        return () => { alive = false; };
    }, []); // Remove dependencies to prevent loops - only run on mount

    // Mounted flag to avoid setState on unmounted component
    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // Ensure terminal ticket is loaded for occupied tables and restore cart from session
    useEffect(() => {
        let cancelled = false;
        const prepare = async () => {
            try {
                debug('🔧 POSViewMobile prepare called - ticket?.id:', ticket?.id, 'tableId:', tableId);
                const terminalId = terminalService.getTerminalId();
                debug('🔧 Current terminalId:', terminalId);

                // Restore pending/local cart from session
                if (typeof window !== 'undefined') {
                    const key = `pmpos_cart_${terminalId || 'NA'}_${tableId || 'NA'}`;
                    const raw = sessionStorage.getItem(key);
                    if (raw) {
                        try {
                            const localPending = JSON.parse(raw) || [];
                            if (!cancelled && Array.isArray(localPending) && localPending.length) {
                                debug('🔧 Restoring pending orders from session:', localPending.length);
                                setOrders(prev => {
                                    // merge: keep existing server orders, append pending without uid
                                    const pending = localPending.filter(o => !o.isExisting);
                                    return [...prev, ...pending];
                                });
                            }
                        } catch { }
                    }
                }

                if (ticket?.id) {
                    // Load ticket into terminal context and fetch details once
                    debug('🎯 Loading ticket into terminal context, ticket.id:', ticket.id);
                    let tid = terminalId;
                    if (!tid) {
                        const userName = authUser?.name || null;
                        debug('🎯 No terminalId, registering for user:', userName);
                        tid = await terminalService.ensureTerminalRegistered(userName);
                    }
                    if (tid) {
                        debug('🎯 Loading existing ticket into terminal for automation commands, terminalId:', tid, 'ticketId:', ticket.id);
                        // Use loadTerminalTicket (not loadTerminalTicketWithOrders) to enable automation commands
                        await ticketService.loadTerminalTicket(tid, String(ticket.id));
                        if (!cancelled && isMountedRef.current) {
                            debug('✅ Terminal ready set to true');
                            setTerminalReady(true);
                        }
                    } else {
                        debug('⚠️ No terminal ID available, setting ready anyway');
                        if (!cancelled && isMountedRef.current) setTerminalReady(true);
                    }
                } else {
                    debug('🎯 No ticket.id, setting terminal ready immediately');
                    if (!cancelled && isMountedRef.current) setTerminalReady(true);
                }
            } catch (err) {
                debug('❌ Error in POSViewMobile prepare:', err);
                if (!cancelled && isMountedRef.current) setTerminalReady(true);
            }
        };
        prepare();
        return () => { cancelled = true; };
    }, [ticket?.id, tableId, authUser]);

    // When terminal is ready, fetch server orders once (occupied tables)
    useEffect(() => {
        if (terminalReady) {
            debug('🔄 Terminal ready, calling refreshOrdersFromServer');
            refreshOrdersFromServer();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [terminalReady]);

    // Refresh orders when shouldRefreshOrders changes (after successful add)
    useEffect(() => {
        if (shouldRefreshOrders > 0 && terminalReady) {
            debug('🔄 Order added successfully, refreshing orders from server...');
            refreshOrdersFromServer();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldRefreshOrders, terminalReady]);

    // Refresh orders when navigating to different table or ticket
    useEffect(() => {
        if (terminalReady && (ticket?.id || tableId)) {
            debug('🏠 Table/Ticket changed - refreshing orders from server...');
            console.log('🏠 [POSViewMobile] Navigating to table/ticket - refreshing orders');
            refreshOrdersFromServer();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ticket?.id, tableId, terminalReady]);

    // Reset pagination on category change
    useEffect(() => { setPage(0); }, [selectedCategory]);
    // Preload order tags for the selected category to maximize responsiveness
    useEffect(() => {
        if (!menuJS || !menuJS.categories || !menuJS.categories.length) return;
        if (!selectedCategory || selectedCategory === 'Todos') {
            // Preload first 2 categories as a heuristic when in "Todos"
            const firstTwo = menuJS.categories.slice(0, 2).map(c => c.name);
            setTimeout(() => { orderTagService.preload(menuJS, 6, firstTwo).catch(() => { }); }, 0);
            return;
        }
        setTimeout(() => { orderTagService.preloadForCategory(menuJS, selectedCategory, 6).catch(() => { }); }, 0);
    }, [menuJS, selectedCategory]);

    // Debug: List available automation command buttons when enabled
    useEffect(() => {
        const debugCommands = async () => {
            try {
                if (typeof window === 'undefined') return;
                if (localStorage.getItem('pmpos_debug_commands') !== 'true') return;
                const terminalId = terminalService.getTerminalId();
                if (!terminalId) return;
                const ticketData = await ticketService.getTicketByTable?.(tableId);
                const allOrders = Array.isArray(orders) && orders.length ? orders : (ticketData?.ticket?.orders || []);
                const orderUids = allOrders.map(o => o.uid).filter(Boolean);
                const ticketButtons = await automationService.getAutomationCommandButtons(terminalId);
                const orderButtons = orderUids.length ? await automationService.getAutomationCommandButtons(terminalId, [orderUids[0]]) : [];
                debug('?? Ticket buttons:', ticketButtons);
                debug('?? Order buttons (first order):', orderButtons);
                console.table(ticketButtons);
                console.table(orderButtons);
            } catch (e) {
                debug('?? Failed to fetch automation buttons:', e);
            }
        };
        debugCommands();
    }, [orders, tableId]);

    // Load existing ticket data for occupied tables (prefer read-service details to derive blocked status)
    useEffect(() => {
        let alive = true;
        const loadExistingTicket = async () => {
            if (!isNew && tableId && !ticket) {
                debug('🎯 Loading ticket for table using new flow:', tableId);

                try {
                    // Use the new ensureTicketForTable function that implements the correct Discovery GraphQL flow
                    const terminalTicket = await ensureTicketForTable(tableId);

                    if (terminalTicket && alive) {
                        debug('✅ Terminal ticket loaded/created:', terminalTicket);

                        // Convert terminal ticket orders to component format
                        const convertedOrders = (terminalTicket.orders || []).map(order => ({
                            id: order.uid || order.id || Date.now() + Math.random(),
                            uid: order.uid || order.id || null,
                            productId: order.productId,
                            name: order.productName || order.name || order.caption || resolveProductName(order.productId) || 'Producto',
                            caption: order.caption || order.name || order.productName,
                            quantity: order.quantity,
                            price: order.price,
                            portion: order.portion || 'Normal',
                            orderTags: Array.isArray(order.modifiers)
                                ? order.modifiers.map(m => `${m.name}:${m.price || 0}`).filter(Boolean)
                                : [],
                            lastUpdateDate: order.lastUpdateDate || null,
                            comments: order.comments || '',
                            isExisting: true,
                            status: determineOrderStatus(terminalTicket.orderStates, order.states)
                        }));

                        setOrders(convertedOrders);
                        debug(`✅ Loaded ${convertedOrders.length} orders from terminal ticket`);

                        // Check if ticket should be blocked (based on order states)
                        const ticketStatus = determineOrderStatus(terminalTicket.orderStates, null);
                        const isBlocked = ['SERVIDO', 'PAGADO', 'CERRADO'].includes(ticketStatus);
                        setTicketBlocked(isBlocked);
                    } else {
                        debug('⚠️ No terminal ticket available for table:', tableId);
                    }

                } catch (error) {
                    debug('❌ Error with new ticket flow, falling back to legacy flow:', error);
                    console.error('New ticket flow failed, using fallback:', error);

                    // Fallback to existing logic
                    try {
                        const existingTicketData = await ticketService.getTicketByTable(tableId);

                        if (existingTicketData?.ticket) {
                            debug('📦 Found existing ticket (fallback):', existingTicketData.ticket);

                            const convertedOrders = (existingTicketData.ticket.orders || []).map(order => ({
                                id: order.uid || Date.now() + Math.random(),
                                uid: order.uid,
                                productId: order.productId,
                                name: order.name || order.caption || order.menuItemName || resolveProductName(order.productId) || 'Producto',
                                caption: order.caption || order.name,
                                quantity: order.quantity,
                                price: order.price,
                                portion: order.portion || 'Normal',
                                orderTags: Array.isArray(order.tags)
                                    ? order.tags.map(t => t?.tagName ? `${t.tagName}:${t.tag}` : (t?.tag || '')).filter(Boolean)
                                    : (order.orderTags ? order.orderTags.split(',').filter(tag => tag.trim()) : []),
                                lastUpdateDate: order.lastUpdateDate || null,
                                comments: order.comments || '',
                                isExisting: true,
                                status: determineOrderStatus(order.OrderStates || order.orderStates, order.states)
                            }));

                            if (alive) setOrders(convertedOrders);
                            debug(`📦 Loaded ${convertedOrders.length} existing orders (fallback)`);
                        }
                    } catch (fallbackError) {
                        debug('❌ Fallback also failed:', fallbackError);
                        console.error('Both new flow and fallback failed:', fallbackError);
                    }
                }
            }

            // Legacy: Load from ticket prop if provided
            if (!isNew && ticket?.id) {
                try {
                    let sourceOrders = Array.isArray(ticket.orders) ? ticket.orders : [];
                    const hasNames = sourceOrders.some(o => !!(o && (o.name || o.caption || o.menuItemName)));
                    // If no orders or missing names, fetch detailed ticket by id
                    if (sourceOrders.length === 0 || !hasNames) {
                        try {
                            debug('?? Fetching detailed ticket by id (SQL preferred):', ticket.id);
                            const useSql = process.env.REACT_APP_USE_SQL_READS === 'true';
                            if (useSql && ticket?.id) {
                                const details = await ticketService.fetchTicketDetails(String(ticket.id));
                                const header = details?.header || {};
                                const ordersList = Array.isArray(details?.orders) ? details.orders : [];
                                // Derive blocked
                                const paymentStatus = (header.PaymentStatus || '').toUpperCase();
                                const statesStr = header.TicketStates || '';
                                const isBlocked = paymentStatus === 'BLOCKED' || (typeof statesStr === 'string' && (statesStr.includes('Bloqueado') || statesStr.includes('Cuenta solicitada')));
                                if (alive) setTicketBlocked(!!isBlocked);
                                sourceOrders = ordersList.map(o => ({
                                    id: o.OrderId || o.uid || Date.now() + Math.random(),
                                    uid: o.OrderId || o.uid || null,
                                    productId: o.MenuItemId || o.productId,
                                    name: o.MenuItemName || o.name || o.caption || resolveProductName(o.MenuItemId || o.productId) || 'Producto',
                                    caption: o.caption || o.name || o.MenuItemName,
                                    quantity: o.Quantity || o.quantity,
                                    price: o.Price || o.price,
                                    portion: o.PortionName || o.portion || 'Normal',
                                    orderTags: (() => {
                                        // SQL view returns OrderTags as string JSON or comma list
                                        const raw = o.OrderTags || o.orderTags || '';
                                        if (!raw) return [];
                                        try {
                                            const js = typeof raw === 'string' ? JSON.parse(raw) : raw;
                                            if (Array.isArray(js)) return js.map(t => t.tagName ? `${t.tagName}:${t.tag}` : (t.tag || '')).filter(Boolean);
                                        } catch { }
                                        return String(raw).split(',').map(s => s.trim()).filter(Boolean);
                                    })(),
                                    lastUpdateDate: o.LastUpdateDateTime || o.lastUpdateDate || null,
                                    comments: o.comments || '',
                                    isExisting: true,
                                    status: (() => {
                                        console.log('🔍 [POSViewMobile] Order from SQL:', {
                                            name: o.MenuItemName || o.name,
                                            OrderStates: o.OrderStates,
                                            orderStates: o.orderStates,
                                            states: o.states
                                        });
                                        return determineOrderStatus(o.OrderStates || o.orderStates, o.states);
                                    })()
                                }));
                            } else {
                                debug('?? Fetching detailed ticket by id (GraphQL fallback):', ticket.id);
                                const full = await getTicketById(ticket.id);
                                sourceOrders = full?.orders || [];
                            }
                        } catch (e) {
                            debug('?? Failed to fetch detailed ticket:', e);
                        }
                    }
                    const convertedOrders = sourceOrders.map(order => ({
                        id: order.uid || order.id || Date.now() + Math.random(),
                        uid: order.uid || order.id || null,
                        productId: order.productId,
                        name: order.name || order.caption || order.menuItemName || resolveProductName(order.productId) || 'Producto',
                        caption: order.caption || order.name,
                        quantity: order.quantity,
                        price: order.price,
                        portion: order.portion || 'Normal',
                        orderTags: Array.isArray(order.tags)
                            ? order.tags.map(t => t?.tagName ? `${t.tagName}:${t.tag}` : (t?.tag || '')).filter(Boolean)
                            : (order.orderTags ? order.orderTags.split(',').filter(tag => tag.trim()) : []),
                        lastUpdateDate: order.lastUpdateDate || null,
                        comments: order.comments || '',
                        isExisting: true,
                        status: (() => {
                            console.log('🔍 [POSViewMobile] Order from ticket prop:', {
                                name: order.name,
                                OrderStates: order.OrderStates,
                                orderStates: order.orderStates,
                                states: order.states
                            });
                            return determineOrderStatus(order.OrderStates || order.orderStates, order.states);
                        })()
                    }));
                    if (alive) setOrders(convertedOrders);
                } catch (e) {
                    debug('?? Failed to enrich ticket prop, falling back to any provided orders');
                }
            }
        };

        loadExistingTicket();
        return () => { alive = false; };
    }, [ticket, isNew, tableId]);

    // Guard: prevent add when ticket is blocked and role is Mesero

    const handleBack = () => {
        navigate('/tables');
    };

    const handleProductClick = useCallback((product) => {
        console.log('🖱️ [PRODUCTO CLICKEADO] Usuario hizo click en producto:', {
            name: product.name,
            caption: product.caption,
            id: product.id
        });

        if (ticketBlocked && !isAdmin) {
            console.log('🚫 [PRODUCTO CLICKEADO] Bloqueado por cuenta solicitada');
            setSnackbar({ open: true, severity: 'warning', message: 'Cuenta solicitada: requiere autorización' });
            return;
        }

        console.log('✅ [PRODUCTO CLICKEADO] Abriendo modal de producto');
        debug('??? Product clicked:', product.name);
        setSelectedProduct(product);
        setProductModalOpen(true);
    }, [isWaiter, ticketBlocked]);

    const handleAddToOrder = useCallback(async (orderData) => {
        console.log('📦 [MODAL CONFIRMADO] handleAddToOrder called with:', {
            productName: orderData.product?.name,
            quantity: orderData.quantity,
            portion: orderData.portion?.name,
            orderTags: orderData.orderTags,
            comments: orderData.comments
        });

        if (isWaiter && ticketBlocked) {
            console.log('🚫 [MODAL CONFIRMADO] Bloqueado por cuenta bloqueada');
            setSnackbar({ open: true, severity: 'warning', message: 'Cuenta bloqueada. No puede agregar productos.' });
            return;
        }

        console.log('✅ [MODAL CONFIRMADO] Procediendo a agregar orden al carrito...');
        debug('? Adding order (Discovery: server-first with comment):', orderData);

        // Local optimistic insert for UX
        const localId = Date.now() + Math.random();
        const newOrder = {
            id: localId,
            productId: orderData.product.productId || orderData.product.id,
            name: orderData.product.name || orderData.product.caption,
            caption: orderData.product.caption || orderData.product.name,
            quantity: orderData.quantity,
            price: orderData.price,
            portion: orderData.portion?.name || 'Normal',
            orderTags: orderData.orderTags.map(tag => tag.name),
            comments: orderData.comments,
            isExisting: false, // NUEVA orden - debe ser enviada
            status: 'pending'  // Status inicial
        };

        console.log('➕ [PRODUCTO AGREGADO] Nueva orden creada:', {
            name: newOrder.name,
            quantity: newOrder.quantity,
            isExisting: newOrder.isExisting,
            status: newOrder.status,
            localId: localId,
            fullOrder: newOrder
        });

        setOrders(prev => {
            const newOrders = [...prev, newOrder];
            console.log('🛒 [CARRITO ACTUALIZADO] Total órdenes después de agregar:', newOrders.length);
            console.log('🛒 [CARRITO ACTUALIZADO] Órdenes en carrito:', newOrders.map(o => ({
                name: o.name,
                isExisting: o.isExisting,
                status: o.status
            })));
            return newOrders;
        });
        // Mantener el usuario en el menú para continuar agregando productos
        // if (isMobile) setActiveTab(1); // Comentado: permite al usuario permanecer en el menú

        console.log('🛒 [POSViewMobile] Product added to cart (will be sent on "Comandar"):', newOrder.name);
        debug('🛒 Product added to local cart:', newOrder);

        // Note: Order will be sent to SambaPOS when user clicks "Comandar" button
        // No longer sending immediately to allow multiple items in cart

    }, [isMobile, authUser, ticket?.id, tableId]);

    const handleCloseModal = useCallback(() => {
        console.log('❌ [MODAL CERRADO] ProductDetailsModal closed');
        setProductModalOpen(false);
        setSelectedProduct(null);
    }, [isWaiter, isAdmin, ticketBlocked, authUser, ticket, tableId]);

    const handleQuantityChange = useCallback((orderId, delta) => {
        setOrders(prev => prev.map(order => {
            if (order.id === orderId) {
                const newQuantity = Math.max(1, order.quantity + delta);
                return { ...order, quantity: newQuantity };
            }
            return order;
        }));
    }, []);

    const handleRemoveOrder = useCallback((orderId) => {
        setOrders(prev => prev.filter(order => order.id !== orderId));
    }, []);

    // Helpers to reload orders from server after an action (gift/void)
    const refreshOrdersFromServer = useCallback(async () => {
        try {
            console.log('🔍 [refreshOrdersFromServer] Called - ticket?.id:', ticket?.id, 'tableId:', tableId);
            debug('🔍 refreshOrdersFromServer called - ticket?.id:', ticket?.id, 'tableId:', tableId);

            // Prefer detailed ticket by id when available
            if (ticket?.id) {
                debug('📋 Fetching ticket by ID:', ticket.id);
                const full = await getTicketById(ticket.id);
                debug('📋 getTicketById result:', full);
                const sourceOrders = full?.orders || [];
                debug('📋 Source orders from getTicketById:', sourceOrders.length, 'orders');

                if (!Array.isArray(sourceOrders) || sourceOrders.length === 0) {
                    debug('⚠️ SWR: keeping stale orders (server returned empty)', {
                        isArray: Array.isArray(sourceOrders),
                        length: sourceOrders?.length,
                        fullTicket: full
                    });
                    return; // keep current orders
                }
                const converted = sourceOrders.map(order => ({
                    id: order.uid || order.id || Date.now() + Math.random(),
                    uid: order.uid || order.id || null,
                    productId: order.productId,
                    name: order.name || order.caption || order.menuItemName || resolveProductName(order.productId) || 'Producto',
                    caption: order.caption || order.name,
                    quantity: order.quantity,
                    price: order.price,
                    portion: order.portion || 'Normal',
                    orderTags: Array.isArray(order.tags)
                        ? order.tags.map(t => t?.tagName ? `${t.tagName}:${t.tag}` : (t?.tag || '')).filter(Boolean)
                        : (order.orderTags ? order.orderTags.split(',').filter(tag => tag.trim()) : []),
                    lastUpdateDate: order.lastUpdateDate || null,
                    comments: order.comments || '',
                    isExisting: true,
                    status: (() => {
                        console.log('🔍 [refreshOrdersFromServer] Order from getTicketById:', {
                            name: order.name,
                            OrderStates: order.OrderStates,
                            orderStates: order.orderStates,
                            states: order.states
                        });
                        return determineOrderStatus(order.OrderStates || order.orderStates, order.states);
                    })()
                }));
                debug('✅ Converted orders from getTicketById:', converted.length, 'orders');
                // Merge: keep any pending locals without uid
                setOrders(prev => {
                    const pending = prev.filter(o => !o.uid && !o.isExisting);
                    debug('📋 Merging orders - converted:', converted.length, 'pending:', pending.length);
                    return [...converted, ...pending];
                });
                return;
            }
            // Else try by table
            if (tableId) {
                debug('🏠 Trying ticketService.getTicketByTable for tableId:', tableId);
                const existingTicketData = await ticketService.getTicketByTable(tableId);
                debug('🏠 ticketService.getTicketByTable result:', existingTicketData);
                if (existingTicketData?.ticket) {
                    const src = existingTicketData.ticket.orders || [];
                    debug('🏠 Orders from ticketService.getTicketByTable:', src.length, 'orders');
                    if (src.length === 0) {
                        debug('⚠️ No orders from ticketService.getTicketByTable, keeping stale');
                        return; // keep stale
                    }
                    const converted = src.map(order => ({
                        id: order.uid || order.id || Date.now() + Math.random(),
                        uid: order.uid || order.id || null,
                        productId: order.productId,
                        name: order.name || order.caption || order.menuItemName || resolveProductName(order.productId) || 'Producto',
                        caption: order.caption || order.name,
                        quantity: order.quantity,
                        price: order.price,
                        portion: order.portion || 'Normal',
                        orderTags: Array.isArray(order.tags)
                            ? order.tags.map(t => t?.tagName ? `${t.tagName}:${t.tag}` : (t?.tag || '')).filter(Boolean)
                            : (order.orderTags ? order.orderTags.split(',').filter(tag => tag.trim()) : []),
                        lastUpdateDate: order.lastUpdateDate || null,
                        comments: order.comments || '',
                        isExisting: true,
                        status: (() => {
                            console.log('🔍 [refreshOrdersFromServer] Order from ticketService.getTicketByTable:', {
                                name: order.name,
                                OrderStates: order.OrderStates,
                                orderStates: order.orderStates,
                                states: order.states
                            });
                            return determineOrderStatus(order.OrderStates || order.orderStates, order.states);
                        })()
                    }));
                    debug('✅ Converted orders from ticketService:', converted.length, 'orders');
                    setOrders(prev => {
                        const pending = prev.filter(o => !o.uid && !o.isExisting);
                        debug('🏠 Merging orders - converted:', converted.length, 'pending:', pending.length);
                        return [...converted, ...pending];
                    });
                    return;
                }
            }
            // Fallback: read from terminal
            debug('🖥️ Fallback: trying ticketService.getTerminalTicket');
            const tt = await ticketService.getTerminalTicket(terminalService.getTerminalId());
            debug('🖥️ ticketService.getTerminalTicket result:', tt);
            if (!tt) {
                console.warn('⚠️ No terminal ticket available, keeping current state');
                return; // keep current state if no terminal ticket
            }
            const list = tt?.orders || [];
            debug('🖥️ Orders from terminal ticket:', list.length, 'orders');
            if (!list.length) {
                debug('⚠️ No orders from terminal ticket, keeping stale');
                return; // keep stale
            }
            const converted = list.map(order => ({
                id: order.uid || order.id || Date.now() + Math.random(),
                uid: order.uid || order.id || null,
                productId: order.productId,
                name: order.name || order.caption || order.menuItemName || resolveProductName(order.productId) || 'Producto',
                caption: order.caption || order.name,
                quantity: order.quantity,
                price: order.price,
                portion: order.portion || 'Normal',
                orderTags: Array.isArray(order.tags)
                    ? order.tags.map(t => t?.tagName ? `${t.tagName}:${t.tag}` : (t?.tag || '')).filter(Boolean)
                    : (order.orderTags ? order.orderTags.split(',').filter(tag => tag.trim()) : []),
                lastUpdateDate: order.lastUpdateDate || null,
                comments: order.comments || '',
                isExisting: true,
                status: (() => {
                    console.log('🔍 [refreshOrdersFromServer] Order from terminal ticket:', {
                        name: order.name,
                        OrderStates: order.OrderStates,
                        orderStates: order.orderStates,
                        states: order.states
                    });
                    return determineOrderStatus(order.OrderStates || order.orderStates, order.states);
                })()
            }));
            debug('✅ Converted orders from terminal ticket:', converted.length, 'orders');
            setOrders(prev => {
                const pending = prev.filter(o => !o.uid && !o.isExisting);
                debug('🖥️ Merging orders - converted:', converted.length, 'pending:', pending.length);
                return [...converted, ...pending];
            });
        } catch (e) {
            debug('❌ refreshOrdersFromServer failed', e);
        }
    }, [ticket?.id, tableId, resolveProductName]);

    // Persist pending/local cart in sessionStorage
    useEffect(() => {
        try {
            const terminalId = terminalService.getTerminalId();
            if (typeof window !== 'undefined') {
                const key = `pmpos_cart_${terminalId || 'NA'}_${tableId || 'NA'}`;
                const pending = orders.filter(o => !o.isExisting);
                sessionStorage.setItem(key, JSON.stringify(pending));
            }
        } catch { }
    }, [orders, tableId]);

    const ensureTerminalContext = useCallback(async () => {
        let terminalId = terminalService.getTerminalId();
        if (!terminalId) {
            const userName = authUser?.name || null;
            terminalId = await terminalService.ensureTerminalRegistered(userName);
        }
        try {
            if (terminalId && ticket?.id) {
                // Validate that the ticket still exists and is active before loading
                console.log('🔍 [ensureTerminalContext] Validating ticket:', ticket.id);
                try {
                    const ticketValidation = await getTicketById(ticket.id);
                    if (ticketValidation && (!ticketValidation.isClosed)) {
                        console.log('✅ [ensureTerminalContext] Ticket is valid, loading into terminal');
                        await ticketService.loadTerminalTicketWithOrders(terminalId, String(ticket.id));
                    } else {
                        console.log('⚠️ [ensureTerminalContext] Ticket is closed/invalid, skipping load:', {
                            exists: !!ticketValidation,
                            isClosed: ticketValidation?.isClosed
                        });
                    }
                } catch (ticketError) {
                    console.log('⚠️ [ensureTerminalContext] Ticket validation failed, treating as invalid:', ticketError.message);
                    // Continue with table-only binding below
                }
            } else if (terminalId && tableId) {
                // Do not create ticket here to avoid duplicates; binding happens during add
                // If there's already a terminal ticket bound, changeEntity will succeed; otherwise submit will create
                try { await ticketService.changeEntityOfTerminalTicket(terminalId, tableId); } catch (e) { /* ignore */ }
            }
        } catch (e) {
            debug('?? ensureTerminalContext failed (non-critical):', e);
        }
        return terminalId;
    }, [authUser, ticket?.id, tableId]);

    // Load allowed automation commands per existing order to toggle buttons
    useEffect(() => {
        let cancelled = false;
        const loadAllowed = async () => {
            try {
                const terminalId = terminalService.getTerminalId();
                if (!terminalId) return; // no side-effects: do not create/bind here
                const map = {};
                for (const o of orders) {
                    if (!o?.uid || !o.isExisting) continue;
                    try {
                        const btns = await automationService.getAutomationCommandButtons(terminalId, [o.uid]);
                        const names = new Set((btns || []).map(b => b.name));
                        map[o.uid] = names;
                    } catch { }
                }
                if (!cancelled) setAllowedOrderCmds(map);
            } catch (e) {
                debug('?? Failed loading allowed order commands', e);
            }
        };
        loadAllowed();
        return () => { cancelled = true; };
    }, [orders, ensureTerminalContext]);

    const handleGiftOrderCore = useCallback(async (order, reason = '') => {
        try {
            debug(`🎁 Starting gift action for order: ${order?.uid}`);

            const terminalId = await ensureTerminalContext();
            if (!terminalId) {
                throw new Error('No se pudo obtener terminal ID');
            }
            if (!order?.uid) {
                throw new Error('No se pudo identificar la orden');
            }

            // Usar el nuevo servicio GraphQL para gift
            await automationService.executeAutomationCommand(terminalId, GIFT_COMMAND, reason || 'GraphQL gift', order.uid);
            debug(`✅ Gift order completed successfully`);

            // Refrescar datos
            await paymentService.recalculateTicket(terminalId, true);
            await refreshOrdersFromServer();
            await refreshTicketTotals();

            setSnackbar({ open: true, severity: 'success', message: 'Orden marcada como Regalo' });
        } catch (e) {
            debug('❌ Gift command failed:', e);
            setSnackbar({ open: true, severity: 'error', message: `No se pudo aplicar Regalo: ${e.message || e}` });
            throw e;
        }
    }, [ensureTerminalContext, refreshOrdersFromServer]);

    const handleVoidOrderCore = useCallback(async (order, reason = '') => {
        try {
            debug(`❌ Starting void action for order: ${order?.uid}`);

            const terminalId = await ensureTerminalContext();
            if (!terminalId) {
                throw new Error('No se pudo obtener terminal ID');
            }
            if (!order?.uid) {
                throw new Error('No se pudo identificar la orden');
            }

            // Usar el servicio unificado para void order
            await automationService.executeAutomationCommand(
                `VoidOrderViaAutomation:TerminalId=${terminalId},OrderUid=${order.uid}`,
                terminalId
            );
            debug(`✅ Void order completed successfully`);

            // Dispatch ticket updated event
            debug(`📡 Dispatching ticketUpdated event`);
            // Refrescar datos
            await paymentService.recalculateTicket(terminalId, true);
            await refreshOrdersFromServer();
            await refreshTicketTotals();

            setSnackbar({ open: true, severity: 'success', message: 'Orden anulada' });
        } catch (e) {
            debug('❌ Void command failed:', e);
            setSnackbar({ open: true, severity: 'error', message: `No se pudo anular: ${e.message || e}` });
            throw e;
        }
    }, [ensureTerminalContext, refreshOrdersFromServer]);

    const handleOrderTags = useCallback((order) => {
        debug(`🏷️ Opening order tags for order: ${order?.uid}`);
        setSelectedOrderForTags(order);
        setOrderTagsOpen(true);
    }, []);

    const handleOrderTagsApplied = useCallback(async (orderUid, appliedTags) => {
        debug(`✅ Order tags applied: ${orderUid}`, appliedTags);
        setOrderTagsOpen(false);
        setSelectedOrderForTags(null);

        // Refrescar órdenes para mostrar las nuevas etiquetas
        await refreshOrdersFromServer();
        setSnackbar({ open: true, severity: 'success', message: 'Etiquetas aplicadas correctamente' });
    }, [refreshOrdersFromServer]);

    // Prompt for admin PIN before executing gift/void
    const requestAdminPin = useCallback(async (action, order) => {
        try {
            debug(`?? Requesting admin PIN for ${action} on order:`, order?.uid);

            // Validate prerequisites before opening dialog
            if (!action || (action !== 'unlock' && !order)) {
                debug('? Invalid action or order for admin PIN request', { action, order });
                setSnackbar({
                    open: true,
                    severity: 'error',
                    message: 'Error: acción u orden inválida para autorización'
                });
                return;
            }

            setAdminAction(action);
            setAdminTargetOrder(order);
            setAdminPin('');
            setAdminReason('');
            setAdminPinError('');

            // Load reasons for this action from automation commands
            setReasonsLoading(true);
            try {
                // Map action to command name
                const commandName = action === 'gift' ? 'Regalo' : (action === 'void' ? 'Anular' : 'Desbloquear cuenta');
                const reasons = await fetchAutomationReasons(commandName);
                setAvailableReasons(reasons);
                debug(`? Loaded ${reasons.length} automation reasons for ${commandName}`);
            } catch (e) {
                debug('? Failed to load automation reasons:', e);
                // Use fallback reasons
                setAvailableReasons([
                    { id: 1, reason: 'CAMBIO DE PRODUCTO', actionType: action },
                    { id: 2, reason: 'ERROR DEL MESERO', actionType: action },
                    { id: 3, reason: 'CAMBIO DE OPINION CLIENTE', actionType: action },
                    { id: 4, reason: 'NO LO QUISO', actionType: action },
                    { id: 5, reason: 'ERROR COCINA', actionType: action },
                    { id: 6, reason: 'EL CLIENTE SE FUE', actionType: action }
                ]);
            } finally {
                setReasonsLoading(false);
            }

            debug(`?? Opening admin PIN dialog for ${action}`);
            // Force dialog to open - ensure state is set immediately
            setAdminPin('');
            setAdminPinError('');
            setAdminReason('');
            setAdminPinValidated(false);
            setAdminPinOpen(true);

            // Add a small delay to ensure dialog renders
            setTimeout(() => {
                debug(`? Admin PIN dialog should now be visible for ${action}`);
            }, 100);

        } catch (error) {
            debug('? requestAdminPin failed:', error);
            setSnackbar({
                open: true,
                severity: 'error',
                message: 'Error al abrir diálogo de autorización'
            });
        }
    }, []);

    const handleAdminPinConfirm = useCallback(async () => {
        if (!adminAction || (adminAction !== 'unlock' && !adminTargetOrder)) return;

        if (!adminPin || adminPin.length < 4) {
            setAdminPinError('PIN debe tener al menos 4 dígitos');
            return;
        }
        if (adminAction !== 'unlock' && !adminReason.trim()) {
            setAdminPinError('Debe ingresar una razón para esta acción');
            return;
        }

        setAdminValidating(true);
        setAdminPinError('');

        try {
            debug(`?? Starting PIN validation for ${adminAction} action with PIN: ${adminPin}`);

            // Validate PIN via GraphQL (getUser); if session already has admin, accept as fallback
            if (!adminPinValidated) {
                try {
                    await userService.validatePin(adminPin);
                } catch (e) {
                    if (isAdmin) {
                        debug('⚠️ PIN validation failed but session is ADMIN; accepting as fallback.');
                    } else {
                        throw e;
                    }
                }
            }
            debug(`? PIN validation successful for ${adminAction} action`);

            // Log the action with reason
            const actionText = adminAction === 'gift' ? 'Regalo' : 'Anulación';
            debug(`?? Admin action authorized: ${actionText} - Reason: ${adminReason}`);

            // Perform the action
            if (adminAction === 'gift') {
                debug(`?? Executing gift action on order ${adminTargetOrder?.uid}`);
                await handleGiftOrderCore(adminTargetOrder, adminReason);
                debug(`? Gift action completed successfully`);
            } else if (adminAction === 'void') {
                debug(`? Executing void action on order ${adminTargetOrder?.uid}`);
                await handleVoidOrderCore(adminTargetOrder, adminReason);
                debug(`? Void action completed successfully`);
            } else if (adminAction === 'unlock') {
                debug('?? Executing unlock via admin dialog');
                await handleUnlockTicket(adminReason);
                debug('? Unlock completed successfully');
            }

            // Close dialog and reset
            debug(`?? Closing admin dialog and resetting state`);
            setAdminPinOpen(false);
            setAdminPin('');
            setAdminReason('');
            setAdminPinError('');

        } catch (e) {
            debug('? Admin PIN validation or action failed:', e);
            console.error('? Admin PIN Error Details:', {
                error: e,
                message: e.message,
                stack: e.stack,
                adminAction: adminAction,
                adminPin: adminPin ? '[HIDDEN]' : 'EMPTY'
            });

            const errorMsg = e.message || 'Error de autorización';

            // Don't navigate away on PIN errors - stay in dialog
            if (errorMsg.includes('PIN inválido') || errorMsg.includes('Invalid PIN') || errorMsg.toLowerCase().includes('pin')) {
                setAdminPinError('PIN incorrecto. Verifique el PIN de administrador.');
            } else if (errorMsg.includes('network') || errorMsg.includes('timeout') || errorMsg.includes('conexión')) {
                setAdminPinError('Error de conexión. Inténtelo nuevamente.');
            } else if (errorMsg.includes('servidor') || errorMsg.includes('server')) {
                setAdminPinError('Error del servidor. Inténtelo más tarde.');
            } else if (errorMsg.includes('Sesión expirada') || errorMsg.includes('Unauthorized')) {
                setAdminPinError('Sesión expirada. Cierre y vuelva a iniciar sesión.');
            } else {
                setAdminPinError('Error de autorización: ' + errorMsg);
            }

            // Clear PIN for security but keep dialog open for retry
            setAdminPin('');

            // Explicitly prevent any navigation or dialog closure
            debug('?? Keeping admin dialog open for retry after error');
            return; // Don't close dialog on error
        } finally {
            setAdminValidating(false);
        }
    }, [adminAction, adminTargetOrder, adminPin, adminReason, handleGiftOrderCore, handleVoidOrderCore]);

    const handleSendToKitchen = useCallback(async () => {
        console.log('🍳 [POSViewMobile] Starting kitchen submission...');
        debug('🍳 Submitting to kitchen - will send all pending orders first');

        // Agregar indicador de procesamiento
        setSnackbar({ open: true, severity: 'info', message: 'Enviando órdenes a cocina...' });

        try {
            console.log('🔍 [POSViewMobile] Getting terminal ID...');
            let terminalId = terminalService.getTerminalId();
            if (!terminalId) {
                console.log('⚠️ [POSViewMobile] No terminal ID, registering...');
                const userName = authUser?.name || null;
                terminalId = await terminalService.ensureTerminalRegistered(userName);
            }
            console.log('✅ [POSViewMobile] Terminal ID obtained:', terminalId);

            if (!terminalId) {
                console.error('❌ [POSViewMobile] Still no terminal ID after registration');
                setSnackbar({ open: true, severity: 'error', message: 'No hay terminal registrada' });
                return;
            }

            // STEP 1: Send all pending orders from cart to SambaPOS
            // CRÍTICO: SOLO enviar órdenes NUEVAS (status 'pending' y NOT isExisting)
            const pendingOrders = orders.filter(order => {
                // DIAGNÓSTICO COMPLETO: Log cada orden individual
                console.log('🔍 [FILTRO DEBUG] Evaluando orden:', {
                    name: order.name,
                    isExisting: order.isExisting,
                    status: order.status,
                    hasUid: !!order.uid,
                    uid: order.uid,
                    orderData: order
                });

                // CORRECCIÓN CRÍTICA: Solo incluir órdenes NUEVAS (nunca enviadas)
                const isNewOrder = !order.isExisting &&
                    order.status === 'pending' &&
                    !order.uid;

                console.log('🔍 [FILTRO DEBUG] Resultado:', {
                    name: order.name,
                    isNewOrder: isNewOrder,
                    isExisting: order.isExisting,
                    status: order.status,
                    hasUid: !!order.uid
                });

                return isNewOrder;
            });

            console.log('🛒 [POSViewMobile] DEBUGGING ORDER FILTER (NUEVA LÓGICA):');
            console.log('🛒 [POSViewMobile] Total orders in cart:', orders.length);
            console.log('🛒 [POSViewMobile] RAW ORDERS ARRAY:', JSON.stringify(orders, null, 2));
            orders.forEach((order, index) => {
                const isNewOrder = !order.isExisting &&
                    order.status === 'pending' &&
                    !order.uid;
                console.log(`🛒 [POSViewMobile] Order ${index + 1}:`, {
                    name: order.name,
                    isExisting: order.isExisting,
                    status: order.status,
                    hasUid: !!order.uid,
                    uid: order.uid,
                    isNewOrder: isNewOrder,
                    willBeSent: isNewOrder
                });
            });
            console.log('🛒 [POSViewMobile] Found NEW orders to send:', pendingOrders.length);
            console.log('🛒 [POSViewMobile] NEW orders details:', pendingOrders.map(o => ({
                name: o.name,
                quantity: o.quantity,
                portion: o.portion,
                status: o.status
            })));

            if (pendingOrders.length > 0) {
                console.log('🍽️ [POSViewMobile] Pending orders to send:', pendingOrders.map(o => o.name));
                console.log('🍽️ [POSViewMobile] Sending pending orders to SambaPOS...');                // Handle ticket setup before sending orders
                if (ticketBlocked && isAdmin) {
                    try {
                        console.log('🔓 [POSViewMobile] Unlocking blocked ticket before sending orders...');
                        await automationService.executeAutomationCommand(
                            terminalId,
                            process.env.SAMBAPOS_UNLOCK_COMMAND || 'Desbloquear cuenta',
                            'Auto-unlock for admin before sending orders'
                        );
                        setTicketBlocked(false);
                    } catch (unlockErr) {
                        console.warn('⚠️ [POSViewMobile] Failed to unlock ticket before sending:', unlockErr);
                    }
                }

                // Ensure terminal context
                try {
                    if (terminalId && ticket?.id) {
                        await ticketService.loadTerminalTicketWithOrders(terminalId, String(ticket.id));
                        terminalTicketOpenRef.current = true;
                    } else if (terminalId) {
                        try {
                            const tt = await ticketService.getTerminalTicket(terminalId);
                            if (tt) {
                                terminalTicketOpenRef.current = true;
                                debug('✅ Existing terminal ticket found for orders');
                            }
                        } catch { }
                    }
                } catch (ctxErr) {
                    debug('⚠️ Could not prepare terminal ticket context before sending orders:', ctxErr);
                }

                // Send each pending order to SambaPOS
                console.log('🔄 [POSViewMobile] Starting to send orders one by one...');
                console.log('🔄 [POSViewMobile] Total pendingOrders to process:', pendingOrders.length);
                console.log('🔄 [POSViewMobile] PENDING ORDERS ARRAY:', JSON.stringify(pendingOrders.map(o => ({
                    name: o.name,
                    quantity: o.quantity,
                    portion: o.portion,
                    id: o.id,
                    isExisting: o.isExisting,
                    status: o.status
                })), null, 2));

                // OPTIMIZACIÓN CRÍTICA: Cargar el ticket UNA SOLA VEZ antes del bucle
                // para evitar que se sobrescriba en cada iteración
                console.log('🎫 [OPTIMIZACIÓN] Preparing for batch order processing...');

                for (let i = 0; i < pendingOrders.length; i++) {
                    const order = pendingOrders[i];
                    const isFirstOrder = i === 0;
                    console.log(`🔄 [BUCLE INICIO] Processing order ${i + 1}/${pendingOrders.length}:`, {
                        name: order.name,
                        quantity: order.quantity,
                        portion: order.portion,
                        orderId: order.id,
                        isFirstOrder: isFirstOrder
                    });

                    try {
                        console.log(`➕ [POSViewMobile] Sending order ${i + 1}/${pendingOrders.length} to SambaPOS:`, {
                            name: order.name,
                            quantity: order.quantity,
                            portion: order.portion,
                            tableId: tableId,
                            orderId: order.id
                        });

                        // CRÍTICO: Solo la primera orden carga el ticket, las siguientes lo preservan
                        console.log(`🚀 [ENVÍO] About to call orderService.addOrder for: ${order.name}, skipReload: ${!isFirstOrder}`);
                        const orderResult = await orderService.addOrder(
                            terminalId,
                            order.name,
                            order.quantity,
                            order.portion,
                            tableId,
                            !isFirstOrder // skipTicketReload = true para órdenes después de la primera
                        );

                        console.log(`✅ [POSViewMobile] Order ${i + 1} sent successfully:`, orderResult);
                        console.log(`🚀 [ENVÍO EXITOSO] orderService.addOrder completed for: ${order.name}`);

                        // Try to resolve UID for the sent order with retries (OPTIMIZADO)
                        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
                        let newUid = null;
                        // REDUCIDO: Solo 2 intentos con delay mínimo para mejorar rendimiento
                        for (let attempt = 0; attempt < 2 && !newUid; attempt++) {
                            try {
                                if (attempt > 0) await sleep(100); // Solo delay en retry
                                const tt = await ticketService.getTerminalTicket(terminalId);
                                const list = Array.isArray(tt?.orders) ? tt.orders : [];
                                for (const o of list) {
                                    if ((o?.name || '').toLowerCase() === (order.name || '').toLowerCase()
                                        && (o?.portion || 'Normal') === (order.portion || 'Normal')
                                        && o?.uid) {
                                        newUid = o.uid;
                                        break;
                                    }
                                }
                                if (newUid) {
                                    console.log(`🔗 [POSViewMobile] Found UID for order ${i + 1}:`, newUid);
                                    break;
                                }
                            } catch (uidErr) {
                                console.warn(`⚠️ [POSViewMobile] Failed to get UID for order ${i + 1}, attempt ${attempt + 1}:`, uidErr);
                            }
                        }

                        // Update local order with UID and mark as existing
                        if (newUid) {
                            console.log(`🔗 [POSViewMobile] Updating local order ${i + 1} with UID:`, newUid);
                            setOrders(prev => prev.map(o =>
                                o.id === order.id
                                    ? { ...o, uid: newUid, isExisting: true, status: 'ENVIADO' }
                                    : o
                            ));

                            // Apply comments if any
                            if (order.comments && order.comments.trim()) {
                                try {
                                    console.log(`💬 [POSViewMobile] Applying comments to order ${i + 1}:`, order.comments.trim());
                                    await automationService.executeAutomationCommand(
                                        terminalId,
                                        ORDER_COMMENT_COMMAND,
                                        order.comments.trim(),
                                        newUid
                                    );
                                } catch (commentErr) {
                                    console.warn(`⚠️ [POSViewMobile] Failed to apply comment to order ${i + 1}:`, commentErr);
                                }
                            }
                        } else {
                            console.warn(`⚠️ [POSViewMobile] Could not resolve UID for order ${i + 1}, but order was sent successfully`);
                            // Still mark as existing even without UID
                            setOrders(prev => prev.map(o =>
                                o.id === order.id
                                    ? { ...o, isExisting: true, status: 'ENVIADO' }
                                    : o
                            ));
                        }

                        console.log(`✅ [POSViewMobile] Order ${i + 1} processing completed:`, order.name);
                        console.log(`🏁 [BUCLE FIN] Completed processing order ${i + 1}/${pendingOrders.length}: ${order.name}`);
                    } catch (orderErr) {
                        console.error(`❌ [POSViewMobile] Failed to send order ${i + 1}:`, order.name, orderErr);
                        console.error(`❌ [BUCLE ERROR] Error in order ${i + 1}/${pendingOrders.length}:`, orderErr);
                        setSnackbar({ open: true, severity: 'error', message: `Error enviando ${order.name}` });
                        // Continue with next order instead of stopping the entire process
                        console.log(`⏭️ [POSViewMobile] Continuing with next order after error...`);
                    }
                }

                console.log('🏁 [POSViewMobile] ORDER SENDING LOOP COMPLETED!');
                console.log('🏁 [POSViewMobile] Successfully processed all orders. Original count:', pendingOrders.length);
                console.log('🏁 [POSViewMobile] Orders that were supposed to be sent:', pendingOrders.map(o => o.name));

                // Bind mesa AFTER adding all orders (if needed)
                try {
                    if (!ticket?.id && tableId && boundTableRef.current !== tableId) {
                        console.log('🏠 [POSViewMobile] Binding table to ticket after orders...');
                        await ticketService.changeEntityOfTerminalTicket(terminalId, String(tableId));
                        boundTableRef.current = tableId;
                    }
                } catch (bindErr) {
                    console.warn('⚠️ Failed to bind mesa after sending orders:', bindErr);
                }

                console.log('✅ [POSViewMobile] All pending orders sent to SambaPOS successfully');
            } else {
                console.log('ℹ️ [POSViewMobile] No pending orders to send - all orders already in SambaPOS');
            }

            // STEP 2: Now close the terminal ticket to finalize submission
            console.log('🍳 [POSViewMobile] Closing terminal ticket to finalize submission...');
            debug('🍳 Closing terminal ticket to submit orders');

            const closeResult = await closeTerminalTicket();
            console.log('✅ [POSViewMobile] Terminal ticket closed successfully:', closeResult);
            debug('✅ Terminal ticket closed successfully');

            // CRITICAL: Refresh orders from server to get updated states BEFORE navigating (OPTIMIZADO)
            console.log('🔄 [POSViewMobile] Refreshing orders from server to get updated states...');
            try {
                await refreshOrdersFromServer();
                console.log('✅ [POSViewMobile] Orders refreshed with updated states from server');

                // ELIMINADO: Delay innecesario - la UI se actualiza automáticamente
            } catch (refreshErr) {
                console.warn('⚠️ [POSViewMobile] Failed to refresh orders after submit:', refreshErr);
            }

            // Success - dispatch events and navigate
            if (typeof window !== 'undefined') {
                console.log('📡 [POSViewMobile] Dispatching ticketUpdated event...');
                window.dispatchEvent(new CustomEvent('ticketUpdated', { detail: { source: 'submit' } }));

                // Quick verification
                if (tableId) {
                    console.log('🔍 [POSViewMobile] Quick order verification...');
                    const verifySuccess = await verifyOrderPersistence(tableId, ticket?.id);
                    if (verifySuccess) {
                        console.log('✅ [POSViewMobile] Order persistence confirmed');
                    } else {
                        console.warn('⚠️ [POSViewMobile] Verification incomplete - but orders were sent');
                    }
                }

                // Start refresh in background
                if (typeof window.refreshData === 'function') {
                    console.log('🔄 [POSViewMobile] Starting background refresh...');
                    window.refreshData('tables').catch(err => {
                        debug('⚠️ Background refresh failed:', err);
                    });
                }
            }

            console.log('🏠 [POSViewMobile] Navigating back to tables...');
            navigate('/tables', { replace: true });

        } catch (error) {
            console.error('❌ [POSViewMobile] Error submitting to kitchen:', error);
            debug('🚨 Error submitting to kitchen:', error);
            setSnackbar({ open: true, severity: 'error', message: 'Error al enviar a cocina' });
        }
    }, [orders, authUser, tableId, ticket, boundTableRef, terminalTicketOpenRef, navigate, setSnackbar, isAdmin, ticketBlocked, refreshOrdersFromServer]);

    // Robust order persistence verification using direct SambaPOS API
    const verifyOrderPersistence = useCallback(async (tableId, originalTicketId) => {
        debug('🔍 Starting order persistence verification for table:', tableId);

        const maxRetries = 3; // Reduced to 3 attempts (max 3 seconds total)
        const retryDelays = [500, 1000, 1500]; // Much shorter delays

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                debug(`🔄 Verification attempt ${attempt}/${maxRetries}...`);

                // Wait before checking (progressive delays)
                if (attempt > 1) {
                    await new Promise(resolve => setTimeout(resolve, retryDelays[attempt - 2]));
                }

                // Get fresh table tickets directly from SambaPOS GraphQL API
                const tableTickets = await ticketService.getTableTickets(tableId);
                debug(`📋 Retrieved ${tableTickets.length} tickets for table ${tableId}`);

                // Check for meaningful ticket data indicating order persistence
                const ticketsWithOrders = tableTickets.filter(ticket => {
                    const hasOrders = ticket.orders && ticket.orders.length > 0;
                    const hasValidTotal = ticket.totalAmount && ticket.totalAmount > 0;
                    const hasRemainingAmount = ticket.remainingAmount && ticket.remainingAmount > 0;
                    const hasValidOrderStates = ticket.orderStates && ticket.orderStates !== '{}';

                    debug(`🔍 Ticket ${ticket.id || ticket.number} analysis:`, {
                        hasOrders: hasOrders,
                        orderCount: ticket.orders?.length || 0,
                        totalAmount: ticket.totalAmount || 0,
                        remainingAmount: ticket.remainingAmount || 0,
                        hasOrderStates: hasValidOrderStates
                    });

                    return hasOrders || hasValidTotal || hasRemainingAmount || hasValidOrderStates;
                });

                debug(`🎫 Found ${ticketsWithOrders.length} tickets with order data`);

                if (ticketsWithOrders.length > 0) {
                    // Calculate total amount across all tickets with orders
                    const totalTableAmount = ticketsWithOrders.reduce((sum, ticket) => {
                        const amount = parseFloat(ticket.totalAmount || ticket.remainingAmount || 0);
                        debug(`💰 Adding ticket ${ticket.id || ticket.number} amount: ${amount}`);
                        return sum + amount;
                    }, 0);

                    debug(`💰 Total table amount after submission: ${totalTableAmount}`);

                    // If we have a meaningful amount, consider it successful
                    if (totalTableAmount > 0) {
                        debug('✅ Order persistence verified - table has active tickets with amounts');
                        return true;
                    }

                    // Even if no amount, having orders is a good sign
                    const hasAnyOrders = ticketsWithOrders.some(ticket =>
                        ticket.orders && ticket.orders.length > 0
                    );

                    if (hasAnyOrders) {
                        debug('✅ Order persistence verified - table has tickets with orders');
                        return true;
                    }
                }

                // Check if this is the final attempt
                if (attempt === maxRetries) {
                    debug('❌ Final attempt - no order persistence detected');
                    return false;
                }

                debug(`⏳ No persistence detected on attempt ${attempt}, retrying...`);

            } catch (error) {
                debug(`❌ Verification attempt ${attempt} failed:`, error.message);

                // If this is the final attempt or a non-retryable error, fail
                if (attempt === maxRetries || error.message.includes('authentication')) {
                    debug('❌ Verification failed permanently');
                    return false;
                }
            }
        }

        return false;
    }, []);

    const handlePrintBill = useCallback(async () => {
        try {
            let terminalId = terminalService.getTerminalId();
            if (!terminalId) {
                const userName = authUser?.name || null;
                terminalId = await terminalService.ensureTerminalRegistered(userName);
            }

            // Ensure ticket context is loaded on this terminal before executing automation commands
            try {
                if (terminalId && ticket?.id) {
                    // For mesa ocupada: ALWAYS load the existing ticket into terminal first
                    console.log('📋 [POSViewMobile] Loading existing ticket into terminal for automation command:', ticket.id);
                    await ticketService.loadTerminalTicket(terminalId, String(ticket.id));
                    debug('✅ Loaded existing ticket into terminal for automation commands:', ticket.id);
                } else if (terminalId && tableId) {
                    await ticketService.changeEntityOfTerminalTicket(terminalId, String(tableId));
                    debug('✅ Bound terminal to mesa for print:', tableId);
                }
            } catch (ctxErr) {
                console.warn('⚠️ [POSViewMobile] Could not prepare terminal ticket context before automation command:', ctxErr);
                debug('⚠️ Could not prepare terminal ticket context before print:', ctxErr);
            }

            // Use automation command per DISCOVERY GRAPHQL documentation
            if (terminalId) {
                console.log('🖨️ [POSViewMobile] Executing print bill automation command...');
                const printCmd = process.env.SAMBAPOS_PRINT_ACCOUNT_COMMAND || 'Imprimir factura';

                // Call automation command with correct parameters: (terminalId, commandName, orderUid, value)
                await automationService.executeAutomationCommand(terminalId, printCmd, null, "");

                console.log('✅ [POSViewMobile] Print bill command executed successfully');
                debug('✅ Print bill via automation command executeAutomationCommandForTerminalTicket');

                // Notify tables to refresh immediately (should flip to Cuenta solicitada)
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('ticketUpdated', { detail: { source: 'print-bill' } }));
                    if (typeof window.refreshData === 'function') {
                        window.refreshData('tables').catch(() => { });
                    }
                }

                // Mark as blocked in UI immediately (only if component is still mounted)
                if (isMountedRef.current) {
                    setTicketBlocked(true);
                }
                navigate('/tables', { replace: true });
            } else {
                throw new Error('No hay terminal registrada para imprimir');
            }
        } catch (e) {
            console.error('❌ [POSViewMobile] Print bill failed:', e);
            debug('❌ Print bill failed:', e);
            alert('Error al imprimir cuenta: ' + (e?.message || e));
        }
    }, [authUser, ticket, tableId]);

    const handlePayment = useCallback(async (paymentInfo) => {
        debug('💳 Processing payment using GraphQL Flow Service:', paymentInfo);

        try {
            // Usar el nuevo servicio GraphQL
            let terminalId = terminalService.getTerminalId();
            if (!terminalId) {
                // Registrar terminal usando terminalService unificado (GraphQL Simple)
                terminalId = await terminalService.registerTerminal('COMEDOR', 'SERVIDOR', 'MESAS', authUser?.name || 'graphiql');
                terminalService.setTerminalId(terminalId);
            }

            // Cargar ticket si existe usando ticketService unificado
            if (ticket?.id) {
                await ticketService.loadTerminalTicket(terminalId, String(ticket.id));
            }

            // Procesar pago usando el servicio unificado
            const result = await paymentService.payTerminalTicket(
                terminalId,
                paymentInfo.paymentType,
                paymentInfo.amount
            );

            debug('✅ Payment processed successfully:', result);

            // Limpiar órdenes tras pago exitoso
            if (isMountedRef.current) setOrders([]);

            // Navegar de vuelta a mesas
            navigate('/tables');

        } catch (error) {
            debug('❌ Payment failed:', error);
            setSnackbar({ open: true, severity: 'error', message: `Error en pago: ${error.message}` });
        }
    }, [navigate, authUser, ticket]);

    const calculateTotal = useCallback(() => {
        return orders.reduce((total, order) => total + (order.price * order.quantity), 0);
    }, [orders]);

    const refreshTicketTotals = useCallback(async () => {
        try {
            if (ticket?.id) {
                const full = await getTicketById(ticket.id);
                const ta = parseFloat(full?.totalAmount || 0);
                const ra = parseFloat(full?.remainingAmount || ta || 0);
                setTicketTotals({ totalAmount: ta, remainingAmount: ra });
            }
        } catch (e) {
            debug('ticketTotals refresh failed', e?.message || e);
        }
    }, [ticket?.id]);

    const handleUnlockTicket = useCallback(async (reason = '') => {
        try {
            let terminalId = terminalService.getTerminalId();
            if (!terminalId) {
                const userName = authUser?.name || null;
                terminalId = await terminalService.ensureTerminalRegistered(userName);
            }

            // Use GraphQL service to unlock ticket
            await automationService.executeAutomationCommand(
                process.env.SAMBAPOS_UNLOCK_COMMAND || 'Desbloquear cuenta',
                terminalId,
                {
                    ticketId: ticket?.id || null,
                    reason: reason || 'Manual unlock'
                }
            );

            setTicketBlocked(false);
            await refreshOrdersFromServer();
            await refreshTicketTotals();
            setSnackbar({ open: true, severity: 'success', message: 'Cuenta desbloqueada' });
            window.dispatchEvent(new CustomEvent('ticketUpdated', { detail: { source: 'unlock' } }));
        } catch (e) {
            debug('unlock failed', e);
            setSnackbar({ open: true, severity: 'error', message: 'No se pudo desbloquear la cuenta' });
        }
    }, [authUser, ticket?.id, tableId, refreshOrdersFromServer, refreshTicketTotals]);


    const handleOpenPaymentDialog = useCallback(async () => {
        // Ensure terminal and ticket context before opening dialog
        try {
            let terminalId = terminalService.getTerminalId();
            if (!terminalId) {
                const userName = authUser?.name || null;
                terminalId = await terminalService.ensureTerminalRegistered(userName);
            }

            if (!terminalId) {
                setSnackbar({ open: true, severity: 'error', message: 'No hay terminal registrada' });
                return;
            }

            try {
                if (terminalId && ticket?.id) {
                    await ticketService.loadTerminalTicketWithOrders(terminalId, String(ticket.id));
                } else if (terminalId && tableId) {
                    await ticketService.changeEntityOfTerminalTicket(terminalId, (typeof tableName !== 'undefined' && tableName) ? tableName : String(tableId));
                }
            } catch (ctxErr) {
                debug('?? Could not ensure ticket context before opening payment dialog:', ctxErr);
            }
        } catch (e) {
            debug('? Error preparing payment dialog:', e);
        }

        if (isMountedRef.current) {
            setPaymentDialogOpen(true);
        }
    }, [authUser, ticket, tableId]);

    // Bottom actions modal handlers
    const openActionsModal = useCallback(() => setActionsModalOpen(true), []);
    const closeActionsModal = useCallback(() => setActionsModalOpen(false), []);
    const handleViewOrders = useCallback(() => { setActiveTab(1); closeActionsModal(); }, [closeActionsModal]);
    const handlePrintFromModal = useCallback(async () => { try { await handlePrintBill(); } finally { closeActionsModal(); } }, [handlePrintBill, closeActionsModal]);

    // Handler para abrir el nuevo PaymentProcessor unificado
    const handleOpenPaymentProcessor = useCallback(async () => {
        debug('💳 Abriendo PaymentProcessor unificado');

        if (!ticket?.id) {
            debug('⚠️ No hay ticket activo para procesar pago');
            setSnackbar({ open: true, severity: 'warning', message: 'No hay pedidos para procesar' });
            return;
        }

        // Validar que hay órdenes
        if (orders.length === 0) {
            debug('⚠️ No hay órdenes en el ticket para procesar pago');
            setSnackbar({ open: true, severity: 'warning', message: 'Agregue productos antes de procesar el pago' });
            return;
        }

        try {
            // Abrir el nuevo PaymentProcessor
            setPaymentProcessorOpen(true);
        } catch (error) {
            debug('❌ Error abriendo PaymentProcessor:', error);
            setSnackbar({ open: true, severity: 'error', message: 'Error al abrir procesador de pagos' });
        }
    }, [ticket, orders.length]);

    const handlePaymentProcessorCompleted = useCallback(async (paymentInfo) => {
        debug('✅ Pago procesado exitosamente:', paymentInfo);

        try {
            // Refrescar datos después del pago
            await refreshOrdersFromServer();

            // Mostrar confirmación
            setSnackbar({
                open: true,
                severity: 'success',
                message: `Pago de ${paymentInfo.amount} procesado con ${paymentInfo.paymentMethod}`
            });
        } catch (error) {
            debug('❌ Error refrescando después del pago:', error);
        }
    }, [refreshOrdersFromServer]);

    const handlePayFromModalNew = useCallback(async () => { try { await handleOpenPaymentProcessor(); } finally { closeActionsModal(); } }, [handleOpenPaymentProcessor, closeActionsModal]);

    const handleTicketTags = useCallback(() => { closeActionsModal(); setSnackbar({ open: true, severity: 'info', message: 'Etiquetas del ticket: próximamente' }); }, [closeActionsModal]);



    const toggleOrderExpansion = (index) => {
        setExpandedOrderIndex(expandedOrderIndex === index ? -1 : index);
    };

    const totalAmount = calculateTotal();
    const displayTotal = ticket?.id ? (ticketTotals.totalAmount || totalAmount) : totalAmount;
    const orderCount = orders.length;

    // Mobile menu component
    const MobileMenuContainer = ({ menuOverride = null }) => (
        <Box sx={{ height: '100%', overflow: 'auto', p: 1 }}>
            {configurationError ? (
                <Box sx={{ p: 2 }}>
                    <Alert severity="error" sx={{ mb: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            ?? Configuración Requerida
                        </Typography>
                        <Typography variant="body2" paragraph>
                            {configurationError}
                        </Typography>
                        <Typography variant="body2">
                            <strong>Pasos requeridos:</strong><br />
                            1. Validar Message Server en modo API (puerto con '+')<br />
                            2. Crear/autorizar app 'pmpos' en Users {'>'} Applications<br />
                            3. Asegurar que el servicio use la MISMA BD que SambaPOS<br />
                            4. Verificar variables de entorno en .env<br />
                            5. Probar en GraphiQL primero
                        </Typography>
                    </Alert>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => window.location.reload()}
                        fullWidth
                    >
                        Reintentar después de configurar
                    </Button>
                </Box>
            ) : menuLoading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 200, gap: 2 }}>
                    <CircularProgress />
                    <Typography>Cargando menú desde SambaPOS...</Typography>
                    <Typography variant="caption" color="text.secondary">
                        Verificando conexión GraphQL
                    </Typography>
                </Box>
            ) : (
                <MobileMenu
                    menu={menuOverride || (menuJS || {})}
                    onMenuItemClick={handleProductClick}
                    compact={true}
                />
            )}
        </Box>
    );

    // Category bar and product grid (restaurant style)
    useEffect(() => { setPage(0); }, [selectedCategory]);
    useEffect(() => {
        const calcRows = () => {
            const h = productsBoxRef.current?.clientHeight || 0;
            if (!h) return;
            const cardH = isMobile ? 92 : 110;
            const rowGap = 8; // spacing={1}
            const reserve = 40; // pagination space
            const rows = Math.max(1, Math.floor((h - reserve) / (cardH + rowGap)));
            setGridRows(rows);
        };
        calcRows();
        window.addEventListener('resize', calcRows);
        return () => window.removeEventListener('resize', calcRows);
    }, [isMobile]);
    const CategoryBar = () => {
        const cats = (menuJS?.categories || []).map(c => c.name);
        const items = ['Todos', ...cats];
        const paletteColors = ['primary', 'secondary', 'success', 'warning', 'info', 'error'];
        return (
            <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
                {items.map((cat, idx) => {
                    const color = paletteColors[idx % paletteColors.length];
                    const isSelected = selectedCategory === cat;
                    return (
                        <Chip
                            key={cat}
                            label={cat}
                            color={isSelected ? 'primary' : color}
                            onClick={() => setSelectedCategory(cat)}
                            variant={isSelected ? 'filled' : 'outlined'}
                            sx={{ flexShrink: 0, fontSize: { xs: 18, sm: 20 }, fontWeight: 700, px: 2, height: 44 }}
                        />
                    );
                })}
            </Box>
        );
    };

    const ProductGrid = () => {
        const categories = menuJS?.categories || [];
        const productsAll = selectedCategory === 'Todos'
            ? categories.flatMap(c => c.menuItems || [])
            : (categories.find(c => c.name === selectedCategory)?.menuItems || []);
        // Category color mapping: prefer color coming from SambaPOS category fields
        const paletteColors = ['primary', 'secondary', 'success', 'warning', 'info', 'error'];
        const catColorByName = new Map();
        const idToCatName = new Map();
        categories.forEach((c, idx) => {
            const rawCol = c.color || c.buttonColor || c.foreground || c.background || c.bgColor || (c.custom && (c.custom.color || c.custom.buttonColor));
            if (typeof rawCol === 'string' && rawCol.trim()) catColorByName.set(c.name, rawCol.trim());
            (c.menuItems || []).forEach(it => {
                const key = String(it.id || it.productId || it.product?.id || it.name || '');
                if (key && !idToCatName.has(key)) idToCatName.set(key, c.name);
            });
        });
        const getNeonColor = (item) => {
            let catName = selectedCategory !== 'Todos' ? selectedCategory : (idToCatName.get(String(item.id || item.productId || item.product?.id || item.name || '')) || categories[0]?.name);
            // Use category-provided color if available, else fallback to themed palette by index
            const catProvided = catName && catColorByName.get(catName);
            if (catProvided) return catProvided;
            const idx = Math.max(0, categories.findIndex(c => c.name === catName));
            const colorName = paletteColors[(idx >= 0 ? idx : 0) % paletteColors.length];
            return (theme.palette[colorName] && theme.palette[colorName].main) || theme.palette.primary.main;
        };
        // Pagination
        const cols = isSmallMobile ? 2 : isMobile ? 3 : 4;
        const rows = gridRows || (isSmallMobile ? 4 : isMobile ? 4 : 4);
        const itemsPerPage = Math.max(1, cols * rows);
        const totalPages = Math.max(1, Math.ceil(productsAll.length / itemsPerPage));
        const currentPage = Math.min(page, totalPages - 1);
        const start = currentPage * itemsPerPage;
        const pageItems = productsAll.slice(start, start + itemsPerPage);
        return (
            <>
                <Grid container spacing={1}>
                    {pageItems.map(p => {
                        const neon = getNeonColor(p);
                        return (
                            <Grid item xs={12 / cols} sm={12 / cols} md={12 / cols} key={`${p.id || p.name}-${selectedCategory}-${start}`}>
                                <Card onClick={() => handleProductClick(p)} sx={{
                                    cursor: 'pointer',
                                    height: isMobile ? 120 : 128,
                                    display: 'flex', alignItems: 'center', position: 'relative',
                                    border: `1.5px solid ${neon}`,
                                    boxShadow: `0 0 10px ${neon}88`
                                }}>
                                    <CardContent sx={{ p: 1, width: '100%', py: 1 }}>
                                        <Typography variant="subtitle1" fontWeight="bold" sx={{
                                            fontSize: { xs: '1.2rem', sm: '1.3rem' },
                                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden', lineHeight: 1.2
                                        }}>
                                            {p.name || p.caption}
                                        </Typography>
                                        <Typography color="text.secondary" sx={{ mt: 0.5, fontWeight: 700, fontSize: { xs: '1.3rem', sm: '1.5rem' } }}>
                                            {formatMXN((p.portions && p.portions[0]?.price) || (p.product?.portions && p.product.portions[0]?.price) || 0)}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
                {totalPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                        <Button size="small" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Anterior</Button>
                        <Typography variant="caption">Página {currentPage + 1} de {totalPages}</Typography>
                        <Button size="small" disabled={currentPage >= totalPages - 1} onClick={() => setPage(currentPage + 1)}>Siguiente</Button>
                    </Box>
                )}
            </>
        );
    };

    // Mobile cart component - Fixed to use full available space
    const MobileCart = () => (
        <Paper sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            width: '100%',
            borderRadius: { xs: 0, sm: 1 }
        }}>
            {orders.length === 0 ? (
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    textAlign: 'center',
                    p: 3
                }}>
                    <ReceiptIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h5" color="text.secondary" gutterBottom>
                        Carrito vacío
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                        Selecciona productos del menú para empezar
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={() => setActiveTab(0)}
                        size="large"
                        startIcon={<MenuIcon />}
                    >
                        Ver Menú
                    </Button>
                </Box>
            ) : (
                <>
                    {/* Enhanced Cart Header with all ticket info */}
                    <Box sx={{
                        p: { xs: 1.5, sm: 2 },
                        borderBottom: 2,
                        borderColor: 'primary.main',
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText'
                    }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {/* First row: Mesa and Ticket */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                                    Mesa {tableId}
                                </Typography>
                                <Typography variant="body1" fontWeight="600" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                                    {isNew ? 'Nuevo Ticket' : (ticket?.number ? `Ticket #${ticket.number}` : (ticket?.id ? `Ticket #${ticket.id}` : 'Ticket Pendiente'))}
                                </Typography>
                            </Box>

                            {/* Second row: Order count and Total */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                    Pedido ({orderCount} {orderCount === 1 ? 'producto' : 'productos'})
                                </Typography>
                                <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                                    Total: {formatMXN(displayTotal)}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    {/* Scrollable orders list - takes full available space, with bottom padding for sticky buttons */}
                    <Box sx={{
                        flex: 1,
                        overflowY: 'auto',
                        p: 1,
                        // ZONA SEGURA CRÍTICA: Espacio generoso para que los botones NUNCA tapen contenido
                        pb: isMobile ? 'calc(160px + env(safe-area-inset-bottom, 0px))' : 'calc(180px + 16px)' // Zona segura amplia
                    }}>
                        <List sx={{ py: 0 }}>
                            {orders.map((order, index) => (
                                <Card key={order.id} sx={{ mb: 1, overflow: 'visible' }}>
                                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                            <Box flex={1} mr={2}>
                                                <Box display="flex" alignItems="center" gap={1} mb={1}>
                                                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1.1rem', sm: '1rem' } }}>
                                                        {order?.name || order?.caption || order?.menuItemName || 'Producto'}
                                                    </Typography>
                                                    <Chip
                                                        size="small"
                                                        variant="outlined"
                                                        color="primary"
                                                        label={`Cantidad: ${order.quantity}`}
                                                        sx={{ fontWeight: 'bold' }}
                                                    />
                                                    {order.isExisting ? (
                                                        <Chip size="small" label="ENVIADO" color="success" variant="filled" />
                                                    ) : (
                                                        <Chip size="small" label="NUEVO" color="warning" variant="filled" />
                                                    )}
                                                </Box>

                                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                                    {order.portion} • {formatMXN(order.price)} c/u • Total: {formatMXN((order.price || 0) * (order.quantity || 0))}
                                                </Typography>

                                                {(order.orderTags.length > 0 || order.comments) && (
                                                    <Box mb={1}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => toggleOrderExpansion(index)}
                                                            sx={{ p: 0.5, mr: 0.5 }}
                                                        >
                                                            {expandedOrderIndex === index ? <CollapseIcon /> : <ExpandIcon />}
                                                        </IconButton>
                                                        <Typography variant="caption" color="primary.main">
                                                            {order.orderTags.length > 0 && `${order.orderTags.length} opciones`}
                                                            {order.comments && ' · Comentarios'}
                                                        </Typography>
                                                    </Box>
                                                )}

                                                <Collapse in={expandedOrderIndex === index}>
                                                    {order.orderTags.length > 0 && (
                                                        <Box mb={1}>
                                                            {order.orderTags.map((tag, tagIndex) => (
                                                                <Chip
                                                                    key={tagIndex}
                                                                    label={tag}
                                                                    size="small"
                                                                    variant="outlined"
                                                                    sx={{ mr: 0.5, mb: 0.5 }}
                                                                />
                                                            ))}
                                                        </Box>
                                                    )}
                                                    {order.comments && (
                                                        <Alert severity="info" sx={{ mt: 1 }}>
                                                            <Typography variant="caption">
                                                                ?? {order.comments}
                                                            </Typography>
                                                        </Alert>
                                                    )}
                                                </Collapse>
                                            </Box>

                                            <Box display="flex" flexDirection="column" alignItems="flex-end" gap={1}>
                                                <Typography variant="h6" color="primary.main" fontWeight="bold">
                                                    {formatMXN(order.price * order.quantity)}
                                                </Typography>

                                                <Box display="flex" alignItems="center" gap={0.5}>
                                                    {/* Normal quantity and delete buttons - only for NOT sent orders */}
                                                    {!isOrderSent(order) && (
                                                        <>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleQuantityChange(order.id, -1)}
                                                                disabled={order.quantity <= 1}
                                                                color="primary"
                                                                title="Reducir cantidad"
                                                            >
                                                                <RemoveIcon fontSize="small" />
                                                            </IconButton>
                                                            <Typography variant="body1" sx={{ minWidth: 24, textAlign: 'center' }}>
                                                                {order.quantity}
                                                            </Typography>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleQuantityChange(order.id, 1)}
                                                                color="primary"
                                                                title="Aumentar cantidad"
                                                            >
                                                                <AddIcon fontSize="small" />
                                                            </IconButton>
                                                            <IconButton
                                                                size="small"
                                                                color="primary"
                                                                title="Etiquetas"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleOrderTags(order);
                                                                }}
                                                            >
                                                                <LabelIcon fontSize="small" />
                                                            </IconButton>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleRemoveOrder(order.id)}
                                                                color="error"
                                                                title="Eliminar orden"
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </>
                                                    )}

                                                    {/* Special buttons for SENT orders - Cortesía and Cancelar Producto */}
                                                    {isOrderSent(order) && (
                                                        <>
                                                            <Typography variant="body1" sx={{ minWidth: 24, textAlign: 'center', mr: 1 }}>
                                                                {order.quantity}
                                                            </Typography>
                                                            <IconButton
                                                                size="small"
                                                                color="primary"
                                                                title="Etiquetas"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleOrderTags(order);
                                                                }}
                                                            >
                                                                <LabelIcon fontSize="small" />
                                                            </IconButton>
                                                            <IconButton
                                                                size="small"
                                                                color="success"
                                                                title="Cortesía"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    try {
                                                                        debug(`🎁 Gift button clicked for order: ${order?.uid}`);
                                                                        requestAdminPin('gift', order);
                                                                    } catch (error) {
                                                                        debug('❌ Error in gift button click:', error);
                                                                        setSnackbar({
                                                                            open: true,
                                                                            severity: 'error',
                                                                            message: 'Error al procesar solicitud de regalo'
                                                                        });
                                                                    }
                                                                }}
                                                            >
                                                                <GiftIcon fontSize="small" />
                                                            </IconButton>
                                                            <IconButton
                                                                size="small"
                                                                color="warning"
                                                                title="Cancelar Producto"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    try {
                                                                        debug(`❌ Void button clicked for order: ${order?.uid}`);
                                                                        requestAdminPin('void', order);
                                                                    } catch (error) {
                                                                        debug('❌ Error in void button click:', error);
                                                                        console.error('Void button click error:', error);
                                                                        setSnackbar({
                                                                            open: true,
                                                                            severity: 'error',
                                                                            message: 'Error al procesar solicitud de anulación'
                                                                        });
                                                                    }
                                                                }}
                                                            >
                                                                <CancelIcon fontSize="small" />
                                                            </IconButton>
                                                        </>
                                                    )}
                                                </Box>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            ))}
                        </List>
                    </Box>

                    {/* Cart Summary - pinned at bottom of cart panel (desktop only) */}
                    {!isMobile && (
                        <Paper sx={{
                            p: 2,
                            mt: 1,
                            bgcolor: 'background.paper',
                            flexShrink: 0,
                            borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                            position: 'sticky',
                            bottom: 0,
                            zIndex: 10,
                            boxShadow: '0 -2px 8px rgba(0,0,0,0.1)'
                        }} elevation={2}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1rem' } }}>Total del Pedido</Typography>
                                <Typography variant="h4" color="primary.main" fontWeight="bold" sx={{ fontSize: { xs: '1.6rem', sm: '1.4rem' } }}>
                                    {formatMXN(displayTotal)}
                                </Typography>
                            </Box>

                            {/* Simplified interface with only 2 buttons */}
                            <Box display="flex" gap={1}>
                                <Button
                                    variant="contained"
                                    startIcon={<CookIcon />}
                                    onClick={handleSendToKitchen}
                                    fullWidth
                                    disabled={orders.length === 0}
                                    size="large"
                                    sx={{
                                        minHeight: '48px',
                                        fontSize: { xs: '0.9rem', sm: '1.1rem' },
                                        fontWeight: 600,
                                        bgcolor: 'success.main',
                                        '&:hover': { bgcolor: 'success.dark' }
                                    }}
                                >
                                    {LABEL_SUBMIT}
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<MoreIcon />}
                                    onClick={openActionsModal}
                                    fullWidth
                                    size="large"
                                    sx={{
                                        minHeight: '48px',
                                        fontSize: { xs: '0.9rem', sm: '1.1rem' },
                                        fontWeight: 600
                                    }}
                                >
                                    + Acciones
                                </Button>
                            </Box>
                        </Paper>
                    )}
                </>
            )}
        </Paper>
    );

    // If neither ticket nor tableId is provided, nothing to render
    if (!ticket && !tableId) {
        return null;
    }

    const handleSnackbarClose = () => setSnackbar(prev => ({ ...prev, open: false }));

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            bgcolor: 'background.default'
        }}>
            {/* Enhanced Mobile Header with Status Indicators */}
            <AppBar position="sticky" elevation={4} sx={{
                background: theme => `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
                borderBottom: theme => `2px solid ${theme.palette.primary.light}`,
            }}>
                <Toolbar sx={{
                    minHeight: { xs: 80, sm: 88 }, // Increased height for better layout
                    pt: 'env(safe-area-inset-top, 0px)',
                    px: { xs: 1.5, sm: 2.5 },
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    gap: 1
                }}>
                    {/* Top row: Back button, Mesa info, Status indicators, Actions */}
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <IconButton
                                edge="start"
                                color="inherit"
                                onClick={handleBack}
                                sx={{
                                    mr: 2,
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
                                }}
                            >
                                <BackIcon />
                            </IconButton>

                            <Box>
                                <Typography variant="h5" noWrap sx={{
                                    color: 'common.white',
                                    fontWeight: 'bold',
                                    fontSize: { xs: '1.3rem', sm: '1.5rem' }
                                }}>
                                    Mesa {tableId}
                                </Typography>
                                {/* Enhanced Status indicators with better contrast */}
                                <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                                    <Tooltip title={`Terminal ${terminalStatus === 'connected' ? 'Conectado' : 'Desconectado'}: ${terminalService.getTerminalId() || 'Sin ID'}`}>
                                        <Chip
                                            icon={terminalStatus === 'connected' ? <TerminalIcon /> : <PendingIcon />}
                                            label={`Terminal: ${terminalService.getTerminalId()?.slice(-6) || 'N/A'}`}
                                            size="small"
                                            sx={{
                                                backgroundColor: (theme) => terminalStatus === 'connected'
                                                    ? theme.palette.mode === 'dark'
                                                        ? 'rgba(76, 175, 80, 0.3)'  // Green in dark theme
                                                        : 'rgba(27, 94, 32, 0.8)'   // Darker green in light theme
                                                    : theme.palette.mode === 'dark'
                                                        ? 'rgba(255, 152, 0, 0.3)'  // Orange in dark theme
                                                        : 'rgba(230, 81, 0, 0.8)',  // Darker orange in light theme
                                                color: (theme) => theme.palette.mode === 'dark'
                                                    ? 'rgba(255, 255, 255, 0.95)'
                                                    : 'rgba(255, 255, 255, 1)',
                                                border: (theme) => `1px solid ${terminalStatus === 'connected'
                                                    ? theme.palette.success.main
                                                    : theme.palette.warning.main}`,
                                                fontSize: { xs: '0.65rem', sm: '0.7rem' },
                                                height: { xs: '22px', sm: '24px' },
                                                fontWeight: 700,
                                                '& .MuiChip-icon': {
                                                    fontSize: { xs: '0.8rem', sm: '0.9rem' },
                                                    color: (theme) => terminalStatus === 'connected'
                                                        ? theme.palette.success.main
                                                        : theme.palette.warning.main
                                                }
                                            }}
                                        />
                                    </Tooltip>

                                    <Tooltip title={`Conexión ${connectionStatus === 'connected' ? 'Activa' : connectionStatus === 'checking' ? 'Verificando' : 'Sin Conexión'}`}>
                                        <Chip
                                            icon={connectionStatus === 'connected' ? <ConnectedIcon /> :
                                                connectionStatus === 'checking' ? <PendingIcon /> : <DisconnectedIcon />}
                                            label={connectionStatus === 'connected' ? 'Conectado' :
                                                connectionStatus === 'checking' ? 'Verificando' : 'Sin Conexión'}
                                            size="small"
                                            sx={{
                                                backgroundColor: (theme) => connectionStatus === 'connected'
                                                    ? theme.palette.mode === 'dark'
                                                        ? 'rgba(33, 150, 243, 0.3)'  // Blue in dark theme
                                                        : 'rgba(13, 71, 161, 0.8)'   // Darker blue in light theme
                                                    : connectionStatus === 'checking'
                                                        ? theme.palette.mode === 'dark'
                                                            ? 'rgba(255, 193, 7, 0.3)'  // Yellow in dark theme
                                                            : 'rgba(245, 127, 23, 0.8)' // Darker yellow in light theme
                                                        : theme.palette.mode === 'dark'
                                                            ? 'rgba(244, 67, 54, 0.3)'  // Red in dark theme
                                                            : 'rgba(183, 28, 28, 0.8)', // Darker red in light theme
                                                color: (theme) => theme.palette.mode === 'dark'
                                                    ? 'rgba(255, 255, 255, 0.95)'
                                                    : 'rgba(255, 255, 255, 1)',
                                                border: (theme) => `1px solid ${connectionStatus === 'connected'
                                                    ? theme.palette.info.main
                                                    : connectionStatus === 'checking'
                                                        ? theme.palette.warning.main
                                                        : theme.palette.error.main
                                                    }`,
                                                fontSize: { xs: '0.65rem', sm: '0.7rem' },
                                                height: { xs: '22px', sm: '24px' },
                                                fontWeight: 700,
                                                '& .MuiChip-icon': {
                                                    fontSize: { xs: '0.8rem', sm: '0.9rem' },
                                                    color: (theme) => connectionStatus === 'connected'
                                                        ? theme.palette.info.main
                                                        : connectionStatus === 'checking'
                                                            ? theme.palette.warning.main
                                                            : theme.palette.error.main
                                                }
                                            }}
                                        />
                                    </Tooltip>
                                </Stack>
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Tooltip title="Cambiar tema">
                                <IconButton
                                    color="inherit"
                                    onClick={toggleTheme}
                                    sx={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
                                    }}
                                >
                                    <ThemeIcon />
                                </IconButton>
                            </Tooltip>

                            <Tooltip title={`Ver carrito (${orderCount} productos)`}>
                                <IconButton
                                    color="inherit"
                                    onClick={() => setActiveTab(1)}
                                    sx={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
                                    }}
                                >
                                    <Badge badgeContent={orderCount} color="error">
                                        <ReceiptIcon />
                                    </Badge>
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>

                    {/* Bottom row: Ticket info and date/time */}
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: 1,
                        px: 1.5,
                        py: 0.5
                    }}>
                        <Typography variant="body2" sx={{
                            color: 'common.white',
                            fontWeight: 600,
                            fontSize: { xs: '0.8rem', sm: '0.875rem' }
                        }}>
                            {isNew ? 'Nuevo Ticket' : (ticket?.number ? `Ticket #${ticket.number}` : (ticket?.id ? `Ticket #${ticket.id}` : 'Ticket Pendiente'))}
                        </Typography>

                        <Typography variant="body2" sx={{
                            color: 'rgba(255, 255, 255, 0.9)',
                            fontWeight: 500,
                            fontSize: { xs: '0.75rem', sm: '0.8rem' }
                        }}>
                            {new Date().toLocaleDateString('es-MX', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                            })} • {new Date().toLocaleTimeString('es-MX', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </Typography>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Content Area: restaurant style layout - CORREGIDO para botones fijos */}
            {!terminalReady ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Box sx={{
                    flex: 1,
                    overflow: 'hidden',
                    p: { xs: 0, sm: 1 },
                    // ZONA SEGURA CRÍTICA: Padding bottom en mobile para espacio de botones fijos
                    pb: isMobile ? 'calc(100px + env(safe-area-inset-bottom, 0px))' : { xs: 0, sm: 1 }
                }}>
                    {isMobile ? (
                        // Mobile: two separate screens (Menu or Carrito), selected via state or Acciones menu
                        activeTab === 1 ? (
                            <MobileCart />
                        ) : (
                            <Box sx={{ height: '100%', display: 'flex', p: 1 }}>
                                <Paper sx={{ p: 1, display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                                    <CategoryBar />
                                    <Box sx={{ mt: 1, flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }} ref={productsBoxRef}>
                                        <ProductGrid />
                                    </Box>
                                </Paper>
                            </Box>
                        )
                    ) : (
                        // md+ : two panels side-by-side
                        <Grid container spacing={2} sx={{ height: '100%', alignItems: 'stretch' }}>
                            {/* Right panel (products) */}
                            <Grid item xs={12} md={7} order={{ xs: 1, md: 2 }} sx={{ display: 'flex' }}>
                                <Paper sx={{ p: 1, display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                                    <CategoryBar />
                                    <Box sx={{ mt: 1, flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }} ref={productsBoxRef}>
                                        <ProductGrid />
                                    </Box>
                                </Paper>
                            </Grid>
                            {/* Left panel (cart) */}
                            <Grid item xs={12} md={5} order={{ xs: 2, md: 1 }} sx={{ display: 'flex' }}>
                                <MobileCart />
                            </Grid>
                        </Grid>
                    )}
                </Box>
            )}

            {/* Sticky Bottom Action Bar + Actions Menu (mobile only) - MEJORADO */}
            {isMobile && (
                <>
                    <Paper elevation={8} sx={{
                        position: 'fixed', // CORREGIDO: Cambiado de sticky a fixed para mejor control
                        bottom: 0,
                        left: 0,
                        right: 0,
                        zIndex: 1000, // CORREGIDO: z-index alto para garantizar visibilidad
                        borderRadius: 0,
                        backdropFilter: 'blur(15px)',
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.95)', // Mejor contraste
                        borderTop: `2px solid ${theme.palette.primary.main}`, // Borde superior para visibilidad
                        px: { xs: 1, sm: 2 },
                        pt: 1.5, // CORREGIDO: Más padding top
                        pb: 'calc(12px + env(safe-area-inset-bottom, 0px))' // CORREGIDO: Más padding bottom
                    }}>
                        <Grid container spacing={1.5} alignItems="center"> {/* CORREGIDO: Más espacio entre botones */}
                            <Grid item xs={6}>
                                <Button
                                    variant="contained"
                                    startIcon={<CookIcon />}
                                    onClick={handleSendToKitchen}
                                    fullWidth
                                    disabled={orders.length === 0}
                                    color="success"
                                    size="large"
                                    sx={{
                                        fontSize: { xs: '0.9rem', sm: '1rem' }, // CORREGIDO: Texto más legible
                                        fontWeight: 700, // CORREGIDO: Más bold para visibilidad
                                        minHeight: { xs: '50px', sm: '52px' }, // CORREGIDO: Botones más altos
                                        borderRadius: 2, // CORREGIDO: Bordes redondeados
                                        boxShadow: 3 // CORREGIDO: Sombra para visibilidad
                                    }}
                                >
                                    {LABEL_SUBMIT}
                                </Button>
                            </Grid>
                            <Grid item xs={6}>
                                <Button
                                    variant="outlined"
                                    startIcon={<MoreIcon />}
                                    onClick={openActionsModal}
                                    fullWidth
                                    size="large"
                                    sx={{
                                        fontSize: { xs: '0.9rem', sm: '1rem' }, // CORREGIDO: Texto más legible
                                        fontWeight: 700, // CORREGIDO: Más bold para visibilidad
                                        minHeight: { xs: '50px', sm: '52px' }, // CORREGIDO: Botones más altos
                                        borderRadius: 2, // CORREGIDO: Bordes redondeados
                                        borderWidth: 2, // CORREGIDO: Borde más grueso
                                        '&:hover': { borderWidth: 2 } // Mantener borde grueso en hover
                                    }}
                                >
                                    + Acciones
                                </Button>
                            </Grid>
                        </Grid>
                    </Paper>

                </>
            )}
            {/* Actions Modal (modern centered design) */}
            <Dialog
                open={actionsModalOpen}
                onClose={closeActionsModal}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'background.paper',
                        boxShadow: theme.shadows[10],
                        m: 2
                    }
                }}
            >
                <Box sx={{
                    p: 3,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    color: 'white'
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                            <Typography variant="h6" fontWeight="bold">
                                Acciones del Ticket
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                                Mesa {tableId} • {orderCount} {orderCount === 1 ? 'producto' : 'productos'} • {formatMXN(displayTotal)}
                            </Typography>
                        </Box>
                        <IconButton
                            onClick={closeActionsModal}
                            sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </Box>

                <Box sx={{ p: 3 }}>
                    <Grid container spacing={2}>
                        {/* View Cart */}
                        <Grid item xs={12} sm={6}>
                            <Card
                                sx={{
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: theme.shadows[6]
                                    }
                                }}
                                onClick={handleViewOrders}
                            >
                                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                                    <ReceiptIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                                        Ver Carrito
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {orderCount} productos en el carrito
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Print Bill */}
                        <Grid item xs={12} sm={6}>
                            <Card
                                sx={{
                                    cursor: orders.length === 0 ? 'not-allowed' : 'pointer',
                                    opacity: orders.length === 0 ? 0.5 : 1,
                                    transition: 'all 0.2s',
                                    '&:hover': orders.length > 0 ? {
                                        transform: 'translateY(-2px)',
                                        boxShadow: theme.shadows[6]
                                    } : {}
                                }}
                                onClick={orders.length > 0 ? handlePrintFromModal : undefined}
                            >
                                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                                    <PrintIcon sx={{ fontSize: 32, color: 'info.main', mb: 1 }} />
                                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                                        {LABEL_PRINT_BILL}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Imprimir cuenta previa
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Process Payment */}
                        {canPay && (
                            <Grid item xs={12} sm={6}>
                                <Card
                                    sx={{
                                        cursor: orders.length === 0 ? 'not-allowed' : 'pointer',
                                        opacity: orders.length === 0 ? 0.5 : 1,
                                        transition: 'all 0.2s',
                                        background: orders.length > 0 ? `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)` : 'inherit',
                                        color: orders.length > 0 ? 'white' : 'inherit',
                                        '&:hover': orders.length > 0 ? {
                                            transform: 'translateY(-2px)',
                                            boxShadow: theme.shadows[8]
                                        } : {}
                                    }}
                                    onClick={orders.length > 0 ? handlePayFromModalNew : undefined}
                                >
                                    <CardContent sx={{ textAlign: 'center', p: 2 }}>
                                        <PaymentIcon sx={{ fontSize: 32, mb: 1 }} />
                                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                                            Cobrar Ticket
                                        </Typography>
                                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                            Procesar pago completo
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}

                        {/* Ticket Tags */}
                        <Grid item xs={12} sm={6}>
                            <Card
                                sx={{
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: theme.shadows[6]
                                    }
                                }}
                                onClick={handleTicketTags}
                            >
                                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                                    <LabelIcon sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
                                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                                        Etiquetas
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Configurar etiquetas
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Unlock Ticket (Admin only) */}
                        {isAdmin && ticketBlocked && (
                            <Grid item xs={12}>
                                <Card
                                    sx={{
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
                                        color: 'white',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: theme.shadows[8]
                                        }
                                    }}
                                    onClick={() => { requestAdminPin('unlock', null); closeActionsModal(); }}
                                >
                                    <CardContent sx={{ textAlign: 'center', p: 2 }}>
                                        <UnlockIcon sx={{ fontSize: 32, mb: 1 }} />
                                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                                            Desbloquear Cuenta
                                        </Typography>
                                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                            Reabrir ticket para modificaciones
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}
                    </Grid>
                </Box>
            </Dialog>
            {/* Product Details Modal */}
            <ProductDetailsModal
                open={productModalOpen}
                onClose={handleCloseModal}
                product={selectedProduct}
                onAddToOrder={handleAddToOrder}
                showOrderTags={true}
            />

            {/* DEBUG: Modal state logging */}
            {productModalOpen && console.log('🔄 [MODAL STATE] ProductDetailsModal is OPEN with product:', selectedProduct?.name)}
            {!productModalOpen && console.log('🔄 [MODAL STATE] ProductDetailsModal is CLOSED')}

            {/* Payment Dialog */}
            <PaymentDialog
                open={paymentDialogOpen}
                onClose={() => setPaymentDialogOpen(false)}
                ticket={ticket ? {
                    ...ticket,
                    totalAmount: totalAmount,
                    remainingAmount: totalAmount
                } : {
                    totalAmount: totalAmount,
                    remainingAmount: totalAmount
                }}
                terminalId={terminalService.getTerminalId?.() || ''}
                onPaymentSuccess={(paymentResult) => {
                    // Close dialog before any navigation to avoid setState on unmounted
                    if (isMountedRef.current) {
                        setPaymentDialogOpen(false);

                        // PaymentDialog has already processed the payment and closed the ticket if needed
                        // Just handle UI cleanup and navigation
                        debug('✅ Payment completed successfully:', paymentResult);

                        // Clear orders after successful payment
                        setOrders([]);

                        // Show success message
                        setSnackbar({
                            open: true,
                            severity: 'success',
                            message: paymentResult.ticketClosed
                                ? `Pago completado. Ticket cerrado.`
                                : `Pago de ${formatMXN(paymentResult.amount)} procesado correctamente.`
                        });

                        // Navigate back to tables
                        navigate('/tables');
                    }
                }}
                onError={(error) => alert('Error: ' + error.message)}
            />

            {/* NEW: Payment Processor Unificado */}
            <PaymentProcessor
                open={paymentProcessorOpen}
                onClose={() => setPaymentProcessorOpen(false)}
                ticketTotal={displayTotal}
                terminalId={terminalService.getTerminalId?.() || ''}
                onPaymentCompleted={handlePaymentProcessorCompleted}
            />

            {/* Snackbar feedback */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={2000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={handleSnackbarClose} severity={snackbar.severity} variant="filled" sx={{ width: '100%', fontSize: 16 }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            {/* Admin PIN Dialog */}
            <Dialog
                open={adminPinOpen}
                onClose={(event, reason) => {
                    // Prevent closing during validation
                    if (adminValidating && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
                        debug('?? Preventing dialog closure during validation');
                        return;
                    }
                    // Only allow explicit cancel button closure, not accidental backdrop clicks
                    if (reason === 'backdropClick' && adminPin) {
                        debug('?? Preventing accidental dialog closure - use Cancel button');
                        return;
                    }
                    debug('?? Admin PIN dialog closing via', reason);
                    setAdminPinOpen(false);
                    setAdminPin('');
                    setAdminReason('');
                    setAdminPinError('');
                    setAdminPinValidated(false);
                    setAdminAction(null);
                    setAdminTargetOrder(null);
                }}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Typography variant="h6" component="div">
                        Autorización de Administrador
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {adminAction === 'gift' ? 'Paso 1: confirma PIN para aplicar cortesía' : 'Paso 1: confirma PIN para anular'}
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    {/* Reason Selector (enabled after PIN) */}
                    <FormControl fullWidth sx={{ mb: 3 }} disabled={adminValidating || reasonsLoading || !adminPinValidated}>
                        <InputLabel>Razón de la acción</InputLabel>
                        <Select
                            value={adminReason}
                            onChange={(e) => setAdminReason(e.target.value)}
                            label="Razón de la acción"
                        >
                            {reasonsLoading ? (
                                <MenuItem disabled>
                                    <CircularProgress size={20} sx={{ mr: 1 }} />
                                    Cargando razones...
                                </MenuItem>
                            ) : availableReasons.length > 0 ? (
                                availableReasons.map((reason) => (
                                    <MenuItem key={reason.id} value={reason.reason}>
                                        <ListItemText
                                            primary={reason.reason}
                                            secondary={reason.commandName ? `Comando: ${reason.commandName}` : undefined}
                                        />
                                    </MenuItem>
                                ))
                            ) : (
                                <MenuItem disabled>No hay razones disponibles</MenuItem>
                            )}
                        </Select>
                    </FormControl>

                    {/* Paso 1: PIN */}
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" gutterBottom>
                            Ingrese PIN de administrador:
                        </Typography>
                        <TextField
                            fullWidth
                            type="password"
                            value={adminPin}
                            onChange={(e) => setAdminPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 6, style: { fontSize: 28, letterSpacing: '0.2em', textAlign: 'center' } }}
                            disabled={adminValidating || adminPinValidated}
                            error={!!adminPinError}
                            helperText={adminPinError || (adminPinValidated ? 'PIN validado' : '')}
                        />
                        <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '?'].map((key, idx) => (
                                <Button key={idx} variant="outlined" disabled={adminValidating || adminPinValidated}
                                    onClick={() => {
                                        if (key === 'C') { setAdminPin(''); setAdminPinError(''); return; }
                                        if (key === '?') { setAdminPin((p) => p.slice(0, -1)); return; }
                                        setAdminPin((p) => (p + String(key)).slice(0, 6));
                                    }} sx={{ py: 2, fontSize: 20 }}>
                                    {String(key)}
                                </Button>
                            ))}
                        </Box>
                        <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button onClick={() => { setAdminPin(''); setAdminPinError(''); }} disabled={adminValidating || adminPinValidated}>Limpiar</Button>
                            <Button
                                variant="contained"
                                onClick={async () => {
                                    try {
                                        setAdminPinError('');
                                        setAdminValidating(true);
                                        if (!adminPin || adminPin.length < 4) {
                                            setAdminPinError('PIN debe tener al menos 4 dígitos');
                                        } else {
                                            if (!adminPinValidated) { await userService.validatePin(adminPin); }
                                            setAdminPinValidated(true);
                                        }
                                    } catch (e) {
                                        setAdminPinValidated(false);
                                        setAdminPinError(e?.message || 'PIN inválido');
                                    } finally {
                                        setAdminValidating(false);
                                    }
                                }}
                                disabled={adminValidating || adminPinValidated}
                            >Confirmar PIN</Button>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            debug('?? Cancel button clicked - closing admin dialog');
                            setAdminPinOpen(false);
                            setAdminPin('');
                            setAdminReason('');
                            setAdminPinError('');
                            setAdminAction(null);
                            setAdminTargetOrder(null);
                        }}
                        disabled={adminValidating}
                        color="inherit"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleAdminPinConfirm}
                        disabled={adminValidating || !adminPinValidated || !adminReason.trim()}
                        variant="contained"
                        color={adminAction === 'gift' ? 'success' : 'error'}
                    >
                        {adminValidating ? 'Procesando…' : (adminAction === 'gift' ? 'Cambiar a cortesía' : 'Anular orden')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Order Tags Selector */}
            {orderTagsOpen && selectedOrderForTags && (
                <OrderTagSelector
                    terminalId={terminalService.getTerminalId()}
                    product={{
                        Id: selectedOrderForTags.productId || selectedOrderForTags.MenuItemId,
                        Name: selectedOrderForTags.name || selectedOrderForTags.MenuItemName || selectedOrderForTags.caption
                    }}
                    orderUid={selectedOrderForTags.uid}
                    open={orderTagsOpen}
                    onClose={() => {
                        setOrderTagsOpen(false);
                        setSelectedOrderForTags(null);
                    }}
                    onTagsSelected={handleOrderTagsApplied}
                />
            )}
        </Box>
    );
};

export default POSViewMobile;








