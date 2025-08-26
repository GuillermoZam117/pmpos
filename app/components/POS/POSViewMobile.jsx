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
    SwipeableDrawer,
    Tab,
    Tabs,
    Card,
    CardContent,
    Button,
    Chip,
    Alert,
    Collapse,
    CircularProgress,
    useTheme,
    useMediaQuery,
    Slide,
    Zoom,
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    ShoppingCart as CartIcon,
    RestaurantMenu as MenuIcon,
    Payment as PaymentIcon,
    Send as SendIcon,
    Kitchen as KitchenIcon,
    Print as PrintIcon,
    Add as AddIcon,
    Remove as RemoveIcon,
    Delete as DeleteIcon,
    Brightness4 as ThemeIcon,
    ExpandMore as ExpandIcon,
    ExpandLess as CollapseIcon,
} from '@mui/icons-material';
import { formatMXN } from '../../utils/currencyFormatter';
import MobileMenu from '../Menu/MobileMenu';
import ProductDetailsModal from '../ProductDetailsModal';
import PaymentDialog from '../PaymentDialog';
import { useTheme as useCustomTheme } from '../../contexts/ThemeContext';
import menuService from '../../services/menuService';
import { orderService } from '../../services/orderService';
import { ticketService } from '../../services/ticketService';
import { paymentService } from '../../services/paymentService';
import terminalService from '../../services/terminalService';
import { createTerminalTicketAsync, changeEntityOfTerminalTicketAsync } from '../../queries';
import Debug from 'debug';

const debug = Debug('pmpos:pos-mobile');

