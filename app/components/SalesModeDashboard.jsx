import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    List,
    ListItem,
    ListItemText,
    Divider,
    Chip,
    Stack,
    Alert,
    Snackbar,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Card,
    CardContent,
    Grid,
    AppBar,
    Toolbar,
    IconButton,
    Menu,
    MenuItem,
    Stepper,
    Step,
    StepLabel,
    ToggleButtonGroup,
    ToggleButton,
    Autocomplete
} from '@mui/material';
import {
    PointOfSale as PosIcon,
    LocalShipping as DeliveryIcon,
    Refresh as RefreshIcon,
    Brightness4 as ThemeIcon,
    Person as PersonIcon,
    Logout as LogoutIcon,
    FlashOn as QuickIcon,
    MenuBook as FullMenuIcon,
    Phone as PhoneIcon,
    Navigation as NavigationIcon,
    Home as AddressIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import terminalService from '../services/terminalService';
import { ticketService } from '../services/ticketService';
import { graphqlRequest } from '../services/graphqlService';
import { SEARCH_ENTITIES } from '../graphql/queries';
import { useDataManager } from '../hooks/useDataManager';
import { useTheme as useCustomTheme } from '../contexts/ThemeContext';
import { logout } from '../actions/auth';
import QuickSaleGrid from './QuickSale/QuickSaleGrid';
import QuickSaleCart from './QuickSale/QuickSaleCart';
import SalesSummaryCard from './SalesSummaryCard';
import { getQuickSaleConfig, getQuickProductPrice } from '../config/quickSale';
import menuService from '../services/menuService';
import PaymentProcessor from './PaymentProcessor';
import useBarcodeScanner from '../hooks/useBarcodeScanner';
import deliveryService from '../services/deliveryService';

const currency = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
});

