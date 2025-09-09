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
} from '@mui/material';
import {
    ArrowBackOutlined as BackIcon,
    ReceiptLongOutlined as ReceiptIcon,
    RestaurantMenuOutlined as MenuIcon,
    PaymentOutlined as PaymentIcon,
    SendOutlined as SendIcon,
    KitchenOutlined as KitchenIcon,
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
} from '@mui/icons-material';
import { formatMXN } from '../../utils/currencyFormatter';
import MobileMenu from '../Menu/MobileMenu';
import ProductDetailsModal from '../ProductDetailsModal';
import PaymentDialog from '../PaymentDialog';
// Replaced PinPad page with inline numeric input for admin PIN
import { useTheme as useCustomTheme } from '../../contexts/ThemeContext';
import menuService from '../../services/menuService';
import dataManager from '../../services/dataManager';
import { orderService } from '../../services/orderService';
import { ticketService } from '../../services/ticketService';
import { paymentService } from '../../services/paymentService';
import terminalService from '../../services/terminalService';
import { userService } from '../../services/userService';
import orderTagService from '../../services/orderTagService';
import adminService from '../../services/adminService';
import { createTerminalTicketAsync, changeEntityOfTerminalTicketAsync, executeAutomationCommandForTerminalTicketAsync, getAutomationCommandButtonsForTerminalTicketAsync, closeTerminalTicket as closeTerminalTicketInline, executePrintJobAsync, loadTerminalTicketWithOrders, getTicketById, getTerminalTicket as getTerminalTicketInline, fetchAutomationReasons, fetchAutomationCommands, ensureTicketForTable } from '../../queries';
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

