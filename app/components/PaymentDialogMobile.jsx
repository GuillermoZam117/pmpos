import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Box,
    Card,
    CardContent,
    Grid,
    Chip,
    IconButton,
    useTheme,
    useMediaQuery,
    InputAdornment,
    Slide,
    Stack
} from '@mui/material';
import {
    AttachMoney as MoneyIcon,
    CreditCard as CardIcon,
    AccountBalance as BankIcon,
    Close as CloseIcon,
    CheckCircle as CheckIcon
} from '@mui/icons-material';
import { paymentService } from '../services/paymentService';
import Debug from 'debug';

const debug = Debug('pmpos:payment-dialog-mobile');

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const PaymentDialogMobile = ({
    open,
    onClose,
    ticket,
    terminalId,
    onPaymentSuccess,
    onError
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Estados principales
    const [paymentTypes, setPaymentTypes] = useState([]);
    const [selectedPaymentType, setSelectedPaymentType] = useState('Efectivo');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [change, setChange] = useState(0);

    // Cálculos
    const totalAmount = parseFloat(ticket?.totalAmount || 0);
    const remainingAmount = parseFloat(ticket?.remainingAmount || totalAmount);
    const paymentValue = parseFloat(paymentAmount) || 0;

    // Cargar tipos de pago
    useEffect(() => {
        const loadPaymentTypes = async () => {
            try {
                const types = await paymentService.getPaymentTypes();
                setPaymentTypes(types);
                if (types.length > 0) {
                    setSelectedPaymentType(types[0].name);
                }
            } catch (error) {
                debug('Error loading payment types:', error);
                // Usar tipos por defecto
                setPaymentTypes([
                    { id: 1, name: 'Efectivo' },
                    { id: 2, name: 'Tarjeta' }
                ]);
            }
        };

        if (open) {
            loadPaymentTypes();
            setPaymentAmount(remainingAmount.toString());
        }
    }, [open, remainingAmount]);

    // Validar pago cuando cambia el monto
    useEffect(() => {
        if (paymentAmount && remainingAmount) {
            try {
                const validation = paymentService.validatePayment(paymentValue, remainingAmount);
                setChange(validation.change);
                setError('');
            } catch (err) {
                setError(err.message);
                setChange(0);
            }
        }
    }, [paymentAmount, paymentValue, remainingAmount]);

    const handlePayment = async () => {
        if (!selectedPaymentType || !paymentValue) {
            setError('Seleccione tipo de pago y monto');
            return;
        }

        if (paymentValue <= 0) {
            setError('El monto debe ser mayor que cero');
            return;
        }

        try {
            setLoading(true);
            setError('');

            const result = await paymentService.payTerminalTicket(
                terminalId,
                selectedPaymentType,
                paymentValue
            );

            debug('Payment successful:', result);

            if (onPaymentSuccess) {
                await onPaymentSuccess({
                    paymentType: selectedPaymentType,
                    amount: paymentValue,
                    change: change,
                    result: result
                });
            }

            onClose();
        } catch (error) {
            debug('Payment failed:', error);
            setError(error.message || 'Error al procesar el pago');
            if (onError) {
                onError(error);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setPaymentAmount('');
            setError('');
            setChange(0);
            onClose();
        }
    };

    const quickAmountButtons = [
        { label: 'Exacto', value: remainingAmount },
        { label: '$100', value: Math.max(100, remainingAmount) },
        { label: '$200', value: Math.max(200, remainingAmount) },
        { label: '$500', value: Math.max(500, remainingAmount) }
    ];

    const formatMXN = (amount) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount);
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            TransitionComponent={Transition}
            fullScreen={isMobile}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: isMobile ? 0 : 2,
                    m: isMobile ? 0 : 2
                }
            }}
        >
            <DialogTitle sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                pb: 1
            }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    💳 Procesar Pago
                </Typography>
                <IconButton onClick={handleClose} disabled={loading}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ px: 3, py: 2 }}>
                {/* Resumen del Ticket */}
                <Card sx={{ mb: 3, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.100' }}>
                    <CardContent sx={{ py: 2 }}>
                        <Typography variant="subtitle2" color="primary.main" gutterBottom>
                            📊 Resumen del Ticket
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary">
                                    Total Original:
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                    {formatMXN(totalAmount)}
                                </Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary">
                                    Pendiente de Pago:
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 600, color: 'error.main' }}>
                                    {formatMXN(remainingAmount)}
                                </Typography>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>

                {/* Tipos de Pago */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                        💳 Método de Pago
                    </Typography>
                    <Grid container spacing={1}>
                        {paymentTypes.map((type) => (
                            <Grid item xs={6} key={type.id}>
                                <Button
                                    variant={selectedPaymentType === type.name ? "contained" : "outlined"}
                                    fullWidth
                                    size="large"
                                    onClick={() => setSelectedPaymentType(type.name)}
                                    startIcon={
                                        type.name.toLowerCase().includes('efectivo') ? <MoneyIcon /> :
                                            type.name.toLowerCase().includes('tarjeta') ? <CardIcon /> :
                                                <BankIcon />
                                    }
                                    sx={{
                                        py: 1.5,
                                        textTransform: 'none',
                                        fontWeight: 500
                                    }}
                                >
                                    {type.name}
                                </Button>
                            </Grid>
                        ))}
                    </Grid>
                </Box>

                {/* Monto de Pago */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                        💰 Monto a Pagar
                    </Typography>

                    {/* Botones de Monto Rápido */}
                    <Grid container spacing={1} sx={{ mb: 2 }}>
                        {quickAmountButtons.map((btn, index) => (
                            <Grid item xs={3} key={index}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    onClick={() => setPaymentAmount(btn.value.toString())}
                                    sx={{
                                        fontSize: '0.75rem',
                                        py: 0.5,
                                        minHeight: 32
                                    }}
                                >
                                    {btn.label}
                                </Button>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Input de Monto */}
                    <TextField
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        fullWidth
                        size="large"
                        InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            sx: {
                                fontSize: '1.25rem',
                                fontWeight: 600,
                                '& input': { textAlign: 'right' }
                            }
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: 'background.paper',
                                '& fieldset': { borderWidth: 2 }
                            }
                        }}
                    />
                </Box>

                {/* Cambio */}
                {change > 0 && (
                    <Card sx={{ mb: 2, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
                        <CardContent sx={{ py: 2 }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <CheckIcon color="success" />
                                <Box>
                                    <Typography variant="subtitle2" color="success.main">
                                        Cambio a Devolver
                                    </Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.dark' }}>
                                        {formatMXN(change)}
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                )}

                {/* Error */}
                {error && (
                    <Typography color="error" variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
                        {error}
                    </Typography>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button
                    onClick={handleClose}
                    disabled={loading}
                    variant="outlined"
                    size="large"
                    sx={{ mr: 2, minWidth: 100 }}
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handlePayment}
                    disabled={loading || !paymentValue || paymentValue <= 0}
                    variant="contained"
                    size="large"
                    sx={{
                        minWidth: 140,
                        fontWeight: 600,
                        backgroundColor: 'success.main',
                        '&:hover': { backgroundColor: 'success.dark' }
                    }}
                >
                    {loading ? 'Procesando...' : `Pagar ${formatMXN(paymentValue)}`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PaymentDialogMobile;
