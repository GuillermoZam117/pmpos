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
    AddCircleOutline as AddIcon,
    RemoveCircleOutline as RemoveIcon,
    DeleteOutline as DeleteIcon,
    CancelOutlined as CancelIcon,
    CardGiftcardOutlined as GiftIcon,
    Brightness4Outlined as ThemeIcon,
    ExpandMoreOutlined as ExpandIcon,
    ExpandLessOutlined as CollapseIcon,
} from '@mui/icons-material';
import { formatMXN } from '../../utils/currencyFormatter';
import MobileMenu from '../Menu/MobileMenu';
import ProductDetailsModal from '../ProductDetailsModal';
import PaymentDialog from '../PaymentDialog';
import PinPad from '../PinPad';
import { useTheme as useCustomTheme } from '../../contexts/ThemeContext';
import menuService from '../../services/menuService';
import dataManager from '../../services/dataManager';
import { orderService } from '../../services/orderService';
import { ticketService } from '../../services/ticketService';
import { paymentService } from '../../services/paymentService';
import terminalService from '../../services/terminalService';
import { userService } from '../../services/userService';
import { createTerminalTicketAsync, changeEntityOfTerminalTicketAsync, executeAutomationCommandForTerminalTicketAsync, getAutomationCommandButtonsForTerminalTicketAsync, closeTerminalTicket as closeTerminalTicketInline, executePrintJobAsync, loadTerminalTicketWithOrders, getTicketById, getTerminalTicket as getTerminalTicketInline, fetchAutomationReasons, fetchAutomationCommands } from '../../queries';
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
    const userRole = (typeof window !== 'undefined' ? localStorage.getItem('pmpos_user_role') : null) || process.env.SAMBAPOS_USER_ROLE || 'Mesero';
    const canPay = ['Admin', 'Cajero', 'Cashier'].includes(userRole);
    const isAdmin = ['Admin', 'Cajero', 'Cashier'].includes(userRole);
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
    const [adminPinError, setAdminPinError] = useState('');
    const [adminReason, setAdminReason] = useState('');
    const [availableReasons, setAvailableReasons] = useState([]);
    const [reasonsLoading, setReasonsLoading] = useState(false);
    const [allowedOrderCmds, setAllowedOrderCmds] = useState({}); // { [uid]: Set([...names]) }
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [terminalReady, setTerminalReady] = useState(false);
    const [page, setPage] = useState(0);
    const [gridRows, setGridRows] = useState(4);
    const productsBoxRef = useRef(null);

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
                debug('📱 Menu loading already in progress, skipping...');
                return;
            }

            debug('📱 Starting optimized menu load...');
            debug('📱 Current Redux menu state:', menu);

            // Step 1: Check if menu is already loaded in Redux (from App initialization)
            if (menu && menu.categories && menu.categories.length > 0) {
                debug('📱 ✅ Menu already available in Redux from startup, using cached data');
                if (!alive) return;
                setMenuLoading(false);
                menuLoadedRef.current = true;
                return;
            }

            // Step 2: Try DataManager cache (faster than network)
            const cachedMenu = dataManager.getCachedMenu();
            if (cachedMenu && cachedMenu.categories && cachedMenu.categories.length > 0) {
                debug('📱 ✅ Menu available in DataManager cache, dispatching to Redux');
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
                debug('📱 No cached menu available, loading from network...');

                // Use DataManager for optimized loading (includes caching)
                const menuData = await dataManager.refreshData('menu');

                if (!menuData || !menuData.categories || menuData.categories.length === 0) {
                    throw new Error('Invalid menu data structure from server');
                }

                debug('📱 ✅ Menu loaded from network via DataManager:', menuData);
                if (!alive) return;
                dispatch({ type: 'SET_MENU', menu: menuData });
                menuLoadedRef.current = true;

            } catch (error) {
                debug('❌ Failed to load menu:', error);
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

        debug('📱 Menu loading effect triggered');

        // Only load if we don't have a menu or if the loading failed previously
        if (!menu || (menu && (!menu.categories || menu.categories.length === 0))) {
            loadMenu();
        } else {
            debug('📱 Menu already exists and is valid:', menu);
            if (alive) {
                setMenuLoading(false);
                menuLoadedRef.current = true;
            }
        }
        return () => { alive = false; };
    }, []); // Remove dependencies to prevent loops - only run on mount

    // Ensure terminal ticket is loaded for occupied tables and restore cart from session
    useEffect(() => {
        let cancelled = false;
        const prepare = async () => {
            try {
                const terminalId = terminalService.getTerminalId();
                // Restore pending/local cart from session
                if (typeof window !== 'undefined') {
                    const key = `pmpos_cart_${terminalId || 'NA'}_${tableId || 'NA'}`;
                    const raw = sessionStorage.getItem(key);
                    if (raw) {
                        try {
                            const localPending = JSON.parse(raw) || [];
                            if (!cancelled && Array.isArray(localPending) && localPending.length) {
                                setOrders(prev => {
                                    // merge: keep existing server orders, append pending without uid
                                    const pending = localPending.filter(o => !o.isExisting);
                                    return [...prev, ...pending];
                                });
                            }
                        } catch {}
                    }
                }
                if (ticket?.id) {
                    // Load ticket into terminal context and fetch details once
                    let tid = terminalId;
                    if (!tid) {
                        const userName = authUser?.name || null;
                        tid = await terminalService.ensureTerminalRegistered(userName);
                    }
                    if (tid) {
                        try { await loadTerminalTicketWithOrders(tid, String(ticket.id)); } catch {}
                        if (!cancelled) setTerminalReady(true);
                    } else {
                        if (!cancelled) setTerminalReady(true);
                    }
                } else {
                    if (!cancelled) setTerminalReady(true);
                }
            } catch {
                if (!cancelled) setTerminalReady(true);
            }
        };
        prepare();
        return () => { cancelled = true; };
    }, [ticket?.id, tableId, authUser]);

    // When terminal is ready, fetch server orders once (occupied tables)
    useEffect(() => {
        if (terminalReady) {
            refreshOrdersFromServer();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [terminalReady]);

    // Reset pagination on category change
    useEffect(() => { setPage(0); }, [selectedCategory]);

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
                debug('🔘 Ticket buttons:', ticketButtons);
                debug('🔘 Order buttons (first order):', orderButtons);
                console.table(ticketButtons);
                console.table(orderButtons);
            } catch (e) {
                debug('⚠️ Failed to fetch automation buttons:', e);
            }
        };
        debugCommands();
    }, [orders, tableId]);

    // Load existing ticket data for occupied tables (prefer read-service details to derive blocked status)
    useEffect(() => {
        let alive = true;
        const loadExistingTicket = async () => {
            if (!isNew && tableId && !ticket) {
                debug('🎫 Loading existing ticket for table:', tableId);

                try {
                    // Try to get existing ticket using GraphQL
                    const existingTicketData = await ticketService.getTicketByTable(tableId);

                    if (existingTicketData?.ticket) {
                        debug('✅ Found existing ticket:', existingTicketData.ticket);
                        // Prefer SQL details for speed and correctness
                        try {
                            const { fetchTicketDetails } = await import('../../queries');
                            const details = await fetchTicketDetails(String(existingTicketData.ticket.id));
                            const header = details?.header || {};
                            const ordersList = Array.isArray(details?.orders) ? details.orders : [];
                            // Derive blocked
                            const paymentStatus = (header.PaymentStatus || '').toUpperCase();
                            const statesStr = header.TicketStates || '';
                            const isBlocked = paymentStatus === 'BLOCKED' || (typeof statesStr === 'string' && statesStr.includes('Bloqueado'));
                            if (alive) setTicketBlocked(!!isBlocked);
                            // Map orders
                            const convertedOrders = ordersList.map(o => ({
                                id: o.OrderId || o.uid || Date.now() + Math.random(),
                                uid: o.OrderId || o.uid || null,
                                productId: o.MenuItemId || o.productId,
                                name: o.MenuItemName || o.name || o.caption || resolveProductName(o.MenuItemId || o.productId) || 'Producto',
                                caption: o.caption || o.name || o.MenuItemName,
                                quantity: o.Quantity || o.quantity,
                                price: o.Price || o.price,
                                portion: o.PortionName || o.portion || 'Normal',
                                orderTags: (() => {
                                    const raw = o.OrderTags || o.orderTags || '';
                                    if (!raw) return [];
                                    try {
                                        const js = typeof raw === 'string' ? JSON.parse(raw) : raw;
                                        if (Array.isArray(js)) return js.map(t => t.tagName ? `${t.tagName}:${t.tag}` : (t.tag || '')).filter(Boolean);
                                    } catch {}
                                    return String(raw).split(',').map(s => s.trim()).filter(Boolean);
                                })(),
                                lastUpdateDate: o.LastUpdateDateTime || o.lastUpdateDate || null,
                                comments: o.comments || '',
                                isExisting: true,
                                status: 'sent'
                            }));
                            if (alive) setOrders(convertedOrders);
                            debug(`📋 Loaded ${convertedOrders.length} existing orders (SQL details)`);
                        } catch (sqlErr) {
                            debug('⚠️ Failed to fetch SQL details, will try mapped ticket orders only:', sqlErr);
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
                                status: 'sent'
                            }));
                            if (alive) setOrders(convertedOrders);
                        }
                    } else {
                        debug('ℹ️ No existing ticket found for table:', tableId);
                    }
                } catch (error) {
                    debug('❌ Error loading existing ticket:', error);
                    console.error('Failed to load existing ticket:', error);
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
                            debug('📥 Fetching detailed ticket by id (SQL preferred):', ticket.id);
                            const useSql = process.env.REACT_APP_USE_SQL_READS === 'true';
                            if (useSql && ticket?.id) {
                                const { fetchTicketDetails } = await import('../../queries');
                                const details = await fetchTicketDetails(String(ticket.id));
                                const header = details?.header || {};
                                const ordersList = Array.isArray(details?.orders) ? details.orders : [];
                                // Derive blocked
                                const paymentStatus = (header.PaymentStatus || '').toUpperCase();
                                const statesStr = header.TicketStates || '';
                                const isBlocked = paymentStatus === 'BLOCKED' || (typeof statesStr === 'string' && statesStr.includes('Bloqueado'));
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
                                        } catch {}
                                        return String(raw).split(',').map(s => s.trim()).filter(Boolean);
                                    })(),
                                    lastUpdateDate: o.LastUpdateDateTime || o.lastUpdateDate || null,
                                    comments: o.comments || '',
                                    isExisting: true,
                                    status: 'sent'
                                }));
                            } else {
                                debug('📥 Fetching detailed ticket by id (GraphQL fallback):', ticket.id);
                                const full = await getTicketById(ticket.id);
                                sourceOrders = full?.orders || [];
                            }
                        } catch (e) {
                            debug('⚠️ Failed to fetch detailed ticket:', e);
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
                        status: 'sent'
                    }));
                    if (alive) setOrders(convertedOrders);
                } catch (e) {
                    debug('⚠️ Failed to enrich ticket prop, falling back to any provided orders');
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
        if (isWaiter && ticketBlocked) {
            setSnackbar({ open: true, severity: 'warning', message: 'Cuenta bloqueada. No puede agregar productos.' });
            return;
        }
        debug('🍽️ Product clicked:', product.name);
        setSelectedProduct(product);
        setProductModalOpen(true);
    }, [isWaiter, ticketBlocked]);

    const handleAddToOrder = useCallback(async (orderData) => {
        if (isWaiter && ticketBlocked) {
            setSnackbar({ open: true, severity: 'warning', message: 'Cuenta bloqueada. No puede agregar productos.' });
            return;
        }
        debug('➕ Adding order (Discovery: server-first with comment):', orderData);

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
                    } catch {}
                    // Execute unlock automation command
                    await executeAutomationCommandForTerminalTicketAsync(terminalId, 'Desbloquear ticket', '');
                    setTicketBlocked(false);
                    try {
                        window.dispatchEvent(new CustomEvent('ticketUpdated', { detail: { source: 'unlock' } }));
                    } catch {}
                } catch (unlockErr) {
                    debug('⚠️ Failed to unlock ticket before add (admin path):', unlockErr);
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
                        if (tt) terminalTicketOpenRef.current = true;
                    } catch {}
                    if (!terminalTicketOpenRef.current) {
                        await createTerminalTicketAsync(terminalId);
                        terminalTicketOpenRef.current = true;
                    }
                }
            } catch (ctxErr) {
                debug('⚠️ Could not prepare terminal ticket before add:', ctxErr);
            }

            // Add order now
            await orderService.addOrder(
                terminalId,
                newOrder.name,
                newOrder.quantity,
                newOrder.portion
            );

            // Resolve uid (up to 5 retries × 200ms)
            const sleep = (ms) => new Promise(r => setTimeout(r, ms));
            let newUid = null;
            for (let attempt = 0; attempt < 5 && !newUid; attempt++) {
                let tt = null;
                try { tt = await getTerminalTicketInline(); } catch {}
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
                    await changeEntityOfTerminalTicketAsync(terminalId, tableId);
                    boundTableRef.current = tableId;
                }
            } catch (bindErr) {
                debug('⚠️ Failed to bind mesa after add', bindErr);
            }

            // Apply free-text comment optionally (Discovery step 7)
            if (newUid && newOrder.comments && newOrder.comments.trim()) {
                try {
                    await executeAutomationCommandForTerminalTicketAsync(terminalId, ORDER_COMMENT_COMMAND, newOrder.comments.trim(), newUid);
                    debug('💬 Comment applied on add for order', newUid);
                } catch (tagErr) {
                    debug('⚠️ Failed to apply comment on add', tagErr);
                }
            }

            // Attach uid locally
            if (newUid) {
                setOrders(prev => prev.map(o => o.id === localId ? { ...o, uid: newUid } : o));
            }

        } catch (error) {
            debug('❌ Error adding order (server):', error);
            console.error('Failed to add order:', error);
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
            // Prefer detailed ticket by id when available
            if (ticket?.id) {
                const full = await getTicketById(ticket.id);
                const sourceOrders = full?.orders || [];
                if (!Array.isArray(sourceOrders) || sourceOrders.length === 0) {
                    debug('ℹ️ SWR: keeping stale orders (server returned empty)');
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
                    status: 'sent'
                }));
                // Merge: keep any pending locals without uid
                setOrders(prev => {
                    const pending = prev.filter(o => !o.uid && !o.isExisting);
                    return [...converted, ...pending];
                });
                return;
            }
            // Else try by table
            if (tableId) {
                const existingTicketData = await ticketService.getTicketByTable(tableId);
                if (existingTicketData?.ticket) {
                    const src = existingTicketData.ticket.orders || [];
                    if (src.length === 0) return; // keep stale
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
                        status: 'sent'
                    }));
                    setOrders(prev => {
                        const pending = prev.filter(o => !o.uid && !o.isExisting);
                        return [...converted, ...pending];
                    });
                    return;
                }
            }
            // Fallback: read from terminal
            const tt = await getTerminalTicketInline();
            const list = tt?.orders || [];
            if (!list.length) return; // keep stale
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
                status: 'sent'
            }));
            setOrders(prev => {
                const pending = prev.filter(o => !o.uid && !o.isExisting);
                return [...converted, ...pending];
            });
        } catch (e) {
            debug('⚠️ refreshOrdersFromServer failed', e);
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
        } catch {}
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
            debug('⚠️ ensureTerminalContext failed (non-critical):', e);
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
                    } catch {}
                }
                if (!cancelled) setAllowedOrderCmds(map);
            } catch (e) {
                debug('⚠️ Failed loading allowed order commands', e);
            }
        };
        loadAllowed();
        return () => { cancelled = true; };
    }, [orders, ensureTerminalContext]);

    const handleGiftOrderCore = useCallback(async (order) => {
        try {
            debug(`🎁 Starting gift action for order: ${order?.uid}`);
            
            const terminalId = await ensureTerminalContext();
            debug(`🔗 Terminal context: ${terminalId}`);
            
            if (!terminalId) {
                debug('❌ No terminal ID available for gift command');
                throw new Error('No se pudo obtener terminal ID');
            }
            if (!order?.uid) {
                debug('❌ No order UID available for gift command');
                throw new Error('No se pudo identificar la orden');
            }
            
            debug(`📡 Executing gift automation command for terminal ${terminalId}, order ${order.uid}`);
            await executeAutomationCommandForTerminalTicketAsync(terminalId, GIFT_COMMAND, '', order.uid);
            debug(`✅ Gift command executed successfully`);
            
            // Notify and refresh
            try { 
                debug(`📢 Dispatching ticketUpdated event`);
                window.dispatchEvent(new CustomEvent('ticketUpdated', { detail: { source: 'gift' } })); 
            } catch {}
            
            debug(`🔄 Refreshing orders from server`);
            await refreshOrdersFromServer();
            debug(`✅ Orders refreshed successfully`);
            
            setSnackbar({ open: true, severity: 'success', message: 'Orden marcada como Regalo' });
        } catch (e) {
            debug('❌ Gift command failed:', e);
            console.error('Gift command error details:', e);
            setSnackbar({ open: true, severity: 'error', message: `No se pudo aplicar Regalo: ${e.message || e}` });
            throw e; // Re-throw to be caught by handleAdminPinConfirm
        }
    }, [ensureTerminalContext, refreshOrdersFromServer]);

    const handleVoidOrderCore = useCallback(async (order) => {
        try {
            debug(`❌ Starting void action for order: ${order?.uid}`);
            
            const terminalId = await ensureTerminalContext();
            debug(`🔗 Terminal context: ${terminalId}`);
            
            if (!terminalId) {
                debug('❌ No terminal ID available for void command');
                throw new Error('No se pudo obtener terminal ID');
            }
            if (!order?.uid) {
                debug('❌ No order UID available for void command');
                throw new Error('No se pudo identificar la orden');
            }
            
            debug(`📡 Executing void automation command for terminal ${terminalId}, order ${order.uid}`);
            await executeAutomationCommandForTerminalTicketAsync(terminalId, VOID_COMMAND, '', order.uid);
            debug(`✅ Void command executed successfully`);
            
            try { 
                debug(`📢 Dispatching ticketUpdated event`);
                window.dispatchEvent(new CustomEvent('ticketUpdated', { detail: { source: 'void' } })); 
            } catch {}
            
            debug(`🔄 Refreshing orders from server`);
            await refreshOrdersFromServer();
            debug(`✅ Orders refreshed successfully`);
            
            setSnackbar({ open: true, severity: 'success', message: 'Orden anulada' });
        } catch (e) {
            debug('❌ Void command failed:', e);
            console.error('Void command error details:', e);
            setSnackbar({ open: true, severity: 'error', message: `No se pudo anular la orden: ${e.message || e}` });
            throw e; // Re-throw to be caught by handleAdminPinConfirm
        }
    }, [ensureTerminalContext, refreshOrdersFromServer]);

    // Prompt for admin PIN before executing gift/void
    const requestAdminPin = useCallback(async (action, order) => {
        try {
            debug(`🔑 Requesting admin PIN for ${action} on order:`, order?.uid);
            
            // Validate prerequisites before opening dialog
            if (!action || !order) {
                debug('❌ Invalid action or order for admin PIN request', { action, order });
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
                const commandName = action === 'gift' ? 'Regalo' : 'Anular';
                const reasons = await fetchAutomationReasons(commandName);
                setAvailableReasons(reasons);
                debug(`✅ Loaded ${reasons.length} automation reasons for ${commandName}`);
            } catch (e) {
                debug('❌ Failed to load automation reasons:', e);
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
            
            debug(`🔑 Opening admin PIN dialog for ${action}`);
            // Force dialog to open - ensure state is set immediately
            setAdminPinOpen(true);
            
            // Add a small delay to ensure dialog renders
            setTimeout(() => {
                debug(`✅ Admin PIN dialog should now be visible for ${action}`);
            }, 100);
            
        } catch (error) {
            debug('❌ requestAdminPin failed:', error);
            setSnackbar({ 
                open: true, 
                severity: 'error', 
                message: 'Error al abrir diálogo de autorización' 
            });
        }
    }, []);

    const handleAdminPinConfirm = useCallback(async () => {
        if (!adminAction || !adminTargetOrder) return;
        
        if (!adminPin || adminPin.length < 4) {
            setAdminPinError('PIN debe tener al menos 4 dígitos');
            return;
        }
        if (!adminReason.trim()) {
            setAdminPinError('Debe ingresar una razón para esta acción');
            return;
        }

        setAdminValidating(true);
        setAdminPinError('');
        
        try {
            debug(`🔑 Starting PIN validation for ${adminAction} action with PIN: ${adminPin}`);
            
            // Validate PIN via GraphQL (getUser)
            await userService.validatePin(adminPin);
            debug(`✅ PIN validation successful for ${adminAction} action`);
            
            // Log the action with reason
            const actionText = adminAction === 'gift' ? 'Regalo' : 'Anulación';
            debug(`🔑 Admin action authorized: ${actionText} - Reason: ${adminReason}`);
            
            // Perform the action
            if (adminAction === 'gift') {
                debug(`🎁 Executing gift action on order ${adminTargetOrder?.uid}`);
                await handleGiftOrderCore(adminTargetOrder);
                debug(`✅ Gift action completed successfully`);
            } else if (adminAction === 'void') {
                debug(`❌ Executing void action on order ${adminTargetOrder?.uid}`);
                await handleVoidOrderCore(adminTargetOrder);
                debug(`✅ Void action completed successfully`);
            }
            
            // Close dialog and reset
            debug(`🔒 Closing admin dialog and resetting state`);
            setAdminPinOpen(false);
            setAdminPin('');
            setAdminReason('');
            setAdminPinError('');
            
        } catch (e) {
            debug('❌ Admin PIN validation or action failed:', e);
            console.error('❌ Admin PIN Error Details:', {
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
            debug('🔒 Keeping admin dialog open for retry after error');
            return; // Don't close dialog on error
        } finally {
            setAdminValidating(false);
        }
    }, [adminAction, adminTargetOrder, adminPin, adminReason, handleGiftOrderCore, handleVoidOrderCore]);

    const handleSendToKitchen = useCallback(async () => {
        debug('🍳 Submitting to kitchen (close terminal ticket only)');
        try {
            let terminalId = terminalService.getTerminalId();
            if (!terminalId) {
                const userName = authUser?.name || null;
                terminalId = await terminalService.ensureTerminalRegistered(userName);
            }
            // For new tickets (no ticket.id): do NOT re-create if already in session; create only if needed
            if (terminalId && !ticket?.id) {
                // Best effort: reuse existing terminal ticket; create only if none
                try {
                    const tt = await getTerminalTicketInline();
                    terminalTicketOpenRef.current = !!tt;
                } catch {}
                if (!terminalTicketOpenRef.current) {
                    try { await createTerminalTicketAsync(terminalId); terminalTicketOpenRef.current = true; } catch {}
                }
                // Ensure mesa is bound before closing (only once)
                if (tableId && boundTableRef.current !== tableId) {
                    try { await changeEntityOfTerminalTicketAsync(terminalId, tableId); boundTableRef.current = tableId; } catch {}
                }
            } else if (terminalId && ticket?.id) {
                try { await loadTerminalTicketWithOrders(terminalId, String(ticket.id)); } catch {}
            }
            if (!terminalId) {
                setSnackbar({ open: true, severity: 'error', message: 'No hay terminal registrada' });
                return;
            }
            try {
                await closeTerminalTicketInline();
                debug('🔒 Terminal ticket closed after submit');
                try {
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('ticketUpdated', { detail: { source: 'submit-close' } }));
                        if (typeof window.refreshData === 'function') {
                            window.refreshData('tables').catch(() => {});
                        }
                    }
                } catch {}
                // After sending to kitchen, return to table map
                navigate('/tables', { replace: true });
            } catch (e) {
                debug('⚠️ closeTerminalTicket failed:', e);
                setSnackbar({ open: true, severity: 'warning', message: 'No hay ticket abierto para enviar' });
            }
        } catch (error) {
            debug('❌ Error submitting to kitchen:', error);
            console.error('Kitchen submission failed:', error);
            setSnackbar({ open: true, severity: 'error', message: 'Error al enviar a cocina' });
        }
    }, [ensureTerminalContext]);

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
                    debug('🔄 Loaded ticket into terminal for print:', ticket.id);
                } else if (terminalId && tableId) {
                    await changeEntityOfTerminalTicketAsync(terminalId, tableId);
                    debug('🔄 Bound terminal to mesa for print:', tableId);
                }
            } catch (ctxErr) {
                debug('⚠️ Could not prepare terminal ticket context before print:', ctxErr);
            }

            // Prefer Automation Command on the active terminal ticket if available
            if (terminalId) {
                try {
                    const printCmd = process.env.SAMBAPOS_PRINT_ACCOUNT_COMMAND || 'Imprimir factura';
                    await executeAutomationCommandForTerminalTicketAsync(terminalId, printCmd, '');
                    debug('🧾 Print bill via automation command');
                    // Notify tables to refresh immediately (should flip to Cuenta solicitada)
                    try {
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('ticketUpdated', { detail: { source: 'print-bill' } }));
                            if (typeof window.refreshData === 'function') {
                                window.refreshData('tables').catch(() => {});
                            }
                        }
                    } catch {}
                    // After printing, return to table map
                    // Mark as blocked in UI immediately
                    try { setTicketBlocked(true); } catch {}
                    navigate('/tables', { replace: true });
                    return;
                } catch (cmdErr) {
                    debug('⚠️ Print command failed, will try print job if ticketId present:', cmdErr);
                }
            }

            // Fallback: print job on last known ticket id (if provided in navigation state)
            if (ticket?.id) {
                await executePrintJobAsync({ name: PRINT_JOB, ticketId: ticket.id });
                debug('🧾 Print bill via print job for ticket', ticket.id);
                // Notify tables to refresh immediately
                try {
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('ticketUpdated', { detail: { source: 'print-job' } }));
                        if (typeof window.refreshData === 'function') {
                            window.refreshData('tables').catch(() => {});
                        }
                    }
                } catch {}
                // After printing, return to table map
                try { setTicketBlocked(true); } catch {}
                navigate('/tables', { replace: true });
            } else {
                alert('No hay ticket para imprimir.');
            }
        } catch (e) {
            debug('❌ Print bill failed:', e);
            alert('Error al imprimir cuenta: ' + (e?.message || e));
        }
    }, [authUser, ticket]);

    const handlePayment = useCallback(async (paymentData) => {
        debug('💳 Processing payment using real GraphQL:', paymentData);

        try {
            // TODO: Implement payment using paymentService
            const terminalId = `TERMINAL_${Date.now()}`; // TODO: Get from real terminal service

            const result = await paymentService.processPayment(
                terminalId,
                paymentData.method,
                paymentData.amount
            );

            debug('✅ Payment processed:', result);

            // Clear orders after successful payment
            setOrders([]);

            // Navigate back to tables
            navigate('/tables');

        } catch (error) {
            debug('❌ Payment failed:', error);
            console.error('Payment processing failed:', error);
        }
    }, [navigate]);

    const calculateTotal = useCallback(() => {
        return orders.reduce((total, order) => total + (order.price * order.quantity), 0);
    }, [orders]);


    const handleOpenPaymentDialog = useCallback(() => {
        setPaymentDialogOpen(true);
    }, []);

    

    const toggleOrderExpansion = (index) => {
        setExpandedOrderIndex(expandedOrderIndex === index ? -1 : index);
    };

    const totalAmount = calculateTotal();
    const orderCount = orders.length;

    // Mobile menu component
    const MobileMenuContainer = ({ menuOverride = null }) => (
        <Box sx={{ height: '100%', overflow: 'auto', p: 1 }}>
            {configurationError ? (
                <Box sx={{ p: 2 }}>
                    <Alert severity="error" sx={{ mb: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            🔧 Configuración Requerida
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
        return (
            <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
                {items.map(cat => (
                    <Chip
                        key={cat}
                        label={cat}
                        color={selectedCategory === cat ? 'primary' : 'default'}
                        onClick={() => setSelectedCategory(cat)}
                        sx={{ flexShrink: 0 }}
                    />
                ))}
            </Box>
        );
    };

    const ProductGrid = () => {
        const categories = menuJS?.categories || [];
        const productsAll = selectedCategory === 'Todos'
            ? categories.flatMap(c => c.menuItems || [])
            : (categories.find(c => c.name === selectedCategory)?.menuItems || []);
        // Pagination: determine items per page dynamically (rows computed) and columns by breakpoint
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
                {pageItems.map(p => (
                    <Grid item xs={12/cols} sm={12/cols} md={12/cols} key={`${p.id || p.name}-${selectedCategory}-${start}`}> 
                        <Card onClick={() => handleProductClick(p)} sx={{ cursor: 'pointer', height: isMobile ? 92 : 110, display: 'flex', alignItems: 'center' }}>
                            <CardContent sx={{ p: 1, width: '100%', py: 1 }}>
                                <Typography variant="body2" fontWeight="bold" noWrap>
                                    {p.name || p.caption}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {formatMXN((p.portions && p.portions[0]?.price) || (p.product?.portions && p.product.portions[0]?.price) || 0)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
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
                                                        {order.comments && ' • Comentarios'}
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
                                                            💬 {order.comments}
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

                                            {order.isExisting && (
                                                <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                                                    <IconButton
                                                        size="small"
                                                        color="success"
                                                        title="Regalo"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            try {
                                                                debug(`🎁 Gift button clicked for order: ${order?.uid}`);
                                                                requestAdminPin('gift', order);
                                                            } catch (error) {
                                                                debug('❌ Error in gift button click:', error);
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

                    {/* Cart Summary - pinned at bottom of cart panel */}
                    <Paper sx={{ p: 2, mt: 1, bgcolor: 'background.paper', flexShrink: 0, borderTop: (theme) => `1px solid ${theme.palette.divider}` }} elevation={2}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1rem' } }}>Total del Pedido</Typography>
                            <Typography variant="h4" color="primary.main" fontWeight="bold" sx={{ fontSize: { xs: '1.6rem', sm: '1.4rem' } }}>
                                {formatMXN(totalAmount)}
                            </Typography>
                        </Box>

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
                                startIcon={<PrintIcon />}
                                onClick={handlePrintBill}
                                fullWidth
                                disabled={orders.length === 0}
                                size="large"
                                sx={{ 
                                    minHeight: '48px', 
                                    fontSize: '1.1rem', 
                                    fontWeight: 600,
                                    borderColor: 'info.main',
                                    color: 'info.main',
                                    '&:hover': { 
                                        borderColor: 'info.dark',
                                        color: 'info.dark',
                                        bgcolor: 'info.light'
                                    }
                                }}
                            >
                                {LABEL_PRINT_BILL}
                            </Button>
                            {canPay && (
                                <Button
                                    variant="contained"
                                    startIcon={<PaymentIcon />}
                                    onClick={handleOpenPaymentDialog}
                                    fullWidth
                                    disabled={orders.length === 0}
                                >
                                    {LABEL_PAY}
                                </Button>
                            )}
                        </Box>
                    </Paper>
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
            <AppBar position="static" elevation={1}>
                <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={handleBack}
                        sx={{ mr: 2 }}
                    >
                        <BackIcon />
                    </IconButton>

                    <Box flex={1}>
                        <Typography variant="h6" noWrap>
                            Mesa {tableId}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
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
                    {/* For mobile: categories/products first, then cart; for md+: two columns (40/60). Desktop grid occupies full height. */}
                    <Grid container spacing={2} sx={{ height: '100%', alignItems: 'stretch' }}>
                        {/* Right panel (products) rendered first to appear on top in mobile */}
                        <Grid item xs={12} md={7} order={{ xs: 1, md: 2 }} sx={{ display: 'flex' }}>
                            <Paper sx={{ p: 1, display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                                <CategoryBar />
                                <Box sx={{ mt: 1, flex: 1, display: 'flex', flexDirection: 'column' }} ref={productsBoxRef}>
                                    <ProductGrid />
                                </Box>
                            </Paper>
                        </Grid>
                        {/* Left panel (cart) */}
                        <Grid item xs={12} md={5} order={{ xs: 2, md: 1 }} sx={{ display: 'flex' }}>
                            <MobileCart />
                        </Grid>
                    </Grid>
                </Box>
            )}

            {/* Floating Action Buttons */}
            {orderCount > 0 && (
                <Fab
                    color="primary"
                    sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }}
                    onClick={() => setActiveTab(1)}
                    title="Ir al carrito"
                >
                    <Badge badgeContent={orderCount} color="error">
                        <ReceiptIcon />
                    </Badge>
                </Fab>
            )}

            {/* Product Details Modal */}
            <ProductDetailsModal
                open={productModalOpen}
                onClose={handleCloseModal}
                product={selectedProduct}
                onAddToOrder={handleAddToOrder}
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
                onPaymentSuccess={(paymentData) => {
                    handlePayment(paymentData);
                    setPaymentDialogOpen(false);
                }}
                onError={(error) => alert('Error: ' + error.message)}
            />

            {/* Snackbar feedback */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={2000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            {/* Admin PIN Dialog */}
            <Dialog 
                open={adminPinOpen} 
                onClose={(event, reason) => {
                    // Prevent closing during validation
                    if (adminValidating && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
                        debug('🔒 Preventing dialog closure during validation');
                        return;
                    }
                    // Only allow explicit cancel button closure, not accidental backdrop clicks
                    if (reason === 'backdropClick' && adminPin) {
                        debug('🔒 Preventing accidental dialog closure - use Cancel button');
                        return;
                    }
                    debug('🔒 Admin PIN dialog closing via', reason);
                    setAdminPinOpen(false);
                    setAdminPin('');
                    setAdminReason('');
                    setAdminPinError('');
                    setAdminAction(null);
                    setAdminTargetOrder(null);
                }}
                maxWidth="sm" 
                fullWidth
            >
                <DialogTitle>
                    <Typography variant="h6" component="div">
                        🔐 Autorización de Administrador
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {adminAction === 'gift' ? 'Aplicar Regalo a la orden' : 'Anular la orden'}
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    {/* Reason Selector */}
                    <FormControl fullWidth sx={{ mb: 3 }} disabled={adminValidating || reasonsLoading}>
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

                    {/* PIN Input with PinPad */}
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" gutterBottom>
                            Ingrese PIN de administrador:
                        </Typography>
                        <PinPad
                            value={adminPin}
                            onChange={setAdminPin}
                            title=""
                            maxLength={6}
                            disabled={adminValidating}
                            hideValue={true}
                            error={adminPinError}
                        />
                        {adminPinError && (
                            <Alert severity="error" sx={{ mt: 2, textAlign: 'left' }}>
                                {adminPinError}
                            </Alert>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => {
                            debug('🔒 Cancel button clicked - closing admin dialog');
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
                        disabled={adminValidating || !adminPin || adminPin.length < 4 || !adminReason.trim()} 
                        variant="contained"
                        color={adminAction === 'gift' ? 'success' : 'warning'}
                    >
                        {adminValidating ? 'Validando…' : (adminAction === 'gift' ? 'Aplicar Regalo' : 'Anular Orden')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default POSViewMobile;