// Helper function to determine order status from SambaPOS orderStates JSON
const determineOrderStatus = (orderStatesJson = '') => {
    // If no orderStates, assume it's new
    if (!orderStatesJson) {
        return 'NUEVO';
    }

    try {
        // Parse the JSON string to get states object
        const parsed = typeof orderStatesJson === 'string' ? JSON.parse(orderStatesJson) : orderStatesJson;

        // Handle the format {"S":"Submitted"} or similar
        if (parsed && typeof parsed === 'object') {
            const stateValues = Object.values(parsed);
            if (stateValues.length > 0) {
                const status = stateValues[0];
                // Map SambaPOS states to our display states
                switch (status?.toLowerCase()) {
                    case 'submitted': return 'ENVIADO';
                    case 'preparing': return 'PREPARANDO';
                    case 'ready': return 'LISTO';
                    case 'served': return 'SERVIDO';
                    case 'cancelled': return 'CANCELADO';
                    case 'void': return 'ANULADO';
                    case 'new': return 'NUEVO';
                    default: return status || 'NUEVO';
                }
            }
        }
    } catch (e) {
        debug('❌ Error parsing order states:', e);
    }

    return 'NUEVO';
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
    const [gridRows, setGridRows] = useState(4);
    const [ticketTotals, setTicketTotals] = useState({ totalAmount: 0, remainingAmount: 0 });
    const productsBoxRef = useRef(null);
    const [actionsAnchorEl, setActionsAnchorEl] = useState(null);
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
                        debug('🎯 Calling loadTerminalTicketWithOrders, terminalId:', tid, 'ticketId:', ticket.id);
                        await loadTerminalTicketWithOrders(tid, String(ticket.id));
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
                const ticketButtons = await getAutomationCommandButtonsForTerminalTicketAsync(terminalId);
                const orderButtons = orderUids.length ? await getAutomationCommandButtonsForTerminalTicketAsync(terminalId, [orderUids[0]]) : [];
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
                            status: determineOrderStatus(terminalTicket.orderStates)
                        }));

                        setOrders(convertedOrders);
                        debug(`✅ Loaded ${convertedOrders.length} orders from terminal ticket`);

                        // Check if ticket should be blocked (based on order states)
                        const ticketStatus = determineOrderStatus(terminalTicket.orderStates);
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
                                status: determineOrderStatus(order.OrderStates || order.orderStates)
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
                                const { fetchTicketDetails } = await import('../../queries');
                                const details = await fetchTicketDetails(String(ticket.id));
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
                                    status: determineOrderStatus(o.OrderStates || o.orderStates)
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
                        status: determineOrderStatus(order.OrderStates || order.orderStates)
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
        if (ticketBlocked && !isAdmin) {
            setSnackbar({ open: true, severity: 'warning', message: 'Cuenta solicitada: requiere autorización' });
            return;
        }
        debug('??? Product clicked:', product.name);
        setSelectedProduct(product);
        setProductModalOpen(true);
    }, [isWaiter, ticketBlocked]);

    const handleAddToOrder = useCallback(async (orderData) => {
        if (isWaiter && ticketBlocked) {
            setSnackbar({ open: true, severity: 'warning', message: 'Cuenta bloqueada. No puede agregar productos.' });
            return;
        }
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
            isExisting: false,
            status: 'pending'
        };
        setOrders(prev => [...prev, newOrder]);
        if (isMobile) setActiveTab(1);

        try {
            // If blocked and admin, unlock ticket via automation before adding
            if (ticketBlocked && isAdmin) {
                try {
                    let terminalId = terminalService.getTerminalId();
                    if (!terminalId) {
                        const userName = authUser?.name || null;
                        terminalId = await terminalService.ensureTerminalRegistered(userName);
                    }
                    // Ensure ticket context on terminal
                    try {
                        if (terminalId && ticket?.id) {
                            await loadTerminalTicketWithOrders(terminalId, String(ticket.id));
                        } else if (terminalId && tableId) {
                            await changeEntityOfTerminalTicketAsync(terminalId, tableId);
                        }
                    } catch { }
                    // Execute unlock automation command (exact name from SambaPOS)
                    await executeAutomationCommandForTerminalTicketAsync(terminalId, (process.env.SAMBAPOS_UNLOCK_COMMAND || 'Desbloquear cuenta'), '');
                    setTicketBlocked(false);
                    try {
                        window.dispatchEvent(new CustomEvent('ticketUpdated', { detail: { source: 'unlock' } }));
                    } catch { }
                } catch (unlockErr) {
                    debug('?? Failed to unlock ticket before add (admin path):', unlockErr);
                }
            }
            // Ensure terminal + ticket (Discovery): create ticket only; bind mesa AFTER adding orders
            let terminalId = terminalService.getTerminalId();
            if (!terminalId) {
                const userName = authUser?.name || null;
                terminalId = await terminalService.ensureTerminalRegistered(userName);
            }
            try {
                if (terminalId && ticket?.id) {
                    await loadTerminalTicketWithOrders(terminalId, String(ticket.id));
                    terminalTicketOpenRef.current = true;
                } else if (terminalId) {
                    // Reuse terminal ticket if already open; otherwise create one
                    try {
                        const tt = await getTerminalTicketInline();
                        if (!tt) {
                            console.warn('⚠️ No terminal ticket available for order calculation');
                            return; // Skip calculation if no terminal ticket
                        }
                        if (tt) terminalTicketOpenRef.current = true;
                    } catch { }
                    if (!terminalTicketOpenRef.current) {
                        await createTerminalTicketAsync(terminalId);
                        terminalTicketOpenRef.current = true;
                    }
                }
            } catch (ctxErr) {
                debug('?? Could not prepare terminal ticket before add:', ctxErr);
            }

            // Add order now
            debug('🛒 Adding order to terminal:', { terminalId, name: newOrder.name, quantity: newOrder.quantity, portion: newOrder.portion });
            await orderService.addOrder(
                terminalId,
                newOrder.name,
                newOrder.quantity,
                newOrder.portion
            );
            debug('✅ Order added to terminal successfully');

            // Resolve uid (up to 5 retries × 200ms)
            const sleep = (ms) => new Promise(r => setTimeout(r, ms));
            let newUid = null;
            for (let attempt = 0; attempt < 5 && !newUid; attempt++) {
                let tt = null;
                try {
                    tt = await getTerminalTicketInline();
                    if (!tt) {
                        console.warn('⚠️ No terminal ticket available');
                    }
                } catch (e) {
                    console.warn('⚠️ Error getting terminal ticket:', e?.message);
                }
                const list = Array.isArray(tt?.orders) ? tt.orders : [];
                for (const o of list) {
                    if ((o?.name || '').toLowerCase() === (newOrder.name || '').toLowerCase()
                        && (o?.portion || 'Normal') === (newOrder.portion || 'Normal')
                        && o?.uid) {
                        newUid = o.uid;
                        break;
                    }
                }
                if (!newUid) await sleep(200);
            }

            // Bind mesa AFTER adding orders (Discovery step 4)
            try {
                if (!ticket?.id && tableId && boundTableRef.current !== tableId) {
                    await changeEntityOfTerminalTicketAsync(terminalId, (typeof tableName !== 'undefined' && tableName) ? tableName : String(tableId));
                    boundTableRef.current = tableId;
                }
            } catch (bindErr) {
                debug('?? Failed to bind mesa after add', bindErr);
            }

            // Apply free-text comment optionally (Discovery step 7)
            if (newUid && newOrder.comments && newOrder.comments.trim()) {
                try {
                    await executeAutomationCommandForTerminalTicketAsync(terminalId, ORDER_COMMENT_COMMAND, newOrder.comments.trim(), newUid);
                    debug('?? Comment applied on add for order', newUid);
                } catch (tagErr) {
                    debug('?? Failed to apply comment on add', tagErr);
                }
            }

            // Attach uid locally
            if (newUid) {
                setOrders(prev => prev.map(o => o.id === localId ? { ...o, uid: newUid } : o));
                debug('🔗 Order UID attached locally:', newUid);
            } else {
                debug('⚠️ No UID found for order after 5 retries');
            }

            debug('✅ handleAddToOrder completed successfully');

        } catch (error) {
            debug('? Error adding order (server):', error);
            console.error('Failed to add order:', error);

            // Remove optimistic order if server add failed
            setOrders(prev => prev.filter(o => o.id !== localId));
            debug('🗑️ Removed optimistic order due to server error');
        }
    }, [isMobile, authUser, ticket?.id, tableId]);

    const handleCloseModal = useCallback(() => {
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
                    status: determineOrderStatus(order.OrderStates || order.orderStates)
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
                        status: determineOrderStatus(order.OrderStates || order.orderStates)
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
            debug('🖥️ Fallback: trying getTerminalTicketInline');
            const tt = await getTerminalTicketInline();
            debug('🖥️ getTerminalTicketInline result:', tt);
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
                status: determineOrderStatus(order.OrderStates || order.orderStates)
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
                await loadTerminalTicketWithOrders(terminalId, String(ticket.id));
            } else if (terminalId && tableId) {
                // Do not create ticket here to avoid duplicates; binding happens during add
                // If there's already a terminal ticket bound, changeEntity will succeed; otherwise submit will create
                try { await changeEntityOfTerminalTicketAsync(terminalId, tableId); } catch (e) { /* ignore */ }
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
                        const btns = await getAutomationCommandButtonsForTerminalTicketAsync(terminalId, [o.uid]);
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
            debug(`?? Starting gift action for order: ${order?.uid}`);

            const terminalId = await ensureTerminalContext();
            debug(`?? Terminal context: ${terminalId}`);

            if (!terminalId) {
                debug('? No terminal ID available for gift command');
                throw new Error('No se pudo obtener terminal ID');
            }
            if (!order?.uid) {
                debug('? No order UID available for gift command');
                throw new Error('No se pudo identificar la orden');
            }

            debug(`?? Executing gift automation command for terminal ${terminalId}, order ${order.uid}`);
            try {
                await executeAutomationCommandForTerminalTicketAsync(terminalId, GIFT_COMMAND, reason || '', order.uid);
            } catch (e1) {
                // Fallback to common English name if localized name fails
                try { await executeAutomationCommandForTerminalTicketAsync(terminalId, 'Gift', reason || '', order.uid); }
                catch (e2) { throw e1; }
            }
            debug(`? Gift command executed successfully`);

            // Notify and refresh
            try {
                debug(`?? Dispatching ticketUpdated event`);
                window.dispatchEvent(new CustomEvent('ticketUpdated', { detail: { source: 'gift' } }));
            } catch { }

            debug(`🔄 Refreshing orders from server`);
            await paymentService.recalculateTicket(terminalId, true);
            await refreshOrdersFromServer();
            await refreshTicketTotals();
            debug(`✅ Orders refreshed successfully`);

            setSnackbar({ open: true, severity: 'success', message: 'Orden marcada como Regalo' });
        } catch (e) {
            debug('? Gift command failed:', e);
            console.error('Gift command error details:', e);
            setSnackbar({ open: true, severity: 'error', message: `No se pudo aplicar Regalo: ${e.message || e}` });
            throw e; // Re-throw to be caught by handleAdminPinConfirm
        }
    }, [ensureTerminalContext, refreshOrdersFromServer]);

    const handleVoidOrderCore = useCallback(async (order, reason = '') => {
        try {
            debug(`? Starting void action for order: ${order?.uid}`);

            const terminalId = await ensureTerminalContext();
            debug(`?? Terminal context: ${terminalId}`);

            if (!terminalId) {
                debug('? No terminal ID available for void command');
                throw new Error('No se pudo obtener terminal ID');
            }
            if (!order?.uid) {
                debug('? No order UID available for void command');
                throw new Error('No se pudo identificar la orden');
            }

            debug(`?? Executing void automation command for terminal ${terminalId}, order ${order.uid}`);
            try {
                await executeAutomationCommandForTerminalTicketAsync(terminalId, VOID_COMMAND, reason || '', order.uid);
            } catch (e1) {
                // Fallback to common English name if localized name fails
                try { await executeAutomationCommandForTerminalTicketAsync(terminalId, 'Void', reason || '', order.uid); }
                catch (e2) { throw e1; }
            }
            debug(`✅ Void command executed successfully`);

            // Dispatch ticket updated event
            debug(`📡 Dispatching ticketUpdated event`);
            window.dispatchEvent(new CustomEvent('ticketUpdated', { detail: { source: 'void' } }));

            debug(`🔄 Refreshing orders from server`);
            await paymentService.recalculateTicket(terminalId, true);
            await refreshOrdersFromServer();
            await refreshTicketTotals();
            debug(`✅ Orders refreshed successfully`);

            setSnackbar({ open: true, severity: 'success', message: 'Orden anulada' });
        } catch (e) {
            debug('? Void command failed:', e);
            console.error('Void command error details:', e);
            setSnackbar({ open: true, severity: 'error', message: `No se pudo Paso 1: confirma PIN para anular: ${e.message || e}` });
            throw e; // Re-throw to be caught by handleAdminPinConfirm
        }
    }, [ensureTerminalContext, refreshOrdersFromServer]);

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
        debug('?? Submitting to kitchen (automation command if available, fallback to close)');
        try {
            let terminalId = terminalService.getTerminalId();
            if (!terminalId) {
                const userName = authUser?.name || null;
                terminalId = await terminalService.ensureTerminalRegistered(userName);
            }
            // For new tickets (no ticket.id): do NOT re-create if already in session; create only if needed
            if (terminalId && !ticket?.id) {
                // Check if terminal ticket exists
                const tt = await getTerminalTicketInline();
                terminalTicketOpenRef.current = !!tt;
                if (!tt) {
                    console.warn('⚠️ No terminal ticket available for kitchen submission');
                }

                if (!terminalTicketOpenRef.current) {
                    await createTerminalTicketAsync(terminalId);
                    terminalTicketOpenRef.current = true;
                }

                // Ensure mesa is bound before closing (only once)
                if (tableId && boundTableRef.current !== tableId) {
                    await changeEntityOfTerminalTicketAsync(terminalId, tableId);
                    boundTableRef.current = tableId;
                }
            } else if (terminalId && ticket?.id) {
                await loadTerminalTicketWithOrders(terminalId, String(ticket.id));
            }
            if (!terminalId) {
                setSnackbar({ open: true, severity: 'error', message: 'No hay terminal registrada' });
                return;
            }
            // Try automation command first
            const submitCmdName = SUBMIT_CMD || 'Imprimir pedido';

            // Always use closeTerminalTicket - no fallbacks, no automation commands
            debug('🍳 Closing terminal ticket to submit orders');
            await closeTerminalTicketInline();
            debug('✅ Terminal ticket closed successfully');

            // Success - dispatch events and navigate with proper timing
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('ticketUpdated', { detail: { source: 'submit' } }));

                // Robust verification using direct SambaPOS GraphQL API with retries
                if (tableId) {
                    debug('� Verifying order persistence with SambaPOS API...');
                    const verifySuccess = await verifyOrderPersistence(tableId, ticket?.id);

                    if (verifySuccess) {
                        debug('✅ Order persistence verified successfully');
                    } else {
                        debug('⚠️ Order persistence verification failed - may need manual check');
                        setSnackbar({
                            open: true,
                            severity: 'warning',
                            message: 'Orden enviada pero verificación pendiente. Revise la mesa manualmente.'
                        });
                    }
                }

                // Refresh table data after verification
                if (typeof window.refreshData === 'function') {
                    debug('🔄 Refreshing tables data...');
                    await window.refreshData('tables');
                    debug('✅ Tables data refreshed');
                }
            }
            navigate('/tables', { replace: true });
        } catch (error) {
            debug('🚨 Error submitting to kitchen:', error);
            console.error('Kitchen submission failed:', error);
            setSnackbar({ open: true, severity: 'error', message: 'Error al enviar a cocina' });
        }
    }, [ensureTerminalContext]);

    // Robust order persistence verification using direct SambaPOS API
    const verifyOrderPersistence = useCallback(async (tableId, originalTicketId) => {
        debug('🔍 Starting order persistence verification for table:', tableId);

        const maxRetries = 6; // Up to 12 seconds of retries
        const retryDelays = [1000, 1500, 2000, 2500, 3000, 3500]; // Progressive delays

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                debug(`🔄 Verification attempt ${attempt}/${maxRetries}...`);

                // Wait before checking (progressive delays)
                if (attempt > 1) {
                    await new Promise(resolve => setTimeout(resolve, retryDelays[attempt - 2]));
                }

                // Get fresh table tickets directly from SambaPOS GraphQL API
                const { getTableTickets } = await import('../../queries');
                const tableTickets = await getTableTickets(tableId);
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

            // Ensure ticket context is open on this terminal before executing the command
            try {
                if (terminalId && ticket?.id) {
                    await loadTerminalTicketWithOrders(terminalId, String(ticket.id));
                    debug('?? Loaded ticket into terminal for print:', ticket.id);
                } else if (terminalId && tableId) {
                    await changeEntityOfTerminalTicketAsync(terminalId, (typeof tableName !== 'undefined' && tableName) ? tableName : String(tableId));
                    debug('?? Bound terminal to mesa for print:', tableId);
                }
            } catch (ctxErr) {
                debug('?? Could not prepare terminal ticket context before print:', ctxErr);
            }

            // Prefer Automation Command on the active terminal ticket if available
            if (terminalId) {
                try {
                    const printCmd = process.env.SAMBAPOS_PRINT_ACCOUNT_COMMAND || 'Imprimir factura';
                    await executeAutomationCommandForTerminalTicketAsync(terminalId, printCmd, '');
                    debug('?? Print bill via automation command');
                    // Notify tables to refresh immediately (should flip to Cuenta solicitada)
                    try {
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('ticketUpdated', { detail: { source: 'print-bill' } }));
                            if (typeof window.refreshData === 'function') {
                                window.refreshData('tables').catch(() => { });
                            }
                        }
                    } catch { }
                    // After printing, return to table map
                    // Mark as blocked in UI immediately
                    setTicketBlocked(true);
                    navigate('/tables', { replace: true });
                    return;
                } catch (cmdErr) {
                    debug('?? Print command failed, will try print job if ticketId present:', cmdErr);
                }
            }

            // Fallback: print job on last known ticket id (if provided in navigation state)
            if (ticket?.id) {
                await executePrintJobAsync({ name: PRINT_JOB, ticketId: ticket.id });
                debug('?? Print bill via print job for ticket', ticket.id);
                // Notify tables to refresh immediately
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('ticketUpdated', { detail: { source: 'print-job' } }));
                    if (typeof window.refreshData === 'function') {
                        await window.refreshData('tables');
                    }
                }

                // After printing, return to table map
                setTicketBlocked(true);
                navigate('/tables', { replace: true });
            } else {
                alert('No hay ticket para imprimir.');
            }
        } catch (e) {
            debug('? Print bill failed:', e);
            alert('Error al imprimir cuenta: ' + (e?.message || e));
        }
    }, [authUser, ticket]);

    const handlePayment = useCallback(async (paymentInfo) => {
        debug('💳 Processing payment using real GraphQL:', paymentInfo);

        try {
            // TODO: Implement payment using paymentService
            // Resolve terminal id (register if needed)
            let terminalId = terminalService.getTerminalId();
            if (!terminalId) {
                const userName = authUser?.name || null;
                terminalId = await terminalService.ensureTerminalRegistered(userName);
            }
            if (!terminalId) {
                setSnackbar({ open: true, severity: 'error', message: 'No hay terminal registrada' });
                return;
            }
            // Ensure ticket context is loaded on this terminal
            try {
                if (terminalId && ticket?.id) {
                    await loadTerminalTicketWithOrders(terminalId, String(ticket.id));
                } else if (terminalId && tableId) {
                    await changeEntityOfTerminalTicketAsync(terminalId, tableId);
                }
            } catch (ctxErr) {
                debug('?? Could not ensure ticket context before payment:', ctxErr);
            }

            const result = await paymentService.processPayment(
                terminalId,
                paymentInfo.paymentType,
                paymentInfo.amount
            );

            debug('? Payment processed:', result);

            // Clear orders after successful payment
            if (isMountedRef.current) setOrders([]);

            // Navigate back to tables
            navigate('/tables');

        } catch (error) {
            debug('? Payment failed:', error);
            console.error('Payment processing failed:', error);
        }
    }, [navigate]);

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
            if (terminalId && ticket?.id) {
                await loadTerminalTicketWithOrders(terminalId, String(ticket.id));
            } else if (terminalId && tableId) {
                await changeEntityOfTerminalTicketAsync(terminalId, (typeof tableName !== 'undefined' && tableName) ? tableName : String(tableId));
            }
            const unlockCmd = process.env.SAMBAPOS_UNLOCK_COMMAND || 'Desbloquear cuenta';
            await executeAutomationCommandForTerminalTicketAsync(terminalId, unlockCmd, reason || '');
            setTicketBlocked(false);
            await paymentService.recalculateTicket(terminalId, true);
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
                    await loadTerminalTicketWithOrders(terminalId, String(ticket.id));
                } else if (terminalId && tableId) {
                    await changeEntityOfTerminalTicketAsync(terminalId, (typeof tableName !== 'undefined' && tableName) ? tableName : String(tableId));
                }
            } catch (ctxErr) {
                debug('?? Could not ensure ticket context before opening payment dialog:', ctxErr);
            }
        } catch (e) {
            debug('? Error preparing payment dialog:', e);
        }

        setPaymentDialogOpen(true);
    }, [authUser, ticket, tableId]);

    // Bottom actions menu handlers
    const openActionsMenu = useCallback((e) => setActionsAnchorEl(e.currentTarget), []);
    const closeActionsMenu = useCallback(() => setActionsAnchorEl(null), []);
    const handleViewOrders = useCallback(() => { setActiveTab(1); closeActionsMenu(); }, [closeActionsMenu]);
    const handlePrintFromMenu = useCallback(async () => { try { await handlePrintBill(); } finally { closeActionsMenu(); } }, [handlePrintBill, closeActionsMenu]);
    const handlePayFromMenu = useCallback(async () => { try { await handleOpenPaymentDialog(); } finally { closeActionsMenu(); } }, [handleOpenPaymentDialog, closeActionsMenu]);
    const handleTicketTags = useCallback(() => { closeActionsMenu(); setSnackbar({ open: true, severity: 'info', message: 'Etiquetas del ticket: próximamente' }); }, [closeActionsMenu]);



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

    // Mobile cart component
    const MobileCart = () => (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 1 }}>
            {orders.length === 0 ? (
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 200,
                    textAlign: 'center'
                }}>
                    <ReceiptIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        Carrito vacío
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Selecciona productos del menú para empezar
                    </Typography>
                    <Button
                        variant="outlined"
                        onClick={() => setActiveTab(0)}
                        sx={{ mt: 2 }}
                    >
                        Ver Menú
                    </Button>
                </Box>
            ) : (
                <>
                    {/* Scrollable orders list */}
                    <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
                        <List sx={{ pb: 0 }}>
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
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleQuantityChange(order.id, -1)}
                                                        disabled={order.isExisting || order.quantity <= 1}
                                                        color="primary"
                                                    >
                                                        <RemoveIcon fontSize="small" />
                                                    </IconButton>
                                                    <Typography variant="body1" sx={{ minWidth: 24, textAlign: 'center' }}>
                                                        {order.quantity}
                                                    </Typography>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleQuantityChange(order.id, 1)}
                                                        disabled={order.isExisting}
                                                        color="primary"
                                                    >
                                                        <AddIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleRemoveOrder(order.id)}
                                                        color="error"
                                                        disabled={order.isExisting}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Box>

                                                {order.isExisting && order.status === 'sent' && (
                                                    <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                                                        <IconButton
                                                            size="small"
                                                            color="success"
                                                            title="Regalo"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                try {
                                                                    debug(`?? Gift button clicked for order: ${order?.uid}`);
                                                                    requestAdminPin('gift', order);
                                                                } catch (error) {
                                                                    debug('? Error in gift button click:', error);
                                                                    console.error('Gift button click error:', error);
                                                                    setSnackbar({
                                                                        open: true,
                                                                        severity: 'error',
                                                                        message: 'Error al procesar solicitud de regalo'
                                                                    });
                                                                }
                                                            }}
                                                            disabled={false} // Allow Gift/Void buttons in sent orders (admin PIN protects)
                                                        >
                                                            <GiftIcon fontSize="small" />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            color="warning"
                                                            title="Anular"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                try {
                                                                    debug(`? Void button clicked for order: ${order?.uid}`);
                                                                    requestAdminPin('void', order);
                                                                } catch (error) {
                                                                    debug('? Error in void button click:', error);
                                                                    console.error('Void button click error:', error);
                                                                    setSnackbar({
                                                                        open: true,

                                                                        severity: 'error',
                                                                        message: 'Error al procesar solicitud de anulación'
                                                                    });
                                                                }
                                                            }}
                                                            disabled={false} // Allow Gift/Void buttons in sent orders (admin PIN protects)
                                                        >
                                                            <CancelIcon fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            ))}
                        </List>
                    </Box>

                    {/* Cart Summary - pinned at bottom of cart panel (desktop only) */}
                    {!isMobile && (
                        <Paper sx={{ p: 2, mt: 1, bgcolor: 'background.paper', flexShrink: 0, borderTop: (theme) => `1px solid ${theme.palette.divider}` }} elevation={2}>
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
                                    startIcon={<KitchenIcon />}
                                    onClick={handleSendToKitchen}
                                    fullWidth
                                    disabled={orders.length === 0}
                                    size="large"
                                    sx={{
                                        minHeight: '48px',
                                        fontSize: '1.1rem',
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
                                    onClick={openActionsMenu}
                                    fullWidth
                                    size="large"
                                    sx={{
                                        minHeight: '48px',
                                        fontSize: '1.1rem',
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
        </Box>
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
            {/* Mobile Header */}
            <AppBar position="sticky" elevation={1}>
                <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, pt: 'env(safe-area-inset-top, 0px)', px: { xs: 1, sm: 2 }, display: 'flex', flexWrap: { xs: 'wrap', sm: 'nowrap' }, gap: 1 }}>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={handleBack}
                        sx={{ mr: 2 }}
                    >
                        <BackIcon />
                    </IconButton>

                    <Box flex={1}>
                        <Typography variant="h6" noWrap sx={{ color: 'common.white' }}>
                            Mesa {tableId}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.9, color: 'common.white' }}>
                            {isNew ? 'Nuevo Ticket' : (ticket?.number ? `Ticket #${ticket.number}` : (ticket?.id ? `Ticket #${ticket.id}` : ''))}
                        </Typography>
                    </Box>

                    <IconButton
                        color="inherit"
                        onClick={toggleTheme}
                        sx={{ mr: 1 }}
                    >
                        <ThemeIcon />
                    </IconButton>

                    <IconButton
                        color="inherit"
                        onClick={() => setActiveTab(1)}
                    >
                        <Badge badgeContent={orderCount} color="error">
                            <ReceiptIcon />
                        </Badge>
                    </IconButton>
                </Toolbar>
            </AppBar>

            {/* Content Area: restaurant style layout */}
            {!terminalReady ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Box sx={{ flex: 1, overflow: 'hidden', p: 1 }}>
                    {isMobile ? (
                        // Mobile: two separate screens (Menu or Carrito), selected via state or Acciones menu
                        activeTab === 1 ? (
                            <Box sx={{ height: '100%', display: 'flex' }}>
                                <MobileCart />
                            </Box>
                        ) : (
                            <Box sx={{ height: '100%', display: 'flex' }}>
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

            {/* Sticky Bottom Action Bar + Actions Menu (mobile only) */}
            {isMobile && (
                <>
                    <Paper elevation={6} sx={{
                        position: 'sticky',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        borderRadius: 0,
                        backdropFilter: 'blur(10px)',
                        bgcolor: 'rgba(255,255,255,0.8)',
                        px: { xs: 1, sm: 2 },
                        pt: 1,
                        pb: 'calc(8px + env(safe-area-inset-bottom, 0px))'
                    }}>
                        <Grid container spacing={1} alignItems="center">
                            <Grid item xs={6}>
                                <Button
                                    variant="contained"
                                    startIcon={<KitchenIcon />}
                                    onClick={handleSendToKitchen}
                                    fullWidth
                                    disabled={orders.length === 0}
                                    color="success"
                                    size="large"
                                >
                                    {LABEL_SUBMIT}
                                </Button>
                            </Grid>
                            <Grid item xs={6}>
                                <Button
                                    variant="outlined"
                                    startIcon={<MoreIcon />}
                                    onClick={openActionsMenu}
                                    fullWidth
                                    size="large"
                                >
                                    Acciones
                                </Button>
                            </Grid>
                        </Grid>
                    </Paper>

                </>
            )}
            {/* Actions Menu (shared for mobile/desktop) */}
            {/** Ensure anchor element is still in the DOM to avoid MUI warning */}
            <Menu
                anchorEl={(actionsAnchorEl && document.body && document.body.contains(actionsAnchorEl)) ? actionsAnchorEl : null}
                open={Boolean(actionsAnchorEl && document.body && document.body.contains(actionsAnchorEl))}
                onClose={closeActionsMenu}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                {isAdmin && ticketBlocked && (
                    <MenuItem onClick={() => { requestAdminPin('unlock', null); }}>
                        <UnlockIcon fontSize="small" style={{ marginRight: 8 }} /> Desbloquear cuenta
                    </MenuItem>
                )}
                <MenuItem onClick={handleViewOrders}>
                    <ReceiptIcon fontSize="small" style={{ marginRight: 8 }} /> Carrito ({orderCount}) • {formatMXN(displayTotal)}
                </MenuItem>
                <MenuItem onClick={handlePrintFromMenu} disabled={orders.length === 0}>
                    <PrintIcon fontSize="small" style={{ marginRight: 8 }} /> {LABEL_PRINT_BILL}
                </MenuItem>
                {canPay && (
                    <MenuItem onClick={handlePayFromMenu} disabled={orders.length === 0}>
                        <PaymentIcon fontSize="small" style={{ marginRight: 8 }} /> Cobrar ticket
                    </MenuItem>
                )}
                <MenuItem onClick={handleTicketTags}>
                    <LabelIcon fontSize="small" style={{ marginRight: 8 }} /> Etiquetas del ticket
                </MenuItem>
            </Menu>
            {/* Product Details Modal */}
            <ProductDetailsModal
                open={productModalOpen}
                onClose={handleCloseModal}
                product={selectedProduct}
                onAddToOrder={handleAddToOrder}
                showOrderTags={true}
            />

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
                onPaymentSuccess={(ticketAfterPay, paymentPayload) => {
                    // Close dialog before any navigation to avoid setState on unmounted
                    setPaymentDialogOpen(false);
                    handlePayment(paymentPayload);
                }}
                onError={(error) => alert('Error: ' + error.message)}
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
        </Box>
    );
};

export default POSViewMobile;








