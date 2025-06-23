import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    Typography,
    Box,
    IconButton,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Divider,
    Chip,
    InputAdornment
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Save as SaveIcon,
    Close as CloseIcon,
    Add as AddIcon,
    Remove as RemoveIcon,
    RestaurantMenu as PortionIcon
} from '@mui/icons-material';
import { orderService } from '../services/orderService';
import Debug from 'debug';

const debug = Debug('pmpos:order-edit');

const OrderEditDialog = ({ 
    open, 
    onClose, 
    order, 
    terminalId,
    onOrderUpdated,
    onOrderDeleted,
    onError,
    availablePortions = []
}) => {
    // Estados para edición
    const [editedQuantity, setEditedQuantity] = useState('');
    const [editedPrice, setEditedPrice] = useState('');
    const [editedPortion, setEditedPortion] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hasChanges, setHasChanges] = useState(false);

    // Inicializar valores cuando se abre el diálogo
    useEffect(() => {
        if (open && order) {
            setEditedQuantity(order.quantity?.toString() || '1');
            setEditedPrice(order.price?.toString() || '0');
            setEditedPortion(order.portion || 'Normal');
            setError('');
            setHasChanges(false);
        }
    }, [open, order]);

    // Detectar cambios
    useEffect(() => {
        if (order) {
            const quantityChanged = parseFloat(editedQuantity) !== parseFloat(order.quantity);
            const priceChanged = parseFloat(editedPrice) !== parseFloat(order.price);
            const portionChanged = editedPortion !== (order.portion || 'Normal');
            
            setHasChanges(quantityChanged || priceChanged || portionChanged);
        }
    }, [editedQuantity, editedPrice, editedPortion, order]);

    const handleQuantityChange = (increment) => {
        const currentQuantity = parseFloat(editedQuantity) || 0;
        const newQuantity = Math.max(0.5, currentQuantity + increment);
        setEditedQuantity(newQuantity.toString());
    };

    const handleSaveChanges = async () => {
        if (!order?.uid || !terminalId) {
            setError('Información de orden incompleta');
            return;
        }

        setLoading(true);
        try {
            // Validar datos
            orderService.validateOrderData({
                quantity: editedQuantity,
                price: editedPrice,
                productName: order.name
            });

            let updatePromises = [];

            // Actualizar cantidad y/o precio si cambiaron
            const quantityChanged = parseFloat(editedQuantity) !== parseFloat(order.quantity);
            const priceChanged = parseFloat(editedPrice) !== parseFloat(order.price);
            
            if (quantityChanged || priceChanged) {
                const quantity = quantityChanged ? editedQuantity : null;
                const price = priceChanged ? editedPrice : null;
                
                updatePromises.push(
                    orderService.updateOrder(terminalId, order.uid, quantity, price)
                );
            }

            // Actualizar porción si cambió
            const portionChanged = editedPortion !== (order.portion || 'Normal');
            if (portionChanged) {
                updatePromises.push(
                    orderService.updateOrderPortion(terminalId, order.uid, editedPortion)
                );
            }

            // Ejecutar todas las actualizaciones
            if (updatePromises.length > 0) {
                const results = await Promise.all(updatePromises);
                debug('✅ Order updates completed:', results);

                // Notificar cambios
                if (onOrderUpdated) {
                    const updatedOrder = {
                        ...order,
                        quantity: parseFloat(editedQuantity),
                        price: parseFloat(editedPrice),
                        portion: editedPortion
                    };
                    onOrderUpdated(updatedOrder);
                }

                handleClose();
            }
        } catch (error) {
            debug('❌ Error updating order:', error);
            setError(error.message);
            if (onError) {
                onError(error);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteOrder = async () => {
        if (!order?.uid || !terminalId) {
            setError('Información de orden incompleta');
            return;
        }

        if (!window.confirm('¿Estás seguro de que quieres eliminar esta orden?')) {
            return;
        }

        setLoading(true);
        try {
            const result = await orderService.cancelOrder(terminalId, order.uid);
            
            if (result.success) {
                debug('✅ Order deleted successfully');
                if (onOrderDeleted) {
                    onOrderDeleted(order);
                }
                handleClose();
            }
        } catch (error) {
            debug('❌ Error deleting order:', error);
            setError(error.message);
            if (onError) {
                onError(error);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setEditedQuantity('');
        setEditedPrice('');
        setEditedPortion('');
        setError('');
        setHasChanges(false);
        if (onClose) onClose();
    };

    const calculateNewTotal = () => {
        const quantity = parseFloat(editedQuantity) || 0;
        const price = parseFloat(editedPrice) || 0;
        return quantity * price;
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount);
    };

    if (!order) return null;

    return (
        <Dialog 
            open={open} 
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Typography variant="h6" component="div">
                            📝 Editar Orden
                        </Typography>
                        <Typography variant="subtitle2" color="text.secondary">
                            {order.name}
                        </Typography>
                    </Box>
                    <IconButton onClick={handleClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent>
                <Grid container spacing={3}>
                    {/* Información actual */}
                    <Grid item xs={12}>
                        <Box sx={{ 
                            bgcolor: 'grey.50', 
                            p: 2, 
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'grey.200'
                        }}>
                            <Typography variant="h6" gutterBottom>📊 Valores Actuales</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={4}>
                                    <Typography variant="body2" color="text.secondary">Cantidad</Typography>
                                    <Typography variant="h6">{order.quantity}</Typography>
                                </Grid>
                                <Grid item xs={4}>
                                    <Typography variant="body2" color="text.secondary">Precio Unit.</Typography>
                                    <Typography variant="h6">{formatCurrency(order.price)}</Typography>
                                </Grid>
                                <Grid item xs={4}>
                                    <Typography variant="body2" color="text.secondary">Total</Typography>
                                    <Typography variant="h6" color="primary">
                                        {formatCurrency(order.quantity * order.price)}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Box>
                    </Grid>

                    {/* Edición de cantidad */}
                    <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom>🔢 Cantidad</Typography>
                        <Box display="flex" alignItems="center" gap={2}>
                            <IconButton 
                                onClick={() => handleQuantityChange(-0.5)}
                                disabled={loading || parseFloat(editedQuantity) <= 0.5}
                                color="error"
                            >
                                <RemoveIcon />
                            </IconButton>
                            <TextField
                                type="number"
                                value={editedQuantity}
                                onChange={(e) => setEditedQuantity(e.target.value)}
                                inputProps={{ min: 0.5, step: 0.5 }}
                                sx={{ width: 120 }}
                                disabled={loading}
                            />
                            <IconButton 
                                onClick={() => handleQuantityChange(0.5)}
                                disabled={loading}
                                color="success"
                            >
                                <AddIcon />
                            </IconButton>
                        </Box>
                    </Grid>

                    {/* Edición de precio */}
                    <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom>💰 Precio Unitario</Typography>
                        <TextField
                            type="number"
                            value={editedPrice}
                            onChange={(e) => setEditedPrice(e.target.value)}
                            fullWidth
                            inputProps={{ min: 0, step: 0.01 }}
                            InputProps={{
                                startAdornment: <InputAdornment position="start">$</InputAdornment>
                            }}
                            disabled={loading}
                        />
                    </Grid>

                    {/* Edición de porción */}
                    {availablePortions.length > 0 && (
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>🍽️ Porción</Typography>
                            <FormControl fullWidth disabled={loading}>
                                <InputLabel>Porción</InputLabel>
                                <Select
                                    value={editedPortion}
                                    onChange={(e) => setEditedPortion(e.target.value)}
                                    startAdornment={<PortionIcon sx={{ mr: 1 }} />}
                                >
                                    <MenuItem value="Normal">Normal</MenuItem>
                                    {availablePortions.map((portion) => (
                                        <MenuItem key={portion.id} value={portion.name}>
                                            {portion.name} - {formatCurrency(portion.price)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    )}

                    {/* Nuevo total */}
                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="h6">Nuevo Total:</Typography>
                            <Typography 
                                variant="h5" 
                                color={hasChanges ? "success.main" : "text.primary"}
                                sx={{ fontWeight: 'bold' }}
                            >
                                {formatCurrency(calculateNewTotal())}
                            </Typography>
                        </Box>
                        {hasChanges && (
                            <Chip 
                                label="Cambios pendientes" 
                                color="warning" 
                                size="small" 
                                sx={{ mt: 1 }}
                            />
                        )}
                    </Grid>

                    {/* Estados de la orden */}
                    <Grid item xs={12}>
                        <Box display="flex" gap={1} flexWrap="wrap">
                            {order.isExisting && (
                                <Chip 
                                    label="ENVIADO A COCINA" 
                                    color="success" 
                                    size="small"
                                    variant="outlined"
                                />
                            )}
                            {!order.isExisting && (
                                <Chip 
                                    label="NUEVO" 
                                    color="warning" 
                                    size="small"
                                    variant="outlined"
                                />
                            )}
                            {order.orderTags && order.orderTags.length > 0 && (
                                <Chip 
                                    label={`${order.orderTags.length} ETIQUETAS`} 
                                    color="info" 
                                    size="small"
                                    variant="outlined"
                                />
                            )}
                        </Box>
                    </Grid>
                </Grid>

                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}
            </DialogContent>

            <DialogActions>
                <Button 
                    onClick={handleDeleteOrder}
                    color="error"
                    startIcon={<DeleteIcon />}
                    disabled={loading}
                >
                    Eliminar
                </Button>
                <Box flex={1} />
                <Button onClick={handleClose} disabled={loading}>
                    Cancelar
                </Button>
                <Button 
                    onClick={handleSaveChanges}
                    variant="contained"
                    disabled={loading || !hasChanges}
                    startIcon={<SaveIcon />}
                >
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default OrderEditDialog; 