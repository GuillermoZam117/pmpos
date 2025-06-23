import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
    Box, 
    Grid, 
    Typography, 
    Paper, 
    AppBar, 
    Toolbar, 
    IconButton,
    Button,
    Card,
    CardContent,
    Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import Menu from '../Menu/Menu';
import OrderTags from '../OrderTags';
import PaymentDialog from '../PaymentDialog';
import OrderEditDialog from '../OrderEditDialog';
import { getMenu, addOrderToTerminalTicket, closeTerminalTicket, ensureAuthenticated, exploreOrderStatesAndMutations } from '../../queries';
import { appconfig } from '../../config';
import * as Actions from '../../actions';
import * as paymentService from '../../services/paymentService';
import * as automationService from '../../services/automationService';
import Debug from 'debug';

const debug = Debug('pmpos:pos');

const POSView = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    
    // Get data from navigation state
    const { ticket, tableId, isNew = false } = location.state || {};
    
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);
    const [orderTagsOpen, setOrderTagsOpen] = useState(false);
    const [selectedMenuItem, setSelectedMenuItem] = useState(null);
    const [orderEditMode, setOrderEditMode] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [closingTicket, setClosingTicket] = useState(false);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [currentTerminalId, setCurrentTerminalId] = useState(null);
    const [orderEditDialogOpen, setOrderEditDialogOpen] = useState(false);
    const [orderToEdit, setOrderToEdit] = useState(null);

    // Redux state for menu
    const appState = useSelector(state => state.app);
    debug('🔍 Redux app state type:', typeof appState);
    debug('🔍 App state methods:', Object.getOwnPropertyNames(appState));
    
    // Handle both Immutable and plain object states
    let menu;
    if (appState && typeof appState.get === 'function') {
        const rawMenu = appState.get('menu');
        debug('🔍 Raw menu from Immutable.get:', rawMenu);
        menu = rawMenu;
        debug('🔍 Menu from Immutable (keeping as Immutable):', menu);
    } else {
        menu = appState?.menu;
        debug('🔍 Menu from plain object:', menu);
    }
    
    debug('🔍 Final menu data for POSView:', menu);

    // Load existing orders if this is an existing ticket
    useEffect(() => {
        const loadExistingOrders = () => {
            if (!isNew && ticket?.orders) {
                debug('📋 Loading existing orders from ticket:', ticket.orders);
                
                // Convert ticket orders to local order format
                const convertedOrders = ticket.orders.map(order => {
                    // Try different fields for product name
                    let productName = order.name || order.caption || 
                                    (order.product && (order.product.name || order.product.caption)) ||
                                    `Product ${order.productId}`;
                    
                    debug('🔍 Processing order:', {
                        orderId: order.uid,
                        productId: order.productId,
                        orderName: order.name,
                        orderCaption: order.caption,
                        productData: order.product,
                        finalName: productName
                    });
                    
                    return {
                        id: Date.now() + Math.random(), // Generate local ID for React
                        uid: order.uid, // SambaPOS UID - indicates this is an EXISTING order
                        productId: order.productId,
                        name: productName,
                        caption: order.caption || productName,
                        quantity: order.quantity,
                        price: order.price,
                        portion: order.portion || 'Normal',
                        orderTags: order.orderTags ? order.orderTags.split(',').filter(tag => tag.trim()) : [],
                        isExisting: true // Flag to clearly mark existing orders
                    };
                });
                
                setOrders(convertedOrders);
                debug('✅ Loaded existing orders:', convertedOrders);
            }
        };

        loadExistingOrders();
    }, [ticket, isNew]);

    // Update order names when menu becomes available
    useEffect(() => {
        if (menu && orders.length > 0) {
            debug('🔄 Updating order names with menu data...');
            debug('🔍 Current orders before update:', orders);
            debug('🔍 Menu structure:', menu);
            
            setOrders(prevOrders => prevOrders.map(order => {
                debug(`🔍 Looking for menu item for product ID: ${order.productId}`);
                const menuItem = findMenuItemByProductId(order.productId);
                if (menuItem) {
                    const updatedOrder = {
                        ...order,
                        name: menuItem.name || menuItem.caption,
                        caption: menuItem.caption || menuItem.name
                    };
                    debug(`✅ Updated order name from "${order.name}" to "${updatedOrder.name}"`);
                    return updatedOrder;
                } else {
                    debug(`⚠️ No menu item found for product ID: ${order.productId}`);
                }
                return order;
            }));
        }
    }, [menu]);

    // Watch for Redux menu state changes
    useEffect(() => {
        if (menu) {
            debug('🔄 Redux menu state changed:', menu ? 'PRESENT' : 'UNDEFINED');
            if (menu) {
                debug('🎉 Menu is now available in Redux!');
            }
        }
    }, [menu]);

    // Load ticket and menu
    useEffect(() => {
        const loadTicketData = async () => {
            debug('🎫 Loading ticket:', ticket?.uid);
            debug('🔍 Current menu state:', menu);
            
            if (!menu) {
                debug('🔄 No menu found, loading from server...');
                await loadMenu();
            } else {
                debug('✅ Menu already available from Redux store:', menu);
                setLoading(false);
            }
        };

        if (ticket?.uid) {
            loadTicketData();
        }
    }, [ticket, menu]);

    // Debug Redux state after dispatch
    useEffect(() => {
        debug('🔍 Checking Redux state after dispatch...');
    }, [appState]);

    const loadMenu = async () => {
        debug('🔄 Loading menu...');
        try {
            // Clear cache to ensure fresh data with prices
            const { default: cacheService } = await import('../../services/cacheService');
            cacheService.clearMenu();
            debug('🗑️ Cleared menu cache to get fresh data with prices');
            
            const { getMenu } = await import('../../queries');
            await getMenu((menuData) => {
                debug('🔄 Received menu data from server:', menuData);
                
                if (menuData) {
                    debug('🔄 Received menu data structure:', JSON.stringify(menuData, null, 2));
                    debug('🔄 Categories count:', menuData.categories?.length);
                    debug('🔄 Dispatching setMenu action with data:', menuData);
                    
                    // Dispatch to Redux
                    const action = { type: 'SET_MENU', menu: menuData };
                    debug('🔧 Action to dispatch:', action);
                    
                    const result = dispatch(action);
                    debug('🔧 Dispatch result:', result);
                    debug('✅ Menu dispatched to Redux');
                    
                    setLoading(false);
                } else {
                    debug('❌ No menu data received');
                    setLoading(false);
                }
            }, true); // Force refresh
        } catch (error) {
            debug('❌ Error loading menu:', error);
            setLoading(false);
        }
    };

    const handleMenuItemClick = (menuItem) => {
        debug('🍽️ Menu item clicked:', menuItem);
        debug('🔍 MenuItem data:', {
            id: menuItem.id,
            name: menuItem.name,
            caption: menuItem.caption,
            productId: menuItem.productId,
            defaultOrderTags: menuItem.defaultOrderTags,
            product: menuItem.product
        });
        
        // Check if product has order tags
        if (menuItem.defaultOrderTags && menuItem.defaultOrderTags.length > 0) {
            debug('🏷️ Product has order tags, opening modal');
            setSelectedMenuItem(menuItem);
            setOrderTagsOpen(true);
            return;
        }
        
        // If no order tags, add directly to ticket
        addItemToTicket(menuItem, []);
    };

    const addItemToTicket = (menuItem, selectedTags = []) => {
        debug('💰 Processing item for ticket:', {
            menuItem: menuItem,
            hasProduct: !!menuItem.product,
            productData: menuItem.product
        });
        
        // Get price from first portion (default portion)
        let price = 0;
        let portionName = 'Normal';
        
        if (menuItem.product && menuItem.product.portions && menuItem.product.portions.length > 0) {
            const defaultPortion = menuItem.product.portions[0];
            price = parseFloat(defaultPortion.price) || 0;
            portionName = defaultPortion.name || 'Normal';
            debug('💰 Found price from default portion:', { 
                portionName, 
                price,
                rawPrice: defaultPortion.price,
                allPortions: menuItem.product.portions 
            });
        } else {
            debug('⚠️ No pricing information found for product:', {
                productId: menuItem.productId,
                hasProduct: !!menuItem.product,
                hasPortions: !!(menuItem.product && menuItem.product.portions),
                portionsLength: menuItem.product?.portions?.length || 0
            });
        }
        
        // Add item to current ticket
        const newOrder = {
            id: Date.now(),
            uid: null, // No UID = NEW order, not yet in SambaPOS
            name: menuItem.name || menuItem.caption,
            caption: menuItem.caption,
            quantity: 1,
            price: price,
            portion: portionName,
            productId: menuItem.productId,
            orderTags: selectedTags || [],
            isExisting: false // Flag to clearly mark new orders
        };
        
        debug('✅ Adding order to ticket:', newOrder);
        setOrders(prev => [...prev, newOrder]);
    };

    const handleOrderTagsConfirm = (selectedTags) => {
        if (orderEditMode && selectedOrder) {
            // Edit existing order
            debug('🔧 Updating existing order with new tags:', { order: selectedOrder, tags: selectedTags });
            setOrders(prev => prev.map(order => 
                order.id === selectedOrder.id 
                    ? { ...order, orderTags: selectedTags }
                    : order
            ));
        } else if (selectedMenuItem) {
            // Add new item to ticket
            addItemToTicket(selectedMenuItem, selectedTags);
        }
        setOrderTagsOpen(false);
        setSelectedMenuItem(null);
        setOrderEditMode(false);
        setSelectedOrder(null);
    };

    const handleOrderTagsClose = () => {
        setOrderTagsOpen(false);
        setSelectedMenuItem(null);
        setOrderEditMode(false);
        setSelectedOrder(null);
    };

    const findMenuItemByProductId = (productId) => {
        if (!menu || !menu.categories) return null;
        
        for (const category of menu.categories) {
            if (category.menuItems) {
                const menuItem = category.menuItems.find(item => item.productId === productId);
                if (menuItem) {
                    debug('🔍 Found menu item for product:', { productId, menuItem });
                    return menuItem;
                }
            }
        }
        
        debug('⚠️ Menu item not found for product:', productId);
        return null;
    };

    const handleBackToTables = () => {
        navigate('/tables');
    };

    const calculateTotal = () => {
        return orders.reduce((total, order) => total + (order.price * order.quantity), 0);
    };

    const handleOpenPayment = () => {
        if (orders.length === 0) {
            debug('⚠️ Cannot open payment: no orders');
            return;
        }
        
        // Store terminal ID for payment dialog
        setCurrentTerminalId(ticket.terminalId);
        setPaymentDialogOpen(true);
    };

    const handlePaymentSuccess = async (updatedTicket, paymentInfo) => {
        debug('✅ Payment successful:', { updatedTicket, paymentInfo });
        
        try {
            // Execute payment workflow for automation
            const { automationService } = await import('../../services/automationService');
            await automationService.executeWorkflow(ticket.terminalId, 'PROCESS_PAYMENT', {
                amount: paymentInfo.amount,
                paymentType: paymentInfo.paymentType,
                tableName: tableId,
                printReceipt: true
            });
            debug('✅ Payment workflow executed');
        } catch (error) {
            debug('⚠️ Payment workflow failed (non-critical):', error);
            // Don't prevent payment success for automation failures
        }
        
        // Show success message
        alert(`Pago de $${paymentInfo.amount} procesado exitosamente. ${paymentInfo.change > 0 ? `Cambio: $${paymentInfo.change.toFixed(2)}` : ''}`);
        
        // Navigate back to tables after successful payment
        setTimeout(() => {
            navigate('/tables');
        }, 500);
    };

    const handlePaymentError = (error) => {
        debug('❌ Payment error:', error);
        alert('Error al procesar el pago: ' + error.message);
    };

    const handleOrderEdit = (order) => {
        debug('✏️ Opening order for editing:', order);
        setOrderToEdit(order);
        setOrderEditDialogOpen(true);
    };

    const handleOrderUpdated = (updatedOrder) => {
        debug('📝 Order updated:', updatedOrder);
        // Update the local orders state
        setOrders(prevOrders => 
            prevOrders.map(order => 
                order.uid === updatedOrder.uid ? { ...order, ...updatedOrder } : order
            )
        );
    };

    const handleOrderDeleted = (deletedOrder) => {
        debug('🗑️ Order deleted:', deletedOrder);
        // Remove the order from local state
        setOrders(prevOrders => 
            prevOrders.filter(order => order.uid !== deletedOrder.uid)
        );
    };

    const handleClearAllOrders = async () => {
        if (orders.length === 0) {
            debug('⚠️ No orders to clear');
            return;
        }

        if (!window.confirm('¿Estás seguro de que quieres eliminar todas las órdenes?')) {
            return;
        }

        try {
            debug('🗑️ Clearing all orders...');
            const { orderService } = await import('../../services/orderService');
            const result = await orderService.clearAllOrders(ticket.terminalId);
            
            if (result.success) {
                setOrders([]);
                debug('✅ All orders cleared successfully');
            }
        } catch (error) {
            debug('❌ Error clearing orders:', error);
            alert('Error al limpiar órdenes: ' + error.message);
        }
    };

    const handleCloseTicket = async () => {
        if (orders.length === 0) {
            debug('⚠️ Cannot close ticket: no orders');
            return;
        }

        setClosingTicket(true);
        try {
            debug('🔄 Starting ticket closure process...');
            debug('📋 Ticket type:', isNew ? 'NEW' : 'EXISTING');
            debug('📋 Orders to process:', orders);

            // Get terminal ID from the ticket (set during ticket creation)
            const terminalId = ticket.terminalId;
            if (!terminalId) {
                throw new Error('No terminal ID found in ticket');
            }
            debug('🖥️ Using terminal ID from ticket:', terminalId);

            // Determine which orders need to be added to SambaPOS
            let ordersToAdd = [];
            
            if (isNew) {
                // For new tickets, add all orders (none should be existing)
                debug('🆕 New ticket: Adding all orders to SambaPOS...');
                ordersToAdd = orders;
                debug('📋 All orders for new ticket:', orders);
            } else {
                // For existing tickets, only add orders that are NOT existing (no UID or isExisting = false)
                ordersToAdd = orders.filter(order => !order.uid && !order.isExisting);
                debug(`📋 Existing ticket analysis:`);
                debug(`   - Total orders: ${orders.length}`);
                debug(`   - Existing orders (already in SambaPOS): ${orders.filter(order => order.isExisting).length}`);
                debug(`   - New orders to add: ${ordersToAdd.length}`);
                debug('   - New orders details:', ordersToAdd);
            }
            
            // Add orders to SambaPOS
            if (ordersToAdd.length > 0) {
                debug(`➕ Adding ${ordersToAdd.length} orders to SambaPOS...`);
                
                for (const order of ordersToAdd) {
                    debug('➕ Adding order to ticket:', order);
                    
                    // Process order tags to SambaPOS format
                    let orderTagsString = '';
                    if (order.orderTags && order.orderTags.length > 0) {
                        const processedTags = order.orderTags.map(tag => {
                            if (tag.startsWith('Comentarios:')) {
                                // Convert comments to SambaPOS format
                                const comment = tag.replace('Comentarios:', '');
                                return `Nota:${comment}`;
                            }
                            return tag;
                        });
                        orderTagsString = processedTags.join(',');
                    }
                    debug('🏷️ Processed order tags:', orderTagsString);
                    
                    await addOrderToTicketModern(ticket.uid, order.productId, order.quantity, orderTagsString);
                    debug('✅ Order added successfully');
                }
            } else {
                debug('📋 No new orders to add to SambaPOS');
            }

            // Close the terminal ticket
            debug('🔒 Closing terminal ticket...');
            const closeResult = await closeTerminalTicketModern(terminalId);
            debug('✅ Ticket closed successfully, result:', closeResult);

            // Execute close table workflow for automation
            try {
                const { automationService } = await import('../../services/automationService');
                await automationService.executeWorkflow(terminalId, 'CLOSE_TABLE', {
                    tableName: tableId,
                    ticketTotal: calculateTotal(),
                    printBill: true
                });
                debug('✅ Close table workflow executed');
            } catch (error) {
                debug('⚠️ Close table workflow failed (non-critical):', error);
                // Don't prevent ticket closure for automation failures
            }

            // Wait a moment for SambaPOS to process the closure
            debug('⏳ Waiting for SambaPOS to process ticket closure...');
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Clear table cache to ensure status updates
            debug('🗑️ Clearing table cache to refresh status...');
            const { default: cacheService } = await import('../../services/cacheService');
            cacheService.clearTables();
            debug('✅ Table cache cleared');

            // Also clear any terminal-related cache if exists
            if (cacheService.clearTerminal) {
                cacheService.clearTerminal();
                debug('✅ Terminal cache cleared');
            }

            // Navigate back to tables with a small delay to ensure cache is cleared
            debug('🏠 Navigating back to tables...');
            setTimeout(() => {
                navigate('/tables');
            }, 500);

        } catch (error) {
            debug('❌ Error closing ticket:', error);
            alert('Error al cerrar el ticket: ' + error.message);
        } finally {
            setClosingTicket(false);
        }
    };

    // Modern version of addOrderToTerminalTicket using fetch
    const addOrderToTicketModern = async (ticketId, productId, quantity = 1, orderTags = '') => {
        const token = await ensureAuthenticated();
        const config = appconfig();
        
        debug('➕ Adding order to ticket:', { ticketId, productId, quantity, orderTags });
        debug('🏷️ Processed order tags:', orderTags);
        
        // Use the existing getAddOrderToTerminalTicketScript function from queries.js
        const getAddOrderToTerminalTicketScript = (terminalId, productId, orderTags) => {
            return `mutation m{
                ticket:addOrderToTerminalTicket(terminalId:"${terminalId}",
                productId:${productId}
                orderTags:"${orderTags}")
            {id,uid,type,number,date,totalAmount,remainingAmount,
              entities{name,type},      
              states{stateName,state},
              tags{tagName,tag},
              orders{
                id,
                uid,
                productId,
                name,
                quantity,
                portion,
                price,
                priceTag,
                calculatePrice,
                increaseInventory,
                decreaseInventory,
                locked,
                tags{
                  tag,tagName,price,quantity,rate,userId
                },
                states{
                  stateName,state,stateValue
                }}
            }}`;
        };
        
        const mutation = getAddOrderToTerminalTicketScript(ticket.terminalId, productId, orderTags);

        const response = await fetch(config.GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query: mutation })
        });

        const data = await response.json();
        if (data.errors) {
            throw new Error(data.errors[0].message);
        }

        debug('✅ Order added successfully:', data);
        return data.data;
    };

    // Modern version of closeTerminalTicket using fetch
    const closeTerminalTicketModern = async (terminalId) => {
        const token = await ensureAuthenticated();
        const config = appconfig();
        
        const mutation = `mutation {
            errorMessage: closeTerminalTicket(terminalId: "${terminalId}")
        }`;

        const response = await fetch(config.GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query: mutation })
        });

        const data = await response.json();
        if (data.errors) {
            throw new Error(data.errors[0].message);
        }

        return data.data.errorMessage;
    };

    if (!ticket?.uid) {
        return null;
    }

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <AppBar position="static" sx={{ bgcolor: 'primary.main' }}>
                <Toolbar>
                    <IconButton 
                        edge="start" 
                        color="inherit" 
                        onClick={handleBackToTables}
                        sx={{ mr: 2 }}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    
                    <TableRestaurantIcon sx={{ mr: 1 }} />
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Mesa {tableId} - {isNew ? 'Nuevo Ticket' : `Ticket #${ticket.number}`}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body2">
                            Total: ${calculateTotal().toFixed(2)}
                        </Typography>
                        <Button 
                            color="inherit" 
                            variant="contained"
                            startIcon={<AttachMoneyIcon />}
                            onClick={handleOpenPayment}
                            disabled={orders.length === 0}
                            sx={{ mr: 1, bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
                        >
                            💳 Pagar
                        </Button>
                        <Button 
                            color="inherit" 
                            variant="outlined"
                            startIcon={<RestaurantMenuIcon />}
                            onClick={handleCloseTicket}
                            disabled={orders.length === 0 || closingTicket}
                            sx={{ mr: 1 }}
                        >
                            {closingTicket ? 'Cerrando...' : 'Cerrar Ticket'}
                        </Button>
                        <Button 
                            color="inherit" 
                            variant="outlined"
                            onClick={async () => {
                                console.log('🔍 Starting order states exploration...');
                                try {
                                    await exploreOrderStatesAndMutations();
                                } catch (error) {
                                    console.error('❌ Exploration failed:', error);
                                }
                            }}
                            sx={{ fontSize: '0.8rem' }}
                        >
                            Explorar
                        </Button>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Main Content */}
            <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Menu Section */}
                <Box sx={{ 
                    width: '60%', 
                    p: 2, 
                    overflow: 'auto',
                    borderRight: '1px solid',
                    borderColor: 'divider'
                }}>
                    <Typography variant="h5" gutterBottom>
                        Menú
                    </Typography>
                    {loading ? (
                        <Typography>Cargando menú...</Typography>
                    ) : (
                        <Menu onMenuItemClick={handleMenuItemClick} />
                    )}
                </Box>

                {/* Ticket Section */}
                <Box sx={{ width: '40%', p: 2, overflow: 'auto' }}>
                    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Ticket #{isNew ? 'Nuevo' : ticket.number}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Mesa: {tableId}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Fecha: {new Date(ticket.date).toLocaleString()}
                        </Typography>
                    </Paper>

                    {/* Orders List */}
                    <Paper elevation={1} sx={{ p: 2 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6">
                                Órdenes ({orders.length})
                            </Typography>
                            {orders.length > 0 && (
                                <Button
                                    size="small"
                                    color="error"
                                    onClick={handleClearAllOrders}
                                    sx={{ fontSize: '0.75rem' }}
                                >
                                    🗑️ Limpiar Todo
                                </Button>
                            )}
                        </Box>
                        
                        {orders.length === 0 ? (
                            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                                No hay órdenes. Selecciona productos del menú.
                            </Typography>
                        ) : (
                            <Box>
                                {orders.map((order, index) => (
                                    <Card 
                                        key={order.id} 
                                        sx={{ 
                                            mb: 1, 
                                            cursor: 'pointer',
                                            '&:hover': {
                                                bgcolor: 'action.hover'
                                            }
                                        }}
                                        onClick={() => {
                                            debug('🔧 Order clicked for editing:', order);
                                            // Open advanced order edit dialog
                                            handleOrderEdit(order);
                                        }}
                                    >
                                        <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography variant="body1">{order.name}</Typography>
                                                        {order.isExisting && (
                                                            <Typography 
                                                                variant="caption" 
                                                                sx={{ 
                                                                    bgcolor: 'success.light', 
                                                                    color: 'success.contrastText',
                                                                    px: 1, 
                                                                    py: 0.25, 
                                                                    borderRadius: 1,
                                                                    fontSize: '0.7rem'
                                                                }}
                                                            >
                                                                ENVIADO
                                                            </Typography>
                                                        )}
                                                        {!order.isExisting && (
                                                            <Typography 
                                                                variant="caption" 
                                                                sx={{ 
                                                                    bgcolor: 'warning.light', 
                                                                    color: 'warning.contrastText',
                                                                    px: 1, 
                                                                    py: 0.25, 
                                                                    borderRadius: 1,
                                                                    fontSize: '0.7rem'
                                                                }}
                                                            >
                                                                NUEVO
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Cantidad: {order.quantity} {order.portion && ` • ${order.portion}`}
                                                    </Typography>
                                                    {order.orderTags && order.orderTags.length > 0 && (
                                                        <Box sx={{ mt: 0.5 }}>
                                                            {order.orderTags.map((tag, tagIndex) => {
                                                                if (tag.startsWith('Comentarios:')) {
                                                                    const comment = tag.replace('Comentarios:', '');
                                                                    return (
                                                                        <Typography key={tagIndex} variant="caption" color="secondary.main" sx={{ display: 'block', fontStyle: 'italic' }}>
                                                                            💬 {comment}
                                                                        </Typography>
                                                                    );
                                                                } else {
                                                                    const displayTag = tag.includes(':') ? tag.split(':')[1] : tag;
                                                                    return (
                                                                        <Typography key={tagIndex} variant="caption" color="primary.main" sx={{ display: 'inline', mr: 1 }}>
                                                                            • {displayTag}
                                                                        </Typography>
                                                                    );
                                                                }
                                                            })}
                                                        </Box>
                                                    )}
                                                </Box>
                                                <Typography variant="body1" fontWeight="bold">
                                                    ${(order.price * order.quantity).toFixed(2)}
                                                </Typography>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                ))}
                                
                                <Divider sx={{ my: 2 }} />
                                
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="h6">Total:</Typography>
                                    <Typography variant="h6" color="primary.main">
                                        ${calculateTotal().toFixed(2)}
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </Paper>
                </Box>
            </Box>
            
            {/* Order Tags Modal */}
            <OrderTags
                open={orderTagsOpen}
                onClose={handleOrderTagsClose}
                onConfirm={handleOrderTagsConfirm}
                menuItem={selectedMenuItem}
                existingTags={orderEditMode && selectedOrder ? selectedOrder.orderTags : []}
                isEditMode={orderEditMode}
                orderInfo={selectedOrder}
            />
            
            {/* Payment Dialog */}
            <PaymentDialog
                open={paymentDialogOpen}
                onClose={() => setPaymentDialogOpen(false)}
                ticket={{
                    ...ticket,
                    totalAmount: calculateTotal(),
                    remainingAmount: calculateTotal()
                }}
                terminalId={currentTerminalId}
                onPaymentSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
            />
            
            {/* Order Edit Dialog */}
            <OrderEditDialog
                open={orderEditDialogOpen}
                onClose={() => {
                    setOrderEditDialogOpen(false);
                    setOrderToEdit(null);
                }}
                order={orderToEdit}
                terminalId={ticket?.terminalId}
                onOrderUpdated={handleOrderUpdated}
                onOrderDeleted={handleOrderDeleted}
                onError={(error) => alert('Error: ' + error.message)}
                availablePortions={[]} // TODO: Load from menu item
            />
        </Box>
    );
};

export default POSView;