const SalesModeDashboard = ({ modeKey, config, tickets = [], loading, error, onRefresh }) => {
    const navigate = useNavigate();
    const authUser = useSelector(state => state.auth.get ? state.auth.get('user') : state.auth.user);
    const dispatch = useDispatch();
    const { toggleTheme, isDarkMode } = useCustomTheme();
    const {
        tickets: globalTickets,
        loading: dataLoading,
        error: dataError,
        refresh: refreshData
    } = useDataManager();

    const [creating, setCreating] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const [deliveryData, setDeliveryData] = useState({ name: '', reference: '', address: '', notes: '' });
    const [clientResults, setClientResults] = useState([]);
    const [searchingClients, setSearchingClients] = useState(false);
    const [clientSearchError, setClientSearchError] = useState(null);
    const [wizardOpen, setWizardOpen] = useState(false);
    const [wizardStep, setWizardStep] = useState(0);
    const [wizardData, setWizardData] = useState({ client: null, reference: '', address: '', notes: '' });
    const [userMenuAnchor, setUserMenuAnchor] = useState(null);
    const isMountedRef = useRef(true);

    // Quick Sale states
    const [saleMode, setSaleMode] = useState(() => localStorage.getItem('pmpos_sale_mode') || 'quick');
    const [quickCart, setQuickCart] = useState([]);
    const [quickSaleProducts, setQuickSaleProducts] = useState([]);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [currentTicketForPayment, setCurrentTicketForPayment] = useState(null);
    const { menu: menuData } = useDataManager();

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const salesModeMeta = config?.salesMode || {};
    const effectiveLoading = typeof loading === 'boolean' ? loading : dataLoading;
    const effectiveError = error || dataError;
    
    const userName = useMemo(() => {
        if (!authUser) return config?.userName || 'graphiql';
        return authUser.get ? authUser.get('name') : authUser.name;
    }, [authUser, config]);

    const mergedTickets = useMemo(() => {
        if (Array.isArray(tickets) && tickets.length > 0) return tickets;
        return Array.isArray(globalTickets) ? globalTickets : [];
    }, [tickets, globalTickets]);

    const userDisplayName = useMemo(() => {
        if (!authUser) return 'Usuario';
        return authUser.get ? authUser.get('name') : authUser.name;
    }, [authUser]);

    const filteredTickets = useMemo(() => {
        if (!Array.isArray(mergedTickets)) return [];
        return mergedTickets.filter(ticket => {
            if (config?.departmentName && ticket?.departmentName && ticket.departmentName !== config.departmentName) {
                return false;
            }
            if (modeKey === 'reparto' && config?.entityTypeName) {
                return (ticket?.entities || []).some(entity => (entity?.type || '').toLowerCase() === config.entityTypeName.toLowerCase());
            }
            return true;
        });
    }, [mergedTickets, config, modeKey]);

    const deriveDeliveryStatus = (ticket) => {
        if (!ticket) return 'EN PROCESO';
        const states = Array.isArray(ticket.states) ? ticket.states : [];
        const statusState = states.find(state => {
            const name = (state.stateName || '').toLowerCase();
            return name.includes('status') || name.includes('estado') || name.includes('delivery');
        });
        const stateValue = statusState?.state || statusState?.stateName;
        if (stateValue) return stateValue.toUpperCase();
        if (ticket.remainingAmount === 0) return 'PAGADO';
        return 'EN PROCESO';
    };

    const formatTicketAge = (dateValue) => {
        if (!dateValue) return 'sin tiempo';
        const created = new Date(dateValue);
        if (Number.isNaN(created.getTime())) return 'sin tiempo';
        const diff = Date.now() - created.getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'recién creado';
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const remMinutes = minutes % 60;
        return `${hours}h ${remMinutes}m`;
    };

    const formatEntityInfo = (entity) => {
        if (!entity) return '';
        const phone = entity.phone || '';
        const rawCustom = entity.customData;
        const normalizeString = (value) => {
            if (!value) return '';
            const trimmed = String(value).trim();
            if (!trimmed || trimmed === '{}' || trimmed === '[]') return '';
            return trimmed;
        };
        let customText = '';
        if (rawCustom) {
            let parsed = rawCustom;
            if (typeof rawCustom === 'string') {
                try {
                    parsed = JSON.parse(rawCustom);
                } catch {
                    parsed = normalizeString(rawCustom);
                }
            }
            if (Array.isArray(parsed)) {
                const pairs = parsed
                    .map((entry) => {
                        if (!entry) return null;
                        const key = entry.key || entry.Key || entry.label || entry.Label;
                        const value = entry.value || entry.Value || entry.text || entry.Text;
                        if (!key || value === null || value === undefined || String(value).trim() === '') return null;
                        return `${key}: ${value}`;
                    })
                    .filter(Boolean);
                if (pairs.length > 0) {
                    customText = pairs.join(' • ');
                }
            } else if (parsed && typeof parsed === 'object') {
                const entries = Object.entries(parsed)
                    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '');
                if (entries.length > 0) {
                    customText = entries.map(([key, value]) => `${key}: ${value}`).join(' • ');
                }
            } else if (parsed) {
                customText = normalizeString(parsed);
            }
        }
        return customText || phone || '';
    };

    const deliveryTickets = useMemo(() => {
        if (modeKey !== 'reparto') return [];
        const entityType = (config?.entityTypeName || '').toLowerCase();
        return filteredTickets
            .map(ticket => {
                const entity = (ticket.entities || []).find(e => (e?.type || '').toLowerCase() === entityType) || ticket.entities?.[0];
                return {
                    ...ticket,
                    entityName: entity?.name || 'Sin cliente',
                    deliveryStatus: deriveDeliveryStatus(ticket),
                    ageLabel: formatTicketAge(ticket.date)
                };
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [filteredTickets, modeKey, config?.entityTypeName]);

    const groupedDeliveryTickets = useMemo(() => {
        const pendingPickup = [];
        const enRuta = [];
        deliveryTickets.forEach(ticket => {
            const normalized = (ticket.deliveryStatus || '').toLowerCase();
            if (normalized.includes('ruta') || normalized.includes('camino')) {
                enRuta.push(ticket);
            } else {
                pendingPickup.push(ticket);
            }
        });
        return { pendingPickup, enRuta };
    }, [deliveryTickets]);

    const navigateToPOS = (state = {}) => {
        navigate('/pos', {
            state: { salesMode: modeKey, ...state }
        });
    };

    const ensureTerminal = async () => {
        terminalService.setCurrentUser(userName);
        const terminalId = await terminalService.ensureTerminalRegistered(userName);
        if (!terminalId) throw new Error('No se pudo registrar el terminal.');
        return terminalId;
    };

    const startSale = async ({ entityName } = {}) => {
        setCreating(true);
        try {
            const terminalId = await ensureTerminal();
            const ticket = await ticketService.createTerminalTicket(terminalId);

            if (entityName && config?.entityTypeName) {
                await ticketService.changeEntityOfTerminalTicket(
                    terminalId,
                    entityName,
                    config.entityTypeName
                );
            }

            if (isMountedRef.current) {
                setSnackbar({ open: true, message: 'Ticket listo. Abriendo POS…', severity: 'success' });
                setTimeout(() => navigateToPOS({ ticket, entityName }), 300);
            }
        } catch (err) {
            if (isMountedRef.current) {
                setSnackbar({
                    open: true,
                    message: err?.message || 'No se pudo iniciar la venta.',
                    severity: 'error'
                });
            }
        } finally {
            if (isMountedRef.current) setCreating(false);
        }
    };

    const resumeTicket = async (ticket) => {
        try {
            const terminalId = await ensureTerminal();
            await ticketService.loadTerminalTicket(terminalId, ticket.id);
            navigateToPOS({ ticket });
        } catch (err) {
            if (isMountedRef.current) {
                setSnackbar({
                    open: true,
                    message: err?.message || 'No se pudo cargar el ticket.',
                    severity: 'error'
                });
            }
        }
    };

    // Load quick sale products from config and menu
    useEffect(() => {
        if (modeKey !== 'mostrador' || !menuData) return;

        const quickConfig = getQuickSaleConfig();
        if (quickConfig.products && quickConfig.products.length > 0) {
            setQuickSaleProducts(quickConfig.products);
        } else {
            // If no config, use first 6 products from menu as defaults
            if (menuData.categories && menuData.categories.length > 0) {
                const defaultProducts = [];
                for (const category of menuData.categories) {
                    if (category.menuItems) {
                        for (const item of category.menuItems) {
                            if (defaultProducts.length < 6) {
                                defaultProducts.push({
                                    id: item.id || item.productId,
                                    productId: item.productId || item.id,
                                    name: item.name,
                                    price: getQuickProductPrice(item),
                                    portions: item.portions || [],
                                    categoryName: category.name,
                                    orderTags: item.defaultOrderTags || []
                                });
                            }
                        }
                    }
                    if (defaultProducts.length >= 6) break;
                }
                setQuickSaleProducts(defaultProducts);
            }
        }
    }, [modeKey, menuData]);

    // Save sale mode preference
    useEffect(() => {
        if (saleMode) {
            localStorage.setItem('pmpos_sale_mode', saleMode);
        }
    }, [saleMode]);

    // Barcode scanner handler
    const handleBarcodeScan = useCallback((barcode) => {
        console.log('🔍 Barcode scanned:', barcode);

        // Only process in mostrador mode with quick sale
        if (modeKey !== 'mostrador' || saleMode !== 'quick') {
            return;
        }

        // Search for product by barcode in quick sale products or full menu
        let product = quickSaleProducts.find(p =>
            p.barcode === barcode ||
            p.code === barcode ||
            p.id === barcode ||
            p.productId === barcode
        );

        // If not in quick products, search in full menu
        if (!product && menuData?.categories) {
            for (const category of menuData.categories) {
                if (category.menuItems) {
                    product = category.menuItems.find(item =>
                        item.barcode === barcode ||
                        item.code === barcode ||
                        item.id === barcode ||
                        item.productId === barcode
                    );
                    if (product) {
                        // Add category info
                        product = { ...product, categoryName: category.name };
                        break;
                    }
                }
            }
        }

        if (product) {
            handleQuickAddToCart(product);
            setSnackbar({
                open: true,
                message: `${product.name} añadido al carrito`,
                severity: 'success'
            });
        } else {
            setSnackbar({
                open: true,
                message: `Producto con código "${barcode}" no encontrado`,
                severity: 'warning'
            });
        }
    }, [modeKey, saleMode, quickSaleProducts, menuData, handleQuickAddToCart]);

    // Enable barcode scanner only in mostrador quick mode
    useBarcodeScanner(handleBarcodeScan, {
        enabled: modeKey === 'mostrador' && saleMode === 'quick',
        minLength: 3,
        maxLength: 30,
        debug: false
    });

    // Auto-save wizard data to localStorage
    useEffect(() => {
        if (wizardOpen && wizardData.client) {
            try {
                const draft = {
                    data: wizardData,
                    timestamp: Date.now()
                };
                localStorage.setItem('pmpos_delivery_wizard_draft', JSON.stringify(draft));
            } catch (error) {
                console.error('Error saving wizard draft:', error);
            }
        }
    }, [wizardData, wizardOpen]);

    // Quick Sale handlers
    const handleQuickAddToCart = useCallback((product) => {
        setQuickCart(prev => {
            const existingIndex = prev.findIndex(item =>
                (item.id === product.id || item.productId === product.productId)
            );

            if (existingIndex >= 0) {
                // Increment quantity
                const updated = [...prev];
                updated[existingIndex] = {
                    ...updated[existingIndex],
                    quantity: (updated[existingIndex].quantity || 1) + 1
                };
                return updated;
            } else {
                // Add new item
                return [...prev, {
                    ...product,
                    quantity: 1,
                    price: getQuickProductPrice(product)
                }];
            }
        });
    }, []);

    const handleQuickRemoveFromCart = useCallback((product) => {
        setQuickCart(prev => {
            const existingIndex = prev.findIndex(item =>
                (item.id === product.id || item.productId === product.productId)
            );

            if (existingIndex >= 0) {
                const updated = [...prev];
                const currentQty = updated[existingIndex].quantity || 1;

                if (currentQty > 1) {
                    // Decrement quantity
                    updated[existingIndex] = {
                        ...updated[existingIndex],
                        quantity: currentQty - 1
                    };
                    return updated;
                } else {
                    // Remove item
                    return updated.filter((_, idx) => idx !== existingIndex);
                }
            }
            return prev;
        });
    }, []);

    const handleQuickUpdateQuantity = useCallback((item, newQuantity) => {
        if (newQuantity <= 0) {
            handleQuickRemoveFromCart(item);
            return;
        }

        setQuickCart(prev => prev.map(cartItem =>
            (cartItem.id === item.id || cartItem.productId === item.productId)
                ? { ...cartItem, quantity: newQuantity }
                : cartItem
        ));
    }, [handleQuickRemoveFromCart]);

    const handleQuickClearCart = useCallback(() => {
        setQuickCart([]);
    }, []);

    const handleQuickCheckout = useCallback(async () => {
        if (quickCart.length === 0) {
            setSnackbar({ open: true, message: 'El carrito está vacío', severity: 'warning' });
            return;
        }

        setCreating(true);
        try {
            // Create ticket
            const terminalId = await ensureTerminal();
            const ticket = await ticketService.createTerminalTicket(terminalId);

            // Add all items from cart
            for (const item of quickCart) {
                const quantity = item.quantity || 1;
                for (let i = 0; i < quantity; i++) {
                    await ticketService.addOrderToTerminalTicket(
                        terminalId,
                        item.productId || item.id,
                        item.portionName || null,
                        item.orderTags || []
                    );
                }
            }

            // Store ticket for payment
            setCurrentTicketForPayment(ticket);
            setPaymentDialogOpen(true);

            if (isMountedRef.current) {
                setSnackbar({ open: true, message: 'Ticket creado. Procede al pago…', severity: 'success' });
            }
        } catch (err) {
            if (isMountedRef.current) {
                setSnackbar({
                    open: true,
                    message: err?.message || 'No se pudo crear el ticket.',
                    severity: 'error'
                });
            }
        } finally {
            if (isMountedRef.current) setCreating(false);
        }
    }, [quickCart, isMountedRef]);

    const handlePaymentCompleted = useCallback(async () => {
        setPaymentDialogOpen(false);
        setCurrentTicketForPayment(null);
        setQuickCart([]); // Clear cart after successful payment

        if (isMountedRef.current) {
            setSnackbar({ open: true, message: 'Pago completado exitosamente', severity: 'success' });
        }

        // Refresh tickets
        await refreshData?.(true);
    }, [refreshData, isMountedRef]);

    const handleRefreshClick = (force = true) => {
        if (typeof onRefresh === 'function') return onRefresh(force);
        return refreshData?.(force);
    };

    const handleLogout = useCallback(async () => {
        try {
            await dispatch(logout());
            navigate('/pinpad');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }, [dispatch, navigate]);

    const handleUpdateDeliveryStatus = useCallback(async (ticketId, newStatus) => {
        try {
            await deliveryService.updateTicketStatus(ticketId, newStatus);

            if (isMountedRef.current) {
                setSnackbar({
                    open: true,
                    message: `Estado actualizado a: ${deliveryService.getStatusLabel(newStatus)}`,
                    severity: 'success'
                });
            }

            // Refresh tickets to show updated status
            await refreshData?.(true);
        } catch (error) {
            if (isMountedRef.current) {
                setSnackbar({
                    open: true,
                    message: error?.message || 'No se pudo actualizar el estado',
                    severity: 'error'
                });
            }
        }
    }, [refreshData, isMountedRef]);

    const renderTicketList = () => (
        <Paper variant="outlined" sx={{ mt: 2 }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1">Tickets abiertos</Typography>
                <Button
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={() => handleRefreshClick(true)}
                >
                    Actualizar
                </Button>
            </Box>
            <Divider />
            {filteredTickets.length === 0 ? (
                <Box sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        No hay tickets abiertos para este terminal.
                    </Typography>
                </Box>
            ) : (
                <List dense>
                    {filteredTickets.slice(0, 6).map(ticket => (
                        <ListItem
                            button
                            key={ticket.id}
                            onClick={() => resumeTicket(ticket)}
                        >
                            <ListItemText
                                primary={`Ticket ${ticket.number || ticket.id}`}
                                secondary={
                                    <Typography variant="caption" color="text.secondary">
                                        {`Pendiente: ${currency.format(ticket.remainingAmount || 0)}`}
                                    </Typography>
                                }
                            />
                        </ListItem>
                    ))}
                </List>
            )}
        </Paper>
    );

    const startDeliveryWizard = useCallback(() => {
        setWizardStep(0);

        // Try to restore draft from localStorage
        try {
            const draft = localStorage.getItem('pmpos_delivery_wizard_draft');
            if (draft) {
                const parsed = JSON.parse(draft);
                const timestamp = parsed.timestamp || 0;
                const age = Date.now() - timestamp;

                // Only restore if draft is less than 24 hours old
                if (age < 24 * 60 * 60 * 1000) {
                    setWizardData(parsed.data || { client: null, reference: '', address: '', notes: '' });
                    if (isMountedRef.current) {
                        setSnackbar({
                            open: true,
                            message: 'Se restauró el borrador guardado',
                            severity: 'info'
                        });
                    }
                } else {
                    // Draft too old, clear it
                    localStorage.removeItem('pmpos_delivery_wizard_draft');
                    setWizardData({ client: null, reference: '', address: '', notes: '' });
                }
            } else {
                setWizardData({ client: null, reference: '', address: '', notes: '' });
            }
        } catch (error) {
            console.error('Error restoring wizard draft:', error);
            setWizardData({ client: null, reference: '', address: '', notes: '' });
        }

        setClientResults([]);
        setClientSearchError(null);
        setWizardOpen(true);
    }, [isMountedRef]);

    const handleWizardClientSelect = useCallback((entity) => {
        setWizardData(prev => ({ ...prev, client: entity }));
    }, []);

    const handleWizardNext = () => {
        if (wizardStep === 0 && !wizardData.client) return;
        setWizardStep(step => Math.min(step + 1, 1));
    };

    const handleWizardBack = () => {
        setWizardStep(step => Math.max(step - 1, 0));
    };

    const handleWizardConfirm = async () => {
        if (!wizardData.client) return;
        setWizardOpen(false);

        try {
            await startSale({ entityName: wizardData.client.name });

            // Clear draft after successful creation
            localStorage.removeItem('pmpos_delivery_wizard_draft');
        } catch (error) {
            console.error('Error creating delivery order:', error);
            // Don't clear draft if there was an error
        }
    };

    const renderDeliveryGroup = (title, list) => (
        <Paper variant="outlined" sx={{ mt: 2 }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1">{title}</Typography>
                <Chip label={`${list.length} pedido(s)`} />
            </Box>
            <Divider />
            {list.length === 0 ? (
                <Box sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        No hay pedidos en esta sección.
                    </Typography>
                </Box>
            ) : (
                <Grid container spacing={2} sx={{ p: 2, pt: 0 }}>
                    {list.map(ticket => (
                        <Grid item xs={12} md={6} key={ticket.id}>
                            <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <CardContent sx={{ flex: 1 }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                                        <Box>
                                            <Typography variant="subtitle2" color="text.secondary">
                                                {ticket.entityName}
                                            </Typography>
                                            <Typography variant="h6" fontWeight="bold">
                                                Ticket #{ticket.number || ticket.id}
                                            </Typography>
                                        </Box>
                                        <Chip label={ticket.deliveryStatus} color="secondary" size="small" />
                                    </Stack>

                                    {/* Contact Information */}
                                    {ticket.entities && ticket.entities.length > 0 && (
                                        <Stack spacing={0.5} sx={{ mt: 1.5, mb: 1 }}>
                                            {ticket.entities[0].phone && (
                                                <Chip
                                                    icon={<PhoneIcon />}
                                                    label={ticket.entities[0].phone}
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => window.open(`tel:${ticket.entities[0].phone}`)}
                                                    sx={{
                                                        cursor: 'pointer',
                                                        '&:hover': { bgcolor: 'action.hover' },
                                                        justifyContent: 'flex-start',
                                                        width: 'fit-content'
                                                    }}
                                                />
                                            )}
                                            {ticket.entities[0].customData && (() => {
                                                const customInfo = formatEntityInfo(ticket.entities[0]);
                                                if (customInfo) {
                                                    return (
                                                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                                                            <Chip
                                                                icon={<AddressIcon />}
                                                                label={customInfo.length > 50 ? customInfo.substring(0, 50) + '...' : customInfo}
                                                                size="small"
                                                                variant="outlined"
                                                                sx={{
                                                                    justifyContent: 'flex-start',
                                                                    maxWidth: '100%',
                                                                    '& .MuiChip-label': {
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap'
                                                                    }
                                                                }}
                                                            />
                                                            <Chip
                                                                icon={<NavigationIcon />}
                                                                label="GPS"
                                                                size="small"
                                                                color="primary"
                                                                onClick={() => {
                                                                    const address = customInfo;
                                                                    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
                                                                }}
                                                                sx={{ cursor: 'pointer' }}
                                                            />
                                                        </Stack>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </Stack>
                                    )}

                                    <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
                                        <Chip
                                            label={currency.format(ticket.remainingAmount || ticket.totalAmount || 0)}
                                            variant="outlined"
                                            size="small"
                                        />
                                        <Chip
                                            label={ticket.ageLabel}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </Stack>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        {ticket.orders?.length ? `${ticket.orders.length} producto(s)` : 'Sin productos listados'}
                                    </Typography>
                                </CardContent>
                                <Box sx={{ p: 2, pt: 0 }}>
                                    {/* Status workflow buttons */}
                                    {(() => {
                                        const quickActions = deliveryService.getQuickActions(ticket.deliveryStatus);
                                        if (quickActions.length > 0) {
                                            return (
                                                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                                                    {quickActions.map((action) => (
                                                        <Button
                                                            key={action.status}
                                                            size="small"
                                                            variant="outlined"
                                                            color={action.color}
                                                            onClick={() => handleUpdateDeliveryStatus(ticket.id, action.status)}
                                                            sx={{ flex: 1 }}
                                                        >
                                                            {action.label}
                                                        </Button>
                                                    ))}
                                                </Stack>
                                            );
                                        }
                                        return null;
                                    })()}

                                    <Button
                                        fullWidth
                                        variant="contained"
                                        onClick={() => resumeTicket(ticket)}
                                    >
                                        Continuar pedido
                                    </Button>
                                </Box>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}
        </Paper>
    );

    const renderMostrador = () => (
        <Stack spacing={2}>
            {/* Sales Summary */}
            <SalesSummaryCard departmentName={config?.departmentName} />

            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Venta de Mostrador</Typography>

                {/* Mode Selector */}
                <ToggleButtonGroup
                    value={saleMode}
                    exclusive
                    onChange={(e, newMode) => newMode && setSaleMode(newMode)}
                    fullWidth
                    sx={{ mb: 2 }}
                >
                    <ToggleButton value="quick" aria-label="venta rápida">
                        <Stack direction="row" spacing={1} alignItems="center">
                            <QuickIcon />
                            <Typography>Venta Rápida</Typography>
                        </Stack>
                    </ToggleButton>
                    <ToggleButton value="full" aria-label="venta completa">
                        <Stack direction="row" spacing={1} alignItems="center">
                            <FullMenuIcon />
                            <Typography>Venta Completa</Typography>
                        </Stack>
                    </ToggleButton>
                </ToggleButtonGroup>

                {/* Quick Sale Mode */}
                {saleMode === 'quick' && (
                    <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Selecciona productos frecuentes y cobra rápidamente.
                        </Typography>
                        <QuickSaleGrid
                            products={quickSaleProducts}
                            cart={quickCart}
                            onAddToCart={handleQuickAddToCart}
                            onRemoveFromCart={handleQuickRemoveFromCart}
                            onOpenFullMenu={() => startSale()}
                        />
                        <QuickSaleCart
                            cart={quickCart}
                            onUpdateQuantity={handleQuickUpdateQuantity}
                            onRemoveItem={handleQuickRemoveFromCart}
                            onCheckout={handleQuickCheckout}
                            onClearCart={handleQuickClearCart}
                        />
                    </Box>
                )}

                {/* Full Sale Mode */}
                {saleMode === 'full' && (
                    <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Abre el POS completo para acceder a todo el menú.
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<PosIcon />}
                            disabled={creating}
                            onClick={() => startSale()}
                            fullWidth
                        >
                            {creating ? 'Creando ticket…' : 'Nueva venta de mostrador'}
                        </Button>
                    </Box>
                )}
            </Paper>

            {renderTicketList()}

            {/* Payment Dialog for Quick Sale */}
            {currentTicketForPayment && (
                <PaymentProcessor
                    open={paymentDialogOpen}
                    onClose={() => setPaymentDialogOpen(false)}
                    ticketTotal={currentTicketForPayment.totalAmount || 0}
                    terminalId={terminalService.getTerminalId()}
                    onPaymentCompleted={handlePaymentCompleted}
                />
            )}
        </Stack>
    );

    const performClientSearch = async (term) => {
        if (!config?.entityTypeName) {
            setClientSearchError('Configura Entity Type para este modo.');
            return;
        }
        if (!term.trim()) {
            setClientSearchError('Ingresa un nombre para buscar.');
            return;
        }
        setClientSearchError(null);
        setSearchingClients(true);
        try {
            const data = await graphqlRequest(SEARCH_ENTITIES, {
                type: config.entityTypeName,
                search: term.trim()
            });
            if (isMountedRef.current) {
                setClientResults(data?.getEntities || []);
            }
        } catch (err) {
            if (isMountedRef.current) {
                setClientSearchError(err?.message || 'No se pudo buscar el cliente.');
            }
        } finally {
            if (isMountedRef.current) setSearchingClients(false);
        }
    };

    const renderReparto = () => (
        <Stack spacing={2}>
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Servicio a Domicilio</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    Selecciona o captura un cliente para asociarlo al ticket antes de abrir el POS.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Button
                        variant="contained"
                        startIcon={<DeliveryIcon />}
                        disabled={creating}
                        onClick={startDeliveryWizard}
                    >
                        {creating ? 'Abriendo pedido…' : 'Nuevo pedido a domicilio'}
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={() => handleRefreshClick(true)}
                    >
                        Refrescar lista
                    </Button>
                </Stack>
            </Paper>
            {renderDeliveryGroup('Pendientes de recoger', groupedDeliveryTickets.pendingPickup)}
            {renderDeliveryGroup('En camino', groupedDeliveryTickets.enRuta)}
        </Stack>
    );

    const renderModeContent = () => {
        switch (modeKey) {
            case 'mostrador':
                return renderMostrador();
            case 'reparto':
                return renderReparto();
            default:
                return (
                    <Alert severity="info">
                        Este modo aún no tiene una vista dedicada. Usa los accesos rápidos disponibles en POS.
                    </Alert>
                );
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
            <AppBar position="static" color="primary">
                <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                    <Box>
                        <Typography variant="h6" component="div">
                            {salesModeMeta.label || modeKey}
                        </Typography>
                        <Typography variant="body2" color="rgba(255,255,255,0.7)">
                            {config?.departmentName ? `Departamento: ${config.departmentName}` : 'Modo personalizado'}
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Button
                            color="inherit"
                            startIcon={<RefreshIcon />}
                            onClick={() => handleRefreshClick(true)}
                        >
                            Actualizar
                        </Button>
                        <Button
                            color="inherit"
                            startIcon={<ThemeIcon />}
                            onClick={toggleTheme}
                        >
                            {isDarkMode ? 'Modo claro' : 'Modo oscuro'}
                        </Button>
                        <IconButton color="inherit" onClick={(e) => setUserMenuAnchor(e.currentTarget)}>
                            <PersonIcon />
                        </IconButton>
                    </Stack>
                </Toolbar>
            </AppBar>

        <Box sx={{ p: 3, flex: 1 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
                <Chip label={`Modo: ${salesModeMeta.label || modeKey}`} color="primary" />
                {config?.departmentName && <Chip label={`Departamento: ${config.departmentName}`} />}
                {config?.ticketTypeName && <Chip label={`Ticket: ${config.ticketTypeName}`} />}
            </Stack>

            {effectiveError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {effectiveError.message || effectiveError.toString()}
                </Alert>
            )}

            {effectiveLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <CircularProgress />
                </Box>
            )}

            {renderModeContent()}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            >
                <Alert
                    onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <Dialog open={wizardOpen} onClose={() => setWizardOpen(false)} fullWidth maxWidth="md">
                <DialogTitle>Nuevo pedido a domicilio</DialogTitle>
                <DialogContent>
                    <Stepper activeStep={wizardStep} alternativeLabel sx={{ mb: 2 }}>
                        <Step><StepLabel>Cliente y Datos</StepLabel></Step>
                        <Step><StepLabel>Confirmar</StepLabel></Step>
                    </Stepper>

                    {wizardStep === 0 && (
                        <Stack spacing={2} sx={{ mt: 2 }}>
                            {/* Autocomplete for client search */}
                            <Autocomplete
                                options={clientResults}
                                loading={searchingClients}
                                value={wizardData.client}
                                onChange={(event, newValue) => {
                                    handleWizardClientSelect(newValue);
                                }}
                                onInputChange={(event, newInputValue) => {
                                    if (newInputValue.length > 2) {
                                        performClientSearch(newInputValue);
                                    }
                                }}
                                getOptionLabel={(option) => option.name || ''}
                                isOptionEqualToValue={(option, value) => option.id === value?.id}
                                renderOption={(props, option) => (
                                    <Box component="li" {...props}>
                                        <ListItemText
                                            primary={option.name}
                                            secondary={formatEntityInfo(option)}
                                        />
                                    </Box>
                                )}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Buscar cliente"
                                        placeholder="Escribe al menos 3 letras..."
                                        helperText={wizardData.client ? 'Cliente seleccionado' : 'Busca y selecciona un cliente'}
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <>
                                                    {searchingClients ? <CircularProgress color="inherit" size={20} /> : null}
                                                    {params.InputProps.endAdornment}
                                                </>
                                            ),
                                        }}
                                    />
                                )}
                                noOptionsText="No se encontraron clientes"
                                loadingText="Buscando..."
                                clearOnBlur={false}
                            />

                            {clientSearchError && (
                                <Alert severity="error">{clientSearchError}</Alert>
                            )}

                            {/* Address and details - shown after client selection */}
                            {wizardData.client && (
                                <>
                                    <Divider />
                                    <Typography variant="subtitle2" color="primary">
                                        Datos del pedido:
                                    </Typography>
                                    <TextField
                                        label="Dirección de entrega"
                                        fullWidth
                                        value={wizardData.address}
                                        onChange={(e) => setWizardData(prev => ({ ...prev, address: e.target.value }))}
                                        placeholder="Calle, número, colonia..."
                                    />
                                    <TextField
                                        label="Referencias"
                                        fullWidth
                                        value={wizardData.reference}
                                        onChange={(e) => setWizardData(prev => ({ ...prev, reference: e.target.value }))}
                                        placeholder="Entre calles, color de casa, etc..."
                                    />
                                    <TextField
                                        label="Notas adicionales"
                                        multiline
                                        rows={2}
                                        fullWidth
                                        value={wizardData.notes}
                                        onChange={(e) => setWizardData(prev => ({ ...prev, notes: e.target.value }))}
                                        placeholder="Instrucciones especiales..."
                                    />
                                </>
                            )}
                        </Stack>
                    )}

                    {wizardStep === 1 && wizardData.client && (
                        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                            <Stack spacing={2}>
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary">Cliente:</Typography>
                                    <Typography variant="h6" fontWeight="bold">{wizardData.client.name}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {formatEntityInfo(wizardData.client)}
                                    </Typography>
                                </Box>
                                <Divider />
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary">Dirección:</Typography>
                                    <Typography variant="body1">
                                        {wizardData.address || <em>Sin especificar</em>}
                                    </Typography>
                                </Box>
                                {wizardData.reference && (
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">Referencias:</Typography>
                                        <Typography variant="body2">{wizardData.reference}</Typography>
                                    </Box>
                                )}
                                {wizardData.notes && (
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">Notas:</Typography>
                                        <Typography variant="body2">{wizardData.notes}</Typography>
                                    </Box>
                                )}
                            </Stack>
                        </Paper>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setWizardOpen(false)}>Cancelar</Button>
                    {wizardStep > 0 && <Button onClick={handleWizardBack}>Regresar</Button>}
                    {wizardStep < 1 && (
                        <Button
                            variant="contained"
                            onClick={handleWizardNext}
                            disabled={!wizardData.client}
                        >
                            Siguiente
                        </Button>
                    )}
                    {wizardStep === 1 && (
                        <Button variant="contained" color="primary" onClick={handleWizardConfirm}>
                            Crear pedido
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
        <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={() => setUserMenuAnchor(null)}
        >
            <MenuItem disabled>{userDisplayName}</MenuItem>
            <Divider />
            <MenuItem onClick={() => { setUserMenuAnchor(null); handleLogout(); }}>
                <LogoutIcon fontSize="small" style={{ marginRight: 8 }} />
                Cerrar sesión
            </MenuItem>
        </Menu>
        </Box>
    );
};

export default SalesModeDashboard;
