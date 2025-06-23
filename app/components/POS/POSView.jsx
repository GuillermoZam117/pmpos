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
import Menu from '../Menu/Menu';
import OrderTags from '../OrderTags';
import { getMenu, addOrderToTerminalTicket, closeTerminalTicket, ensureAuthenticated } from '../../queries';
import appconfig from '../../config';
import * as Actions from '../../actions';
import Debug from 'debug';

const debug = Debug('pmpos:pos');

const POSView = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { ticket, tableId, isNew } = location.state || {};
    
    // Get menu from Redux store with debug
    const menu = useSelector(state => {
        const appState = state.app;
        debug('🔍 Redux app state type:', typeof appState);
        debug('🔍 App state methods:', appState ? Object.getOwnPropertyNames(appState.__proto__ || {}) : 'none');
        
        let menuData = null;
        if (appState && typeof appState.get === 'function') {
            // Immutable.js format - use the same method as Menu.jsx
            menuData = appState.get('menu');
            debug('🔍 Raw menu from Immutable.get:', menuData);
            
            // Don't convert to JS yet - keep it as Immutable for consistency with Menu.jsx
            debug('🔍 Menu from Immutable (keeping as Immutable):', menuData);
        } else if (appState && typeof appState === 'object') {
            // Plain object format
            menuData = appState.menu;
            debug('🔍 Menu from plain object:', menuData);
        }
        
        debug('🔍 Final menu data for POSView:', menuData);
        return menuData;
    });
    
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);
    const [orderTagsOpen, setOrderTagsOpen] = useState(false);
    const [selectedMenuItem, setSelectedMenuItem] = useState(null);
    const [orderEditMode, setOrderEditMode] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [closingTicket, setClosingTicket] = useState(false);
    
    // Additional debugging for Redux state changes
    useEffect(() => {
        debug('🔄 Redux menu state changed:', menu ? 'PRESENT' : 'UNDEFINED');
        if (menu) {
            debug('🎉 Menu is now available in Redux!');
            setLoading(false);
        }
    }, [menu]);

    useEffect(() => {
        if (!ticket?.uid) {
            debug('❌ No ticket data, redirecting...');
            navigate('/tables');
            return;
        }

        debug('🎫 Loading ticket:', ticket.uid);
        debug('🔍 Current menu state:', menu);
        
        // Load menu if not already loaded
        const loadMenu = async () => {
            try {
                debug('🔄 Loading menu...');
                
                // Force fresh menu data by clearing cache temporarily
                const { default: cacheService } = await import('../../services/cacheService');
                cacheService.invalidateMenu();
                debug('🗑️ Cleared menu cache to get fresh data with prices');
                
                const menuData = await new Promise((resolve) => {
                    getMenu((data) => {
                        if (data) {
                            debug('🔄 Received menu data from server:', data);
                            resolve(data);
                        } else {
                            debug('❌ No menu data received');
                            resolve(null);
                        }
                    }, true); // Force refresh
                });
                
                if (menuData) {
                    debug('🔄 Received menu data structure:', JSON.stringify(menuData, null, 2));
                    debug('🔄 Categories count:', menuData.categories?.length || 'No categories');
                    debug('🔄 Dispatching setMenu action with data:', menuData);
                    
                    // Create and log the action before dispatching
                    const setMenuAction = Actions.setMenu(menuData);
                    debug('🔧 Action to dispatch:', setMenuAction);
                    
                    const result = dispatch(setMenuAction);
                    debug('🔧 Dispatch result:', result);
                    debug('✅ Menu dispatched to Redux');
                    
                    // Force check Redux state after dispatch
                    setTimeout(() => {
                        debug('🔍 Checking Redux state after dispatch...');
                    }, 100);
                } else {
                    debug('❌ No menu data received');
                }
            } catch (error) {
                debug('❌ Error loading menu:', error);
            } finally {
                setLoading(false);
            }
        };

        // Only load menu if not already available
        if (!menu) {
            debug('🔄 No menu found, loading from server...');
            loadMenu();
        } else {
            debug('✅ Menu already available from Redux store:', menu);
            setLoading(false);
        }
        
    }, [ticket, navigate, dispatch, menu]);

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
            name: menuItem.name || menuItem.caption,
            caption: menuItem.caption,
            quantity: 1,
            price: price,
            portion: portionName,
            productId: menuItem.productId,
            orderTags: selectedTags || []
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

    const handleCloseTicket = async () => {
        if (orders.length === 0) {
            debug('⚠️ Cannot close ticket: no orders');
            return;
        }

        setClosingTicket(true);
        try {
            debug('🔄 Starting ticket closure process...');
            debug('📋 Orders to submit:', orders);

            // Get terminal ID from the ticket (set during ticket creation)
            const terminalId = ticket.terminalId;
            if (!terminalId) {
                throw new Error('No terminal ID found in ticket');
            }
            debug('🖥️ Using terminal ID from ticket:', terminalId);

            // Add each order to the terminal ticket
            for (const order of orders) {
                debug('➕ Adding order to terminal ticket:', order);
                
                // Convert order tags to SambaPOS format
                let orderTagsString = '';
                if (order.orderTags && order.orderTags.length > 0) {
                    // Process tags to proper SambaPOS format
                    const processedTags = order.orderTags.map(tag => {
                        if (tag.startsWith('Comentarios:')) {
                            // Comments become special notes
                            return `Nota:${tag.replace('Comentarios:', '').trim()}`;
                        } else if (tag.includes(':')) {
                            // Keep group:value format
                            return tag;
                        } else {
                            // Simple tags
                            return `Tag:${tag}`;
                        }
                    });
                    orderTagsString = processedTags.join(',');
                }
                debug('🏷️ Processed order tags:', orderTagsString);
                
                await addOrderToTerminalTicketModern(terminalId, order.productId, order.quantity, orderTagsString);
                debug('✅ Order added successfully');
            }

            // Close the terminal ticket
            debug('🔒 Closing terminal ticket...');
            await closeTerminalTicketModern(terminalId);
            debug('✅ Ticket closed successfully');

            // Navigate back to tables
            debug('🏠 Navigating back to tables...');
            navigate('/tables');

        } catch (error) {
            debug('❌ Error closing ticket:', error);
            alert('Error al cerrar el ticket: ' + error.message);
        } finally {
            setClosingTicket(false);
        }
    };

    // Modern version of addOrderToTerminalTicket using fetch
    const addOrderToTerminalTicketModern = async (terminalId, productId, quantity = 1, orderTags = '') => {
        const token = await ensureAuthenticated();
        const config = appconfig();
        
        const mutation = `mutation {
            ticket: addOrderToTerminalTicket(
                terminalId: "${terminalId}",
                productId: ${productId},
                quantity: ${quantity},
                orderTags: "${orderTags}"
            ) {
                id
                uid
                totalAmount
            }
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

        return data.data.ticket;
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
                            variant="outlined"
                            startIcon={<RestaurantMenuIcon />}
                            onClick={handleCloseTicket}
                            disabled={orders.length === 0 || closingTicket}
                        >
                            {closingTicket ? 'Cerrando...' : 'Cerrar Ticket'}
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
                        <Typography variant="h6" gutterBottom>
                            Órdenes
                        </Typography>
                        
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
                                            // Set order edit mode and open order tags modal
                                            setSelectedOrder(order);
                                            setOrderEditMode(true);
                                            // Find the original menu item for this order
                                            const menuItem = findMenuItemByProductId(order.productId);
                                            if (menuItem) {
                                                setSelectedMenuItem(menuItem);
                                                setOrderTagsOpen(true);
                                            } else {
                                                debug('⚠️ Could not find menu item for product:', order.productId);
                                            }
                                        }}
                                    >
                                        <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box>
                                                    <Typography variant="body1">{order.name}</Typography>
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
        </Box>
    );
};

export default POSView;