const POSViewMobile = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const theme = useTheme();
    const { toggleTheme, isDarkMode } = useCustomTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Get data from navigation state
    const { ticket, tableId, isNew = false } = location.state || {};

    // State management
    const [activeTab, setActiveTab] = useState(0); // 0: Menu, 1: Cart
    const [orders, setOrders] = useState([]);
    const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
    const [menuLoading, setMenuLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [productModalOpen, setProductModalOpen] = useState(false);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [expandedOrderIndex, setExpandedOrderIndex] = useState(-1);
    const [configurationError, setConfigurationError] = useState(null);

    // Prevent infinite loops
    const loadingRef = useRef(false);
    const menuLoadedRef = useRef(false);

    // Redux state
    const appState = useSelector(state => state.app);
    const menu = appState?.get ? appState.get('menu') : appState?.menu;

    // Load menu on mount
    useEffect(() => {
        const loadMenu = async () => {
            // Prevent multiple simultaneous loads
            if (loadingRef.current) {
                debug('📱 Menu loading already in progress, skipping...');
                return;
            }

            // Prevent loading if menu already loaded successfully
            if (menu && menu.categories && menu.categories.length > 0 && menuLoadedRef.current) {
                debug('📱 Menu already loaded successfully, skipping...');
                setMenuLoading(false);
                return;
            }

            loadingRef.current = true;
            debug('📱 Starting menu load...');
            debug('📱 Current menu state:', menu);

            setMenuLoading(true);

            try {
                debug('📱 Loading menu using MenuService...');

                // Use the enhanced MenuService instead of legacy getMenu
                const menuData = await menuService.getMenu(true); // Force refresh

                if (!menuData || !menuData.categories || menuData.categories.length === 0) {
                    throw new Error('Invalid menu data structure');
                }

                debug('📱 ✅ Valid menu data from MenuService:', menuData);

                dispatch({ type: 'SET_MENU', menu: menuData });
                menuLoadedRef.current = true;
                debug('📱 Menu dispatched successfully to Redux');

            } catch (error) {
                debug('❌ Failed to load menu from GraphQL:', error);
                console.error('Menu loading failed:', error);

                // Check if it's a terminal registration/configuration error
                if (error.message.includes('Terminal registration') ||
                    error.message.includes('configuration required') ||
                    error.message.includes('SETUP REQUIRED')) {
                    setConfigurationError(error.message);
                }
            } finally {
                setMenuLoading(false);
                loadingRef.current = false;
            }
        };

        debug('📱 Menu loading effect triggered');

        // Only load if we don't have a menu or if the loading failed previously
        if (!menu || (menu && (!menu.categories || menu.categories.length === 0))) {
            loadMenu();
        } else {
            debug('📱 Menu already exists and is valid:', menu);
            setMenuLoading(false);
            menuLoadedRef.current = true;
        }
    }, []); // Remove dependencies to prevent loops - only run on mount

    // Load existing ticket data for occupied tables
    useEffect(() => {
        const loadExistingTicket = async () => {
            if (!isNew && tableId && !ticket) {
                debug('🎫 Loading existing ticket for table:', tableId);

                try {
                    // Try to get existing ticket using GraphQL
                    const existingTicketData = await ticketService.getTicketByTable(tableId);

                    if (existingTicketData?.ticket) {
                        debug('✅ Found existing ticket:', existingTicketData.ticket);

                        // Convert ticket orders to local format
                        const convertedOrders = (existingTicketData.ticket.orders || []).map(order => ({
                            id: order.uid || Date.now() + Math.random(),
                            uid: order.uid,
                            productId: order.productId,
                            name: order.name || order.caption || order.menuItemName,
                            caption: order.caption || order.name,
                            quantity: order.quantity,
                            price: order.price,
                            portion: order.portion || 'Normal',
                            orderTags: order.orderTags ? order.orderTags.split(',').filter(tag => tag.trim()) : [],
                            comments: order.comments || '',
                            isExisting: true,
                            status: 'sent' // Existing orders are already sent to kitchen
                        }));

                        setOrders(convertedOrders);
                        debug(`📋 Loaded ${convertedOrders.length} existing orders`);
                    } else {
                        debug('ℹ️ No existing ticket found for table:', tableId);
                    }
                } catch (error) {
                    debug('❌ Error loading existing ticket:', error);
                    console.error('Failed to load existing ticket:', error);
                }
            }

            // Legacy: Load from ticket prop if provided
            if (!isNew && ticket?.orders) {
                debug('📋 Loading existing orders from ticket prop');
                const convertedOrders = ticket.orders.map(order => ({
                    id: Date.now() + Math.random(),
                    uid: order.uid,
                    productId: order.productId,
                    name: order.name || order.caption || `Product ${order.productId}`,
                    caption: order.caption || order.name,
                    quantity: order.quantity,
                    price: order.price,
                    portion: order.portion || 'Normal',
                    orderTags: order.orderTags ? order.orderTags.split(',').filter(tag => tag.trim()) : [],
                    comments: '',
                    isExisting: true,
                    status: 'sent'
                }));
                setOrders(convertedOrders);
            }
        };

        loadExistingTicket();
    }, [ticket, isNew, tableId]);

    const handleBack = () => {
        navigate('/tables');
    };

    const handleProductClick = useCallback((product) => {
        debug('🍽️ Product clicked:', product.name);
        setSelectedProduct(product);
        setProductModalOpen(true);
    }, []);

    const handleAddToOrder = useCallback(async (orderData) => {
        debug('➕ Adding to order using real GraphQL service:', orderData);

        try {
            // Create the order object for local state first
            const newOrder = {
                id: Date.now() + Math.random(),
                productId: orderData.product.productId || orderData.product.id,
                name: orderData.product.name || orderData.product.caption,
                caption: orderData.product.caption || orderData.product.name,
                quantity: orderData.quantity,
                price: orderData.price,
                portion: orderData.portion?.name || 'Normal',
                orderTags: orderData.orderTags.map(tag => tag.name),
                comments: orderData.comments,
                isExisting: false,
                status: 'pending' // Track order status
            };

            // Add to local state immediately for UX
            setOrders(prev => [...prev, newOrder]);

            // Auto-switch to cart view on mobile after adding
            if (isMobile) {
                setActiveTab(1);
            }

            debug('✅ Order added to local state, will be sent to kitchen when submitted');

        } catch (error) {
            debug('❌ Error adding order:', error);
            console.error('Failed to add order:', error);
        }
    }, [isMobile]);

    const handleCloseModal = useCallback(() => {
        setProductModalOpen(false);
        setSelectedProduct(null);
    }, []);

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

    const handleSendToKitchen = useCallback(async () => {
        debug('🍳 Sending orders to kitchen using real GraphQL...');

        try {
            // Get pending orders (not yet sent to kitchen)
            const pendingOrders = orders.filter(order => order.status === 'pending');

            if (pendingOrders.length === 0) {
                debug('ℹ️ No pending orders to send to kitchen');
                return;
            }

            // Ensure terminal is registered and create server-side ticket if needed
            let terminalId = terminalService.getTerminalId();
            if (!terminalId) {
                try {
                    terminalId = await terminalService.ensureTerminalRegistered();
                } catch (regErr) {
                    debug('❌ Terminal registration failed before sending to kitchen:', regErr);
                }
            }

            // If we don't yet have a server-side ticket and a terminal is registered, create it now
            let serverTicket = ticket;
            if (!serverTicket?.uid && terminalId) {
                try {
                    const created = await createTerminalTicketAsync(terminalId);
                    if (created) {
                        serverTicket = created;
                        debug('✅ Created server-side terminal ticket for sending orders:', created);
                        // Associate ticket with table if tableId is present
                        if (tableId) {
                            try {
                                await changeEntityOfTerminalTicketAsync(terminalId, tableId);
                                debug('✅ Assigned table to terminal ticket:', tableId);
                            } catch (assignErr) {
                                debug('⚠️ Failed to assign table to terminal ticket:', assignErr);
                            }
                        }
                    }
                } catch (createErr) {
                    debug('❌ Failed to create server-side ticket before sending orders:', createErr);
                }
            }

            // Send each order to kitchen via GraphQL
            const sentOrders = [];
            for (const order of pendingOrders) {
                try {
                    debug(`🍽️ Sending order to kitchen: ${order.name} x${order.quantity}`);

                    // Prevent sending orders if terminal is not registered
                    if (!terminalId) {
                        debug('⚠️ No terminal registered. Skipping send to kitchen for now.');
                        continue;
                    }

                    const result = await orderService.addOrder(
                        terminalId,
                        order.name,
                        order.quantity,
                        order.portion
                    );

                    debug('✅ Order sent to kitchen:', result);
                    sentOrders.push({ ...order, status: 'sent', uid: result.id });

                } catch (orderError) {
                    debug(`❌ Failed to send order ${order.name}:`, orderError);
                    // Keep as pending for retry
                }
            }

            // Update order statuses
            if (sentOrders.length > 0) {
                setOrders(prev => prev.map(order => {
                    const sentOrder = sentOrders.find(sent => sent.id === order.id);
                    return sentOrder || order;
                }));

                debug(`✅ ${sentOrders.length} orders sent to kitchen successfully`);
            }

        } catch (error) {
            debug('❌ Error sending orders to kitchen:', error);
            console.error('Kitchen submission failed:', error);
        }
    }, [orders]);

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
    const MobileMenuContainer = () => (
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
                    menu={menu}
                    onMenuItemClick={handleProductClick}
                    compact={true}
                />
            )}
        </Box>
    );

    // Mobile cart component
    const MobileCart = () => (
        <Box sx={{ height: '100%', overflow: 'auto', p: 1 }}>
            {orders.length === 0 ? (
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 200,
                    textAlign: 'center'
                }}>
                    <CartIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
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
                    <List sx={{ pb: 0 }}>
                        {orders.map((order, index) => (
                            <Card key={order.id} sx={{ mb: 1, overflow: 'visible' }}>
                                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                        <Box flex={1} mr={2}>
                                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                                <Typography variant="subtitle2" fontWeight="bold">
                                                    {order.name}
                                                </Typography>
                                                {order.isExisting ? (
                                                    <Chip size="small" label="ENVIADO" color="success" variant="filled" />
                                                ) : (
                                                    <Chip size="small" label="NUEVO" color="warning" variant="filled" />
                                                )}
                                            </Box>

                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                {order.portion} • {formatMXN(order.price)} c/u
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
                                                    disabled={order.quantity <= 1}
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
                                                    color="primary"
                                                >
                                                    <AddIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleRemoveOrder(order.id)}
                                                    color="error"
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        ))}
                    </List>

                    {/* Cart Summary */}
                    <Paper sx={{ p: 2, mt: 2, bgcolor: 'background.paper' }} elevation={2}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6">Total del Pedido</Typography>
                            <Typography variant="h5" color="primary.main" fontWeight="bold">
                                {formatMXN(totalAmount)}
                            </Typography>
                        </Box>

                        <Box display="flex" gap={1}>
                            <Button
                                variant="outlined"
                                startIcon={<KitchenIcon />}
                                onClick={handleSendToKitchen}
                                fullWidth
                                disabled={orders.length === 0}
                            >
                                Cocina
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<PaymentIcon />}
                                onClick={handleOpenPaymentDialog}
                                fullWidth
                                disabled={orders.length === 0}
                            >
                                Pagar
                            </Button>
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
                            {isNew ? 'Nuevo Ticket' : `Ticket #${ticket.number}`}
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
                            <CartIcon />
                        </Badge>
                    </IconButton>
                </Toolbar>
            </AppBar>

            {/* Mobile Navigation Tabs */}
            <Paper square elevation={1}>
                <Tabs
                    value={activeTab}
                    onChange={(e, newValue) => setActiveTab(newValue)}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="fullWidth"
                >
                    <Tab icon={<MenuIcon />} label="Menú" />
                    <Tab
                        icon={
                            <Badge badgeContent={orderCount} color="error">
                                <CartIcon />
                            </Badge>
                        }
                        label={`Pedido${totalAmount > 0 ? ` • ${formatMXN(totalAmount)}` : ''}`}
                    />
                </Tabs>
            </Paper>

            {/* Content Area */}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                {activeTab === 0 && <MobileMenuContainer />}
                {activeTab === 1 && <MobileCart />}
            </Box>

            {/* Floating Action Buttons */}
            {orderCount > 0 && activeTab === 0 && (
                <Zoom in={true}>
                    <Fab
                        color="primary"
                        sx={{
                            position: 'fixed',
                            bottom: 16,
                            right: 16,
                            zIndex: 1000
                        }}
                        onClick={() => setActiveTab(1)}
                    >
                        <Badge badgeContent={orderCount} color="error">
                            <CartIcon />
                        </Badge>
                    </Fab>
                </Zoom>
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
                ticket={{
                    ...ticket,
                    totalAmount: totalAmount,
                    remainingAmount: totalAmount
                }}
                onPaymentSuccess={(paymentData) => {
                    handlePayment(paymentData);
                    setPaymentDialogOpen(false);
                }}
                onError={(error) => alert('Error: ' + error.message)}
            />
        </Box>
    );
};

export default POSViewMobile;