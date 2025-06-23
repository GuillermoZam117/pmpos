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
    Divider,
    Card,
    CardContent,
    Alert,
    Chip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    IconButton,
    InputAdornment
} from '@mui/material';
import {
    AttachMoney as MoneyIcon,
    CreditCard as CardIcon,
    AccountBalance as BankIcon,
    Percent as PercentIcon,
    Add as AddIcon,
    Remove as RemoveIcon
} from '@mui/icons-material';
import { paymentService } from '../services/paymentService';
import Debug from 'debug';

const debug = Debug('pmpos:payment-dialog');

const PaymentDialog = ({ 
    open, 
    onClose, 
    ticket, 
    terminalId,
    onPaymentSuccess,
    onError 
}) => {
    // Estados principales
    const [paymentTypes, setPaymentTypes] = useState([]);
    const [selectedPaymentType, setSelectedPaymentType] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Estados para descuentos y propinas
    const [showDiscountSection, setShowDiscountSection] = useState(false);
    const [discountType, setDiscountType] = useState('percentage');
    const [discountValue, setDiscountValue] = useState('');
    const [showTipSection, setShowTipSection] = useState(false);
    const [tipAmount, setTipAmount] = useState('');
    
    // Cálculos
    const [calculations, setCalculations] = useState([]);
    const [currentTotal, setCurrentTotal] = useState(0);
    const [remainingAmount, setRemainingAmount] = useState(0);
    const [change, setChange] = useState(0);

    // Cargar datos iniciales
    useEffect(() => {
        if (open && ticket) {
            loadPaymentTypes();
            initializeAmounts();
        }
    }, [open, ticket]);

    // Actualizar cálculos cuando cambia el monto de pago
    useEffect(() => {
        if (paymentAmount && remainingAmount) {
            try {
                const validation = paymentService.validatePayment(paymentAmount, remainingAmount);
                setChange(validation.change);
                setError('');
            } catch (err) {
                setError(err.message);
                setChange(0);
            }
        } else {
            setChange(0);
        }
    }, [paymentAmount, remainingAmount]);

    const loadPaymentTypes = async () => {
        try {
            const types = await paymentService.getPaymentTypes();
            setPaymentTypes(types);
            if (types.length > 0) {
                setSelectedPaymentType(types[0].name);
            }
        } catch (error) {
            debug('❌ Error loading payment types:', error);
            setError('Error al cargar tipos de pago');
        }
    };

    const initializeAmounts = () => {
        const total = parseFloat(ticket?.totalAmount || 0);
        const remaining = parseFloat(ticket?.remainingAmount || total);
        
        setCurrentTotal(total);
        setRemainingAmount(remaining);
        setPaymentAmount(remaining.toString());
    };

    const handleRecalculate = async () => {
        if (!terminalId) return;
        
        setLoading(true);
        try {
            const result = await paymentService.recalculateTicket(terminalId, true);
            if (result.success) {
                setCurrentTotal(parseFloat(result.ticket.totalAmount));
                setRemainingAmount(parseFloat(result.ticket.remainingAmount));
                setPaymentAmount(result.ticket.remainingAmount.toString());
            }
        } catch (error) {
            debug('❌ Error recalculating:', error);
            setError('Error al recalcular ticket');
        } finally {
            setLoading(false);
        }
    };

    const handleApplyDiscount = async () => {
        if (!discountValue || !terminalId) return;
        
        setLoading(true);
        try {
            const result = await paymentService.applyDiscount(
                terminalId, 
                discountType, 
                parseFloat(discountValue)
            );
            
            if (result.success) {
                setCalculations(prev => [...prev, {
                    type: 'discount',
                    description: `Descuento ${discountType === 'percentage' ? discountValue + '%' : '$' + discountValue}`,
                    amount: discountType === 'percentage' 
                        ? -(currentTotal * parseFloat(discountValue) / 100)
                        : -Math.abs(parseFloat(discountValue))
                }]);
                
                setCurrentTotal(parseFloat(result.ticket.totalAmount));
                setRemainingAmount(parseFloat(result.ticket.remainingAmount));
                setPaymentAmount(result.ticket.remainingAmount.toString());
                setDiscountValue('');
                setShowDiscountSection(false);
            }
        } catch (error) {
            debug('❌ Error applying discount:', error);
            setError('Error al aplicar descuento');
        } finally {
            setLoading(false);
        }
    };

    const handleApplyTip = async () => {
        if (!tipAmount || !terminalId) return;
        
        setLoading(true);
        try {
            const result = await paymentService.applyTip(terminalId, parseFloat(tipAmount));
            
            if (result.success) {
                setCalculations(prev => [...prev, {
                    type: 'tip',
                    description: `Propina $${tipAmount}`,
                    amount: parseFloat(tipAmount)
                }]);
                
                setCurrentTotal(parseFloat(result.ticket.totalAmount));
                setRemainingAmount(parseFloat(result.ticket.remainingAmount));
                setPaymentAmount(result.ticket.remainingAmount.toString());
                setTipAmount('');
                setShowTipSection(false);
            }
        } catch (error) {
            debug('❌ Error applying tip:', error);
            setError('Error al aplicar propina');
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!selectedPaymentType || !paymentAmount || !terminalId) {
            setError('Por favor complete todos los campos');
            return;
        }

        setLoading(true);
        try {
            const result = await paymentService.payTicket(
                terminalId,
                selectedPaymentType,
                parseFloat(paymentAmount)
            );

            if (result.success) {
                debug('✅ Payment successful:', result);
                if (onPaymentSuccess) {
                    onPaymentSuccess(result.ticket, {
                        paymentType: selectedPaymentType,
                        amount: parseFloat(paymentAmount),
                        change: change
                    });
                }
                handleClose();
            }
        } catch (error) {
            debug('❌ Payment failed:', error);
            setError(error.message);
            if (onError) {
                onError(error);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        // Limpiar estados
        setPaymentAmount('');
        setSelectedPaymentType('');
        setError('');
        setCalculations([]);
        setDiscountValue('');
        setTipAmount('');
        setShowDiscountSection(false);
        setShowTipSection(false);
        setChange(0);
        
        if (onClose) {
            onClose();
        }
    };

    const getPaymentTypeIcon = (typeName) => {
        const lowerName = typeName.toLowerCase();
        if (lowerName.includes('efectivo')) return <MoneyIcon />;
        if (lowerName.includes('tarjeta')) return <CardIcon />;
        if (lowerName.includes('transferencia')) return <BankIcon />;
        return <MoneyIcon />;
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>
                <Typography variant="h5" component="div">
                    💳 Procesar Pago
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">
                    Ticket: {ticket?.ticketNumber || 'N/A'}
                </Typography>
            </DialogTitle>

            <DialogContent>
                <Grid container spacing={3}>
                    {/* Resumen del Ticket */}
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    📊 Resumen del Ticket
                                </Typography>
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography>Total Original:</Typography>
                                    <Typography variant="h6">
                                        {formatCurrency(ticket?.totalAmount || 0)}
                                    </Typography>
                                </Box>
                                
                                {calculations.map((calc, index) => (
                                    <Box key={index} display="flex" justifyContent="space-between" mb={1}>
                                        <Typography color="text.secondary">
                                            {calc.description}:
                                        </Typography>
                                        <Typography 
                                            color={calc.amount >= 0 ? "success.main" : "error.main"}
                                        >
                                            {formatCurrency(calc.amount)}
                                        </Typography>
                                    </Box>
                                ))}
                                
                                <Divider sx={{ my: 1 }} />
                                <Box display="flex" justifyContent="space-between" mb={2}>
                                    <Typography variant="h6">Total Actual:</Typography>
                                    <Typography variant="h6" color="primary">
                                        {formatCurrency(currentTotal)}
                                    </Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between">
                                    <Typography variant="h6">Pendiente de Pago:</Typography>
                                    <Typography variant="h6" color="error">
                                        {formatCurrency(remainingAmount)}
                                    </Typography>
                                </Box>
                                
                                <Box mt={2}>
                                    <Button 
                                        variant="outlined" 
                                        onClick={handleRecalculate}
                                        disabled={loading}
                                        fullWidth
                                    >
                                        🔄 Recalcular Ticket
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Descuentos y Propinas */}
                    <Grid item xs={12}>
                        <Box display="flex" gap={2} mb={2}>
                            <Button
                                variant={showDiscountSection ? "contained" : "outlined"}
                                startIcon={<PercentIcon />}
                                onClick={() => setShowDiscountSection(!showDiscountSection)}
                            >
                                💸 Descuento
                            </Button>
                            <Button
                                variant={showTipSection ? "contained" : "outlined"}
                                startIcon={<AddIcon />}
                                onClick={() => setShowTipSection(!showTipSection)}
                            >
                                💡 Propina
                            </Button>
                        </Box>

                        {showDiscountSection && (
                            <Card sx={{ mb: 2 }}>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>💸 Aplicar Descuento</Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <FormControl fullWidth>
                                                <InputLabel>Tipo de Descuento</InputLabel>
                                                <Select
                                                    value={discountType}
                                                    onChange={(e) => setDiscountType(e.target.value)}
                                                >
                                                    <MenuItem value="percentage">Porcentaje (%)</MenuItem>
                                                    <MenuItem value="fixed">Monto Fijo ($)</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={4}>
                                            <TextField
                                                label="Valor"
                                                type="number"
                                                value={discountValue}
                                                onChange={(e) => setDiscountValue(e.target.value)}
                                                fullWidth
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            {discountType === 'percentage' ? '%' : '$'}
                                                        </InputAdornment>
                                                    )
                                                }}
                                            />
                                        </Grid>
                                        <Grid item xs={2}>
                                            <Button
                                                variant="contained"
                                                onClick={handleApplyDiscount}
                                                disabled={!discountValue || loading}
                                                fullWidth
                                            >
                                                Aplicar
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        )}

                        {showTipSection && (
                            <Card sx={{ mb: 2 }}>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>💡 Agregar Propina</Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={10}>
                                            <TextField
                                                label="Monto de Propina"
                                                type="number"
                                                value={tipAmount}
                                                onChange={(e) => setTipAmount(e.target.value)}
                                                fullWidth
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment position="start">$</InputAdornment>
                                                    )
                                                }}
                                            />
                                        </Grid>
                                        <Grid item xs={2}>
                                            <Button
                                                variant="contained"
                                                onClick={handleApplyTip}
                                                disabled={!tipAmount || loading}
                                                fullWidth
                                            >
                                                Agregar
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        )}
                    </Grid>

                    {/* Información de Pago */}
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    💳 Información de Pago
                                </Typography>
                                
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={6}>
                                        <FormControl fullWidth>
                                            <InputLabel>Tipo de Pago</InputLabel>
                                            <Select
                                                value={selectedPaymentType}
                                                onChange={(e) => setSelectedPaymentType(e.target.value)}
                                            >
                                                {paymentTypes.map((type) => (
                                                    <MenuItem key={type.id} value={type.name}>
                                                        <Box display="flex" alignItems="center" gap={1}>
                                                            {getPaymentTypeIcon(type.name)}
                                                            {type.name}
                                                        </Box>
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            label="Monto a Pagar"
                                            type="number"
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                            fullWidth
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">$</InputAdornment>
                                                )
                                            }}
                                        />
                                    </Grid>
                                </Grid>

                                {change > 0 && (
                                    <Alert severity="info" sx={{ mt: 2 }}>
                                        <Typography variant="h6">
                                            💰 Cambio a devolver: {formatCurrency(change)}
                                        </Typography>
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose} disabled={loading}>
                    Cancelar
                </Button>
                <Button 
                    onClick={handlePayment}
                    variant="contained"
                    disabled={loading || !selectedPaymentType || !paymentAmount}
                    size="large"
                >
                    {loading ? 'Procesando...' : '💳 Procesar Pago'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PaymentDialog; 