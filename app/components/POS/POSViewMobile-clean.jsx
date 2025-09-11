/**
 * POSViewMobile.jsx - VERSIÓN LIMPIA 
 * Solo usa servicios unificados (orderService, ticketService, paymentService)
 * SIN Apollo Client, SIN graphqlFlowService, SIN queries masivos
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Button,
    AppBar,
    Toolbar,
    Dialog,
    DialogContent,
    DialogTitle,
    DialogActions,
    Alert,
    Badge,
    Paper,
    Fab,
    Backdrop,
    CircularProgress,
    TextField,
    List,
    ListItem,
    ListItemText,
    ListItemButton,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    CardActions,
    CardHeader,
    IconButton,
    Switch,
    FormControlLabel,
    Avatar,
    SpeedDial,
    SpeedDialAction,
    Drawer,
    ListItemIcon,
    Divider,
    Snackbar
} from '@mui/material';

import {
    Add as AddIcon,
    Remove as RemoveIcon,
    ShoppingCart,
    Receipt,
    Payment,
    Print,
    TableRestaurant,
    Person,
    Settings,
    ExitToApp,
    LocalOffer,
    Cancel,
    CheckCircle,
    ErrorOutline,
    Refresh,
    FastFood,
    Room,
    ArrowBack,
    ArrowForward,
    Close as CloseIcon,
    AdminPanelSettings,
    Delete as DeleteIcon,
    Edit as EditIcon
} from '@mui/icons-material';

import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';

import AdminPinDialog from '../AdminPinDialog';
import UserSelector from '../UserSelector';
import PrintJobsQueue from '../PrintJobs/PrintJobsQueue';
import TableSelectorModal from '../TableSelectorModal';
import ProductCardGrid from '../Menu/ProductCardGrid';
import MenuCategory from '../Menu/MenuCategory';
import CategoryGrid from '../Menu/CategoryGrid';
import OrderTagSelector from '../OrderTagSelector';

import { useTheme as useCustomTheme } from '../../contexts/ThemeContext';
import menuService from '../../services/menuService';
import dataManager from '../../services/dataManager';

// ===== SERVICIOS LIMPIOS =====
import { orderService } from '../../services/orderService';
import { ticketService } from '../../services/ticketService';
import { paymentService } from '../../services/paymentService';

import terminalService from '../../services/terminalService';
import { userService } from '../../services/userService';
import orderTagService from '../../services/orderTagService';
import adminService from '../../services/adminService';

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
    // ===== ESTADO PRINCIPAL =====
    const [cart, setCart] = useState([]);
    const [currentTicket, setCurrentTicket] = useState(null);
    const [terminalId, setTerminalId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [currentTable, setCurrentTable] = useState('');
    const [cartTotal, setCartTotal] = useState(0);

    // ===== ESTADO DE DIÁLOGOS =====
    const [showTableSelector, setShowTableSelector] = useState(false);
    const [showUserSelector, setShowUserSelector] = useState(false);
    const [showAdminPin, setShowAdminPin] = useState(false);
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);

    // ===== HOOKS =====
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const { theme } = useCustomTheme();

    // ===== EFECTOS =====
    useEffect(() => {
        calculateCartTotal();
    }, [cart]);

    // ===== FUNCIONES DE UTILIDAD =====
    const calculateCartTotal = () => {
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        setCartTotal(total);
    };

    const handleError = (error, operation) => {
        debug(`Error en ${operation}:`, error);
        enqueueSnackbar(`Error en ${operation}: ${error.message}`, { variant: 'error' });
    };

    // ===== FUNCIONES DE CARRITO =====
    const addToCart = (product) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === product.id);
            if (existingItem) {
                return prevCart.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            } else {
                return [...prevCart, { ...product, quantity: 1 }];
            }
        });
        enqueueSnackbar(`${product.name} agregado al carrito`, { variant: 'success' });
    };

    const removeFromCart = (productId) => {
        setCart(prevCart => {
            return prevCart.map(item =>
                item.id === productId && item.quantity > 1
                    ? { ...item, quantity: item.quantity - 1 }
                    : item
            ).filter(item => item.quantity > 0);
        });
    };

    const clearCart = () => {
        setCart([]);
        enqueueSnackbar('Carrito vaciado', { variant: 'info' });
    };

    // ===== FUNCIONES DE TICKET =====
    const submitOrders = async () => {
        if (cart.length === 0) {
            enqueueSnackbar('El carrito está vacío', { variant: 'warning' });
            return;
        }

        if (!terminalId) {
            enqueueSnackbar('Terminal no inicializado', { variant: 'error' });
            return;
        }

        setIsLoading(true);
        try {
            // Usar ticketService limpio para crear ticket
            const ticket = await ticketService.createTerminalTicket(terminalId);
            debug('Ticket creado:', ticket);

            // Cambiar mesa si está seleccionada
            if (currentTable) {
                await ticketService.changeTicketEntity(terminalId, currentTable);
                debug('Mesa asignada:', currentTable);
            }

            // Agregar órdenes usando orderService limpio
            for (const item of cart) {
                await orderService.addOrderToTerminal(terminalId, {
                    productId: item.id,
                    quantity: item.quantity,
                    price: item.price
                });
            }

            // Ejecutar comando de submit
            await orderService.executeAutomationCommand(terminalId, SUBMIT_CMD);

            setCurrentTicket(ticket);
            setCart([]);
            enqueueSnackbar('Órdenes enviadas exitosamente', { variant: 'success' });

        } catch (error) {
            handleError(error, 'enviar órdenes');
        } finally {
            setIsLoading(false);
        }
    };

    const payTicket = async (paymentType = 'Efectivo') => {
        if (!currentTicket || !terminalId) {
            enqueueSnackbar('No hay ticket para pagar', { variant: 'warning' });
            return;
        }

        setIsLoading(true);
        try {
            // Usar paymentService limpio
            const result = await paymentService.payTerminalTicket(
                terminalId,
                String(currentTicket.id),
                paymentType,
                cartTotal,
                currentUser?.name || 'POS User'
            );

            debug('Pago procesado:', result);

            setCurrentTicket(null);
            setShowPaymentDialog(false);
            enqueueSnackbar('Pago procesado exitosamente', { variant: 'success' });

        } catch (error) {
            handleError(error, 'procesar pago');
        } finally {
            setIsLoading(false);
        }
    };

    const printBill = async () => {
        if (!currentTicket || !terminalId) {
            enqueueSnackbar('No hay ticket para imprimir', { variant: 'warning' });
            return;
        }

        setIsLoading(true);
        try {
            // Usar ticketService limpio para imprimir
            await ticketService.executePrintJob(terminalId, PRINT_JOB);
            enqueueSnackbar('Cuenta enviada a imprimir', { variant: 'success' });

        } catch (error) {
            handleError(error, 'imprimir cuenta');
        } finally {
            setIsLoading(false);
        }
    };

    // ===== FUNCIONES DE ADMINISTRACIÓN =====
    const initializeTerminal = async () => {
        setIsLoading(true);
        try {
            const user = currentUser || { name: 'POS User' };
            const terminal = await terminalService.registerTerminal(
                'COMEDOR', 'SERVIDOR', 'MESAS', user.name
            );

            setTerminalId(terminal.id);
            debug('Terminal inicializado:', terminal.id);
            enqueueSnackbar('Terminal inicializado correctamente', { variant: 'success' });

        } catch (error) {
            handleError(error, 'inicializar terminal');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUserSelected = (user) => {
        setCurrentUser(user);
        setShowUserSelector(false);
        enqueueSnackbar(`Usuario seleccionado: ${user.name}`, { variant: 'info' });

        // Auto-inicializar terminal cuando se selecciona usuario
        if (!terminalId) {
            initializeTerminal();
        }
    };

    const handleTableSelected = (table) => {
        setCurrentTable(table.name || table.id);
        setShowTableSelector(false);
        enqueueSnackbar(`Mesa seleccionada: ${table.name || table.id}`, { variant: 'info' });
    };

    const handleAdminAction = async (action) => {
        setShowAdminPin(false);
        // Implementar acciones administrativas según necesidad
        enqueueSnackbar(`Acción administrativa: ${action}`, { variant: 'info' });
    };

    // ===== RENDER PRINCIPAL =====
    return (
        <Box sx={{ flexGrow: 1, bgcolor: theme?.background || '#f5f5f5', minHeight: '100vh' }}>
            {/* AppBar */}
            <AppBar position="sticky" sx={{ bgcolor: theme?.primary || '#1976d2' }}>
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        POS - {currentUser?.name || 'Sin Usuario'} - Mesa: {currentTable || 'Sin Mesa'}
                    </Typography>
                    <Badge badgeContent={cart.length} color="error">
                        <ShoppingCart />
                    </Badge>
                </Toolbar>
            </AppBar>

            {/* Contenido Principal */}
            <Grid container spacing={2} sx={{ p: 2 }}>
                {/* Menú de Productos */}
                <Grid item xs={12} md={8}>
                    <Card>
                        <CardHeader title="Menú" />
                        <CardContent>
                            <ProductCardGrid onProductSelect={addToCart} />
                        </CardContent>
                    </Card>
                </Grid>

                {/* Carrito */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardHeader
                            title="Carrito"
                            action={
                                <Typography variant="h6" color="primary">
                                    ${cartTotal.toFixed(2)}
                                </Typography>
                            }
                        />
                        <CardContent>
                            <List>
                                {cart.map((item) => (
                                    <ListItem key={item.id}>
                                        <ListItemText
                                            primary={item.name}
                                            secondary={`$${item.price} x ${item.quantity} = $${(item.price * item.quantity).toFixed(2)}`}
                                        />
                                        <IconButton
                                            size="small"
                                            onClick={() => removeFromCart(item.id)}
                                        >
                                            <RemoveIcon />
                                        </IconButton>
                                    </ListItem>
                                ))}
                            </List>
                        </CardContent>
                        <CardActions>
                            <Button
                                fullWidth
                                variant="contained"
                                color="primary"
                                disabled={cart.length === 0 || isLoading}
                                onClick={submitOrders}
                                startIcon={<Receipt />}
                            >
                                {LABEL_SUBMIT}
                            </Button>
                            {currentTicket && (
                                <>
                                    <Button
                                        variant="outlined"
                                        onClick={() => setShowPaymentDialog(true)}
                                        startIcon={<Payment />}
                                    >
                                        {LABEL_PAY}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        onClick={printBill}
                                        startIcon={<Print />}
                                    >
                                        {LABEL_PRINT_BILL}
                                    </Button>
                                </>
                            )}
                        </CardActions>
                    </Card>
                </Grid>
            </Grid>

            {/* SpeedDial para acciones rápidas */}
            <SpeedDial
                ariaLabel="Acciones POS"
                sx={{ position: 'fixed', bottom: 16, right: 16 }}
                icon={<Settings />}
            >
                <SpeedDialAction
                    icon={<Person />}
                    tooltipTitle="Seleccionar Usuario"
                    onClick={() => setShowUserSelector(true)}
                />
                <SpeedDialAction
                    icon={<TableRestaurant />}
                    tooltipTitle="Seleccionar Mesa"
                    onClick={() => setShowTableSelector(true)}
                />
                <SpeedDialAction
                    icon={<AdminPanelSettings />}
                    tooltipTitle="Administración"
                    onClick={() => setShowAdminPin(true)}
                />
                <SpeedDialAction
                    icon={<DeleteIcon />}
                    tooltipTitle="Limpiar Carrito"
                    onClick={clearCart}
                />
            </SpeedDial>

            {/* Loading Overlay */}
            <Backdrop open={isLoading} sx={{ zIndex: 9999 }}>
                <CircularProgress color="inherit" />
            </Backdrop>

            {/* Diálogos */}
            <UserSelector
                open={showUserSelector}
                onClose={() => setShowUserSelector(false)}
                onUserSelected={handleUserSelected}
            />

            <TableSelectorModal
                open={showTableSelector}
                onClose={() => setShowTableSelector(false)}
                onTableSelected={handleTableSelected}
            />

            <AdminPinDialog
                open={showAdminPin}
                onClose={() => setShowAdminPin(false)}
                onSuccess={handleAdminAction}
            />

            {/* Diálogo de Pago */}
            <Dialog open={showPaymentDialog} onClose={() => setShowPaymentDialog(false)}>
                <DialogTitle>Procesar Pago</DialogTitle>
                <DialogContent>
                    <Typography variant="h6" gutterBottom>
                        Total: ${cartTotal.toFixed(2)}
                    </Typography>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Método de Pago</InputLabel>
                        <Select defaultValue="Efectivo">
                            <MenuItem value="Efectivo">Efectivo</MenuItem>
                            <MenuItem value="Tarjeta">Tarjeta</MenuItem>
                            <MenuItem value="Transferencia">Transferencia</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowPaymentDialog(false)}>Cancelar</Button>
                    <Button
                        onClick={() => payTicket('Efectivo')}
                        variant="contained"
                        disabled={isLoading}
                    >
                        Pagar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default POSViewMobile;
