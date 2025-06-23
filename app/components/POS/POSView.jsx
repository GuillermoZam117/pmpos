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
import { getMenu } from '../../queries';
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
                const menuData = await new Promise((resolve) => {
                    getMenu((data) => {
                        if (data) {
                            debug('🔄 Received menu data from server:', data);
                            resolve(data);
                        } else {
                            debug('❌ No menu data received');
                            resolve(null);
                        }
                    });
                });
                
                if (menuData) {
                    debug('🔄 Dispatching setMenu action with data:', menuData);
                    dispatch(Actions.setMenu(menuData));
                    debug('✅ Menu dispatched to Redux');
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
        // Add item to current ticket
        const newOrder = {
            id: Date.now(),
            name: menuItem.name,
            quantity: 1,
            price: menuItem.price || 0,
            productId: menuItem.productId
        };
        
        setOrders(prev => [...prev, newOrder]);
    };

    const handleBackToTables = () => {
        navigate('/tables');
    };

    const calculateTotal = () => {
        return orders.reduce((total, order) => total + (order.price * order.quantity), 0);
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
                        >
                            Cerrar Ticket
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
                                    <Card key={order.id} sx={{ mb: 1 }}>
                                        <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box>
                                                    <Typography variant="body1">{order.name}</Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Cantidad: {order.quantity}
                                                    </Typography>
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
        </Box>
    );
};

export default POSView;