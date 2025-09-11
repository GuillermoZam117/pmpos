import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Tab,
    Tabs,
    TextField,
    Grid,
    IconButton,
    Divider,
    Chip,
    Card,
    CardContent,
    useTheme,
    useMediaQuery,
    Paper,
    Stack,
    Fade
} from '@mui/material';
import {
    LocalAtm,
    CreditCard,
    AccountBalance,
    Receipt,
    Percent,
    Close,
    Payment,
    Assessment,
    AttachMoney,
    MonetizationOn
} from '@mui/icons-material';
import { paymentService } from '../services/paymentService';
import { terminalService } from '../services/terminalService';
import { formatMXN } from '../utils/currencyFormatter';

// Tab panel component
function TabPanel({ children, value, index, ...other }) {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`payment-tabpanel-${index}`}
            aria-labelledby={`payment-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Fade in={value === index}>
                    <Box>
                        {children}
                    </Box>
                </Fade>
            )}
        </div>
    );
}

const PaymentDialog = ({
    open,
    onClose,
    ticket,
    onPaymentSuccess = () => { },
    onPaymentError = () => { }
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Tab states
    const [currentTab, setCurrentTab] = useState(0);

    // Payment states
    const [selectedPaymentType, setSelectedPaymentType] = useState('Efectivo');
    const [amount, setAmount] = useState('');
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState({});

    // Propina states
    const [propinaType, setPropinaType] = useState('none'); // 'none', 'percentage', 'amount'
    const [propinaPercentage, setPropinaPercentage] = useState(15);
    const [propinaAmount, setPropinaAmount] = useState('');
    const [customPropinaPercentage, setCustomPropinaPercentage] = useState('');

    // Descuento states
    const [descuentoType, setDescuentoType] = useState('none'); // 'none', 'percentage', 'amount'
    const [descuentoPercentage, setDescuentoPercentage] = useState(10);
    const [descuentoAmount, setDescuentoAmount] = useState('');
    const [customDescuentoPercentage, setCustomDescuentoPercentage] = useState('');
    const [descuentoReason, setDescuentoReason] = useState('');

    // Payment type options
    const paymentTypes = [
        {
            value: 'Efectivo',
            label: 'Efectivo',
            icon: LocalAtm,
            color: 'success',
            description: 'Pago en efectivo'
        },
        {
            value: 'Tarjeta de Crédito',
            label: 'Crédito',
            icon: CreditCard,
            color: 'primary',
            description: 'Tarjeta de crédito'
        },
        {
            value: 'Tarjeta de Débito',
            label: 'Débito',
            icon: CreditCard,
            color: 'secondary',
            description: 'Tarjeta de débito'
        },
        {
            value: 'Transferencia',
            label: 'Transferencia',
            icon: AccountBalance,
            color: 'info',
            description: 'Transferencia bancaria'
        }
    ];

    // Quick percentage options
    const quickTipPercentages = [10, 15, 18, 20];
    const quickDiscountPercentages = [5, 10, 15, 20];

    // Calculate totals
    const baseAmount = ticket?.remainingAmount || ticket?.totalAmount || 0;

    const calculatedPropinaAmount = useMemo(() => {
        if (propinaType === 'percentage') {
            const percentage = customPropinaPercentage ?
                parseFloat(customPropinaPercentage) : propinaPercentage;
            return baseAmount * (percentage / 100);
        } else if (propinaType === 'amount') {
            return parseFloat(propinaAmount) || 0;
        }
        return 0;
    }, [propinaType, propinaPercentage, propinaAmount, customPropinaPercentage, baseAmount]);

    const calculatedDescuentoAmount = useMemo(() => {
        if (descuentoType === 'percentage') {
            const percentage = customDescuentoPercentage ?
                parseFloat(customDescuentoPercentage) : descuentoPercentage;
            return baseAmount * (percentage / 100);
        } else if (descuentoType === 'amount') {
            return parseFloat(descuentoAmount) || 0;
        }
        return 0;
    }, [descuentoType, descuentoPercentage, descuentoAmount, customDescuentoPercentage, baseAmount]);

    const finalAmount = baseAmount + calculatedPropinaAmount - calculatedDescuentoAmount;

    // Initialize amount when dialog opens
    useEffect(() => {
        if (open && ticket) {
            setAmount(finalAmount.toString());
        }
    }, [open, ticket, finalAmount]);

    // Update amount when calculations change
    useEffect(() => {
        setAmount(finalAmount.toString());
    }, [finalAmount]);

    // Reset form when dialog closes
    useEffect(() => {
        if (!open) {
            setCurrentTab(0);
            setSelectedPaymentType('Efectivo');
            setAmount('');
            setProcessing(false);
            setErrors({});
            setPropinaType('none');
            setPropinaPercentage(15);
            setPropinaAmount('');
            setCustomPropinaPercentage('');
            setDescuentoType('none');
            setDescuentoPercentage(10);
            setDescuentoAmount('');
            setCustomDescuentoPercentage('');
            setDescuentoReason('');
        }
    }, [open]);

    const handleTabChange = (event, newValue) => {
        setCurrentTab(newValue);
    };

    const validateForm = () => {
        const newErrors = {};

        if (!amount || parseFloat(amount) <= 0) {
            newErrors.amount = 'El monto debe ser mayor a cero';
        }

        if (parseFloat(amount) > finalAmount && selectedPaymentType !== 'EFECTIVO') {
            newErrors.amount = 'El monto no puede ser mayor al total para este tipo de pago';
        }

        if (descuentoType !== 'none' && !descuentoReason.trim()) {
            newErrors.descuentoReason = 'Debe proporcionar una razón para el descuento';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handlePayment = async () => {
        if (!validateForm()) {
            return;
        }

        // Validate required fields before calling the service
        if (!selectedPaymentType) {
            onPaymentError('Seleccione un método de pago');
            return;
        }

        const paymentAmount = parseFloat(amount);
        if (!paymentAmount || paymentAmount <= 0) {
            onPaymentError('El monto debe ser mayor que cero');
            return;
        }

        // Get terminal ID from terminalService or try to register terminal
        let terminalId = terminalService.getTerminalId();
        console.log('Initial terminalId from service:', terminalId);
        console.log('Terminal service state:', terminalService.getTerminalsState());

        if (!terminalId) {
            console.log('No terminal ID found, attempting to register terminal...');

            // Try to get current user and register terminal
            const userData = localStorage.getItem('user');
            console.log('User data from localStorage:', userData);

            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    const userName = user?.name || user?.userName || 'CAJERO';
                    console.log('Parsed user:', user, 'userName:', userName);

                    console.log('Calling terminalService.register with userName:', userName);
                    terminalId = await terminalService.register(userName);
                    console.log('Terminal registration result:', terminalId);

                    if (!terminalId) {
                        throw new Error('No se pudo registrar el terminal - el servicio retornó null/undefined');
                    }
                } catch (regError) {
                    console.error('Error registering terminal:', regError);
                    throw new Error('Error al registrar terminal: ' + regError.message);
                }
            } else {
                // Fallback: try to register with a default user
                console.log('No user data in localStorage, trying with default user CAJERO');
                try {
                    terminalId = await terminalService.register('CAJERO');
                    console.log('Default terminal registration result:', terminalId);
                    if (!terminalId) {
                        throw new Error('No se pudo registrar terminal con usuario por defecto');
                    }
                } catch (defaultRegError) {
                    console.error('Error registering with default user:', defaultRegError);
                    throw new Error('No se encontró información del usuario y no se pudo registrar terminal por defecto: ' + defaultRegError.message);
                }
            }
        }

        console.log('Final terminalId to use:', terminalId);

        console.log('Payment data before service call:', {
            terminalId,
            paymentType: selectedPaymentType,
            amount: paymentAmount,
            ticket: ticket,
            terminalIdType: typeof terminalId,
            paymentTypeType: typeof selectedPaymentType,
            amountType: typeof paymentAmount,
            terminalIdValue: terminalId,
            paymentTypeValue: selectedPaymentType,
            amountValue: paymentAmount
        });

        setProcessing(true);

        try {
            // Validate the parameters before calling the service
            if (!terminalId) {
                throw new Error('Terminal ID no está disponible');
            }
            if (!selectedPaymentType) {
                throw new Error('Método de pago no seleccionado');
            }
            if (!paymentAmount || paymentAmount <= 0) {
                throw new Error('Monto de pago inválido');
            }

            console.log('Calling payTerminalTicket with:', {
                terminalId: terminalId,
                paymentTypeName: selectedPaymentType,
                amount: paymentAmount
            });

            // Use the actual method from paymentService
            const result = await paymentService.payTerminalTicket(
                terminalId,
                selectedPaymentType,
                paymentAmount
            );

            if (result) {
                console.log('Payment result from service:', result);

                // Check if the ticket is fully paid (remainingAmount is 0 or very close to 0)
                const remainingAmount = result.remainingAmount || 0;
                const isFullyPaid = remainingAmount <= 0.01; // Allow for small rounding differences

                console.log('Remaining amount after payment:', remainingAmount, 'Is fully paid:', isFullyPaid);

                // If fully paid, close the ticket automatically
                if (isFullyPaid) {
                    console.log('💳 Ticket fully paid, closing ticket...');
                    try {
                        await paymentService.closeTerminalTicket(terminalId);
                        console.log('✅ Ticket closed successfully');
                    } catch (closeError) {
                        console.error('❌ Failed to close ticket:', closeError);
                        // Don't fail the entire payment if closing fails, just warn
                        onPaymentError(`Pago exitoso pero error al cerrar ticket: ${closeError.message}`);
                        return;
                    }
                }

                // Create the expected payment result structure
                const paymentResult = {
                    paymentType: selectedPaymentType,
                    amount: paymentAmount,
                    change: selectedPaymentType === 'Efectivo' ? Math.max(0, paymentAmount - finalAmount) : 0,
                    success: true,
                    terminalId: terminalId,
                    ticketClosed: isFullyPaid,
                    remainingAmount: remainingAmount,
                    originalResult: result
                };

                console.log('Calling onPaymentSuccess with:', paymentResult);
                onPaymentSuccess(paymentResult);
                onClose();
            } else {
                onPaymentError('Error al procesar el pago');
            }
        } catch (error) {
            console.error('Payment error:', error);
            onPaymentError(error.message || 'Error al procesar el pago');
        } finally {
            setProcessing(false);
        }
    }; const handleQuickTipPercentage = (percentage) => {
        setPropinaType('percentage');
        setPropinaPercentage(percentage);
        setCustomPropinaPercentage('');
    };

    const handleQuickDiscountPercentage = (percentage) => {
        setDescuentoType('percentage');
        setDescuentoPercentage(percentage);
        setCustomDescuentoPercentage('');
    };

    const resetPropina = () => {
        setPropinaType('none');
        setPropinaPercentage(15);
        setPropinaAmount('');
        setCustomPropinaPercentage('');
    };

    const resetDescuento = () => {
        setDescuentoType('none');
        setDescuentoPercentage(10);
        setDescuentoAmount('');
        setCustomDescuentoPercentage('');
        setDescuentoReason('');
    };

    if (!ticket) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            fullScreen={isMobile}
            PaperProps={{
                sx: {
                    borderRadius: isMobile ? 0 : 3,
                    background: theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)'
                        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${theme.palette.divider}`,
                    boxShadow: theme.palette.mode === 'dark'
                        ? '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
                        : '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                }
            }}
        >
            {/* Header */}
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 3,
                pb: 1
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Payment color="primary" />
                    <Typography variant="h5" fontWeight="bold" color="text.primary">
                        Procesar Pago
                    </Typography>
                </Box>
                <IconButton
                    onClick={onClose}
                    size="small"
                    sx={{
                        borderRadius: 2,
                        '&:hover': {
                            backgroundColor: 'action.hover',
                            transform: 'scale(1.1)'
                        }
                    }}
                >
                    <Close />
                </IconButton>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ px: 3, mb: 2 }}>
                Ticket #{ticket.number}
            </Typography>

            {/* Tabs */}
            <Box sx={{ px: 3 }}>
                <Tabs
                    value={currentTab}
                    onChange={handleTabChange}
                    sx={{
                        '& .MuiTab-root': {
                            borderRadius: 2,
                            mx: 0.5,
                            fontWeight: 600,
                            minHeight: 44
                        }
                    }}
                >
                    <Tab
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AttachMoney />
                                Pago
                            </Box>
                        }
                    />
                    <Tab
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Percent />
                                Ajustes
                            </Box>
                        }
                    />
                </Tabs>
            </Box>

            <DialogContent sx={{ p: 3, pt: 2 }}>
                {/* Payment Tab */}
                <TabPanel value={currentTab} index={0}>
                    {/* Ticket Summary */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            mb: 3,
                            borderRadius: 3,
                            background: theme.palette.mode === 'dark'
                                ? 'rgba(148, 163, 184, 0.1)'
                                : 'rgba(248, 250, 252, 0.8)',
                            border: `1px solid ${theme.palette.divider}`
                        }}
                    >
                        <Typography
                            variant="h6"
                            fontWeight="bold"
                            gutterBottom
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                mb: 2,
                                color: 'text.primary'
                            }}
                        >
                            <Assessment />
                            Resumen
                        </Typography>

                        <Stack spacing={2}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography color="text.secondary">Subtotal:</Typography>
                                <Typography fontWeight={600}>{formatMXN(baseAmount)}</Typography>
                            </Box>

                            {calculatedPropinaAmount > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography color="text.secondary">Propina:</Typography>
                                    <Typography fontWeight={600} color="success.main">
                                        +{formatMXN(calculatedPropinaAmount)}
                                    </Typography>
                                </Box>
                            )}

                            {calculatedDescuentoAmount > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography color="text.secondary">Descuento:</Typography>
                                    <Typography fontWeight={600} color="error.main">
                                        -{formatMXN(calculatedDescuentoAmount)}
                                    </Typography>
                                </Box>
                            )}

                            <Divider />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="h6" fontWeight="bold">Total:</Typography>
                                <Typography variant="h5" fontWeight="bold" color="primary.main">
                                    {formatMXN(finalAmount)}
                                </Typography>
                            </Box>
                        </Stack>
                    </Paper>

                    {/* Payment Methods - Redesigned */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            mb: 3,
                            borderRadius: 3,
                            background: theme.palette.mode === 'dark'
                                ? 'linear-gradient(135deg, rgba(66, 165, 245, 0.08) 0%, rgba(144, 202, 249, 0.05) 100%)'
                                : 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(66, 165, 245, 0.03) 100%)',
                            border: `1px solid ${theme.palette.primary.main}20`
                        }}
                    >
                        <Typography
                            variant="h6"
                            fontWeight="bold"
                            gutterBottom
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                mb: 2,
                                color: 'primary.main'
                            }}
                        >
                            <Payment />
                            Método de Pago
                        </Typography>                        <Stack spacing={1.5}>
                            {paymentTypes.map((type) => {
                                const IconComponent = type.icon;
                                const isSelected = selectedPaymentType === type.value;

                                return (
                                    <Paper
                                        key={type.value}
                                        elevation={isSelected ? 4 : 0}
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            cursor: 'pointer',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            border: isSelected
                                                ? `2px solid ${theme.palette[type.color]?.main || theme.palette.primary.main}`
                                                : `1px solid ${theme.palette.divider}`,
                                            background: isSelected
                                                ? theme.palette.mode === 'dark'
                                                    ? `linear-gradient(135deg, ${theme.palette[type.color]?.dark || theme.palette.primary.dark}15 0%, ${theme.palette[type.color]?.main || theme.palette.primary.main}08 100%)`
                                                    : `linear-gradient(135deg, ${theme.palette[type.color]?.light || theme.palette.primary.light}20 0%, ${theme.palette[type.color]?.main || theme.palette.primary.main}10 100%)`
                                                : 'transparent',
                                            '&:hover': {
                                                transform: 'translateY(-1px)',
                                                boxShadow: `0 6px 20px ${theme.palette[type.color]?.main || theme.palette.primary.main}20`,
                                                border: `1px solid ${theme.palette[type.color]?.main || theme.palette.primary.main}40`
                                            }
                                        }}
                                        onClick={() => setSelectedPaymentType(type.value)}
                                    >
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Box
                                                    sx={{
                                                        p: 1.5,
                                                        borderRadius: 2,
                                                        background: isSelected
                                                            ? `${theme.palette[type.color]?.main || theme.palette.primary.main}20`
                                                            : `${theme.palette.text.secondary}10`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    <IconComponent
                                                        sx={{
                                                            fontSize: 24,
                                                            color: isSelected
                                                                ? `${type.color}.main`
                                                                : 'text.secondary'
                                                        }}
                                                    />
                                                </Box>
                                                <Box>
                                                    <Typography
                                                        variant="subtitle1"
                                                        fontWeight={isSelected ? 600 : 500}
                                                        sx={{
                                                            color: isSelected ? 'text.primary' : 'text.secondary'
                                                        }}
                                                    >
                                                        {type.label}
                                                    </Typography>
                                                    {type.description && (
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            sx={{ display: 'block', fontSize: '0.75rem' }}
                                                        >
                                                            {type.description}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Box>

                                            {isSelected && (
                                                <Box
                                                    sx={{
                                                        width: 20,
                                                        height: 20,
                                                        borderRadius: '50%',
                                                        background: `linear-gradient(135deg, ${theme.palette[type.color]?.main || theme.palette.primary.main} 0%, ${theme.palette[type.color]?.dark || theme.palette.primary.dark} 100%)`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    <Typography
                                                        sx={{
                                                            color: 'white',
                                                            fontSize: '12px',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        ✓
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Box>
                                    </Paper>
                                );
                            })}
                        </Stack>
                    </Paper>

                    {/* Amount Input - Enhanced */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            mb: 2,
                            borderRadius: 3,
                            background: theme.palette.mode === 'dark'
                                ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, rgba(129, 199, 132, 0.05) 100%)'
                                : 'linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(129, 199, 132, 0.03) 100%)',
                            border: `1px solid ${theme.palette.success.main}20`
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <MonetizationOn color="success" />
                            <Typography variant="h6" fontWeight="bold" color="success.main">
                                Monto a Cobrar
                            </Typography>
                        </Box>

                        <TextField
                            fullWidth
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            error={!!errors.amount}
                            helperText={errors.amount}
                            placeholder="0.00"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3,
                                    fontSize: { xs: '1.5rem', sm: '2rem' },
                                    fontWeight: 700,
                                    minHeight: { xs: '60px', sm: '80px' },
                                    background: theme.palette.background.paper,
                                    '&:hover': {
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderColor: theme.palette.success.main
                                        }
                                    },
                                    '&.Mui-focused': {
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderColor: theme.palette.success.main,
                                            borderWidth: '2px'
                                        }
                                    }
                                },
                                '& .MuiInputLabel-root': {
                                    fontSize: '1.1rem',
                                    '&.Mui-focused': {
                                        color: theme.palette.success.main
                                    }
                                }
                            }}
                            InputProps={{
                                startAdornment: (
                                    <Typography
                                        sx={{
                                            mr: 1,
                                            fontWeight: 700,
                                            fontSize: { xs: '1.5rem', sm: '2rem' },
                                            color: 'success.main'
                                        }}
                                    >
                                        $
                                    </Typography>
                                )
                            }}
                        />
                    </Paper>

                    {selectedPaymentType === 'Efectivo' && parseFloat(amount) > finalAmount && (
                        <Paper
                            sx={{
                                p: 2,
                                borderRadius: 2,
                                background: 'rgba(76, 175, 80, 0.1)',
                                border: '1px solid rgba(76, 175, 80, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}
                        >
                            <LocalAtm color="success" />
                            <Typography variant="body2" color="success.main" fontWeight={600}>
                                Cambio: {formatMXN(parseFloat(amount) - finalAmount)}
                            </Typography>
                        </Paper>
                    )}
                </TabPanel>

                {/* Adjustments Tab */}
                <TabPanel value={currentTab} index={1}>
                    {/* Propina Section */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            mb: 3,
                            borderRadius: 3,
                            background: 'rgba(76, 175, 80, 0.05)',
                            border: '1px solid rgba(76, 175, 80, 0.2)'
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
                                <Percent color="success" />
                                <Typography variant="h6" fontWeight="bold">
                                    Propina
                                </Typography>
                            </Box>
                            {propinaType !== 'none' && (
                                <Button
                                    size="small"
                                    onClick={resetPropina}
                                    color="error"
                                    variant="outlined"
                                    sx={{ borderRadius: 2 }}
                                >
                                    Quitar
                                </Button>
                            )}
                        </Box>

                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Porcentajes rápidos:
                                </Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                    {quickTipPercentages.map((percentage) => (
                                        <Chip
                                            key={percentage}
                                            label={`${percentage}%`}
                                            onClick={() => handleQuickTipPercentage(percentage)}
                                            color={propinaType === 'percentage' &&
                                                propinaPercentage === percentage &&
                                                !customPropinaPercentage ?
                                                'success' : 'default'}
                                            variant={propinaType === 'percentage' &&
                                                propinaPercentage === percentage &&
                                                !customPropinaPercentage ? 'filled' : 'outlined'}
                                            sx={{ borderRadius: 2 }}
                                        />
                                    ))}
                                </Stack>
                            </Box>

                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="% Personalizado"
                                        type="number"
                                        value={customPropinaPercentage}
                                        onChange={(e) => {
                                            setCustomPropinaPercentage(e.target.value);
                                            if (e.target.value) {
                                                setPropinaType('percentage');
                                            }
                                        }}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                        InputProps={{
                                            endAdornment: <Percent fontSize="small" />
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Monto fijo"
                                        type="number"
                                        value={propinaAmount}
                                        onChange={(e) => {
                                            setPropinaAmount(e.target.value);
                                            if (e.target.value) {
                                                setPropinaType('amount');
                                            }
                                        }}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                        InputProps={{
                                            startAdornment: <Typography sx={{ mr: 0.5 }}>$</Typography>
                                        }}
                                    />
                                </Grid>
                            </Grid>

                            {calculatedPropinaAmount > 0 && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Percent color="success" fontSize="small" />
                                    <Typography variant="body2" color="success.main" fontWeight={600}>
                                        Propina calculada: {formatMXN(calculatedPropinaAmount)}
                                    </Typography>
                                </Box>
                            )}
                        </Stack>
                    </Paper>

                    {/* Descuento Section */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            borderRadius: 3,
                            background: 'rgba(244, 67, 54, 0.05)',
                            border: '1px solid rgba(244, 67, 54, 0.2)'
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
                                <LocalAtm color="error" />
                                <Typography variant="h6" fontWeight="bold">
                                    Descuento
                                </Typography>
                            </Box>
                            {descuentoType !== 'none' && (
                                <Button
                                    size="small"
                                    onClick={resetDescuento}
                                    color="error"
                                    variant="outlined"
                                    sx={{ borderRadius: 2 }}
                                >
                                    Quitar
                                </Button>
                            )}
                        </Box>

                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Porcentajes rápidos:
                                </Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                    {quickDiscountPercentages.map((percentage) => (
                                        <Chip
                                            key={percentage}
                                            label={`${percentage}%`}
                                            onClick={() => handleQuickDiscountPercentage(percentage)}
                                            color={descuentoType === 'percentage' &&
                                                descuentoPercentage === percentage &&
                                                !customDescuentoPercentage ?
                                                'error' : 'default'}
                                            variant={descuentoType === 'percentage' &&
                                                descuentoPercentage === percentage &&
                                                !customDescuentoPercentage ? 'filled' : 'outlined'}
                                            sx={{ borderRadius: 2 }}
                                        />
                                    ))}
                                </Stack>
                            </Box>

                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="% Personalizado"
                                        type="number"
                                        value={customDescuentoPercentage}
                                        onChange={(e) => {
                                            setCustomDescuentoPercentage(e.target.value);
                                            if (e.target.value) {
                                                setDescuentoType('percentage');
                                            }
                                        }}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                        InputProps={{
                                            endAdornment: <Percent fontSize="small" />
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Monto fijo"
                                        type="number"
                                        value={descuentoAmount}
                                        onChange={(e) => {
                                            setDescuentoAmount(e.target.value);
                                            if (e.target.value) {
                                                setDescuentoType('amount');
                                            }
                                        }}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                        InputProps={{
                                            startAdornment: <Typography sx={{ mr: 0.5 }}>$</Typography>
                                        }}
                                    />
                                </Grid>
                            </Grid>

                            {descuentoType !== 'none' && (
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Motivo del descuento"
                                    value={descuentoReason}
                                    onChange={(e) => setDescuentoReason(e.target.value)}
                                    error={!!errors.descuentoReason}
                                    helperText={errors.descuentoReason}
                                    required
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                />
                            )}

                            {calculatedDescuentoAmount > 0 && (
                                <Typography variant="body2" color="error.main" fontWeight={600}>
                                    ✅ Descuento calculado: -{formatMXN(calculatedDescuentoAmount)}
                                </Typography>
                            )}
                        </Stack>
                    </Paper>
                </TabPanel>
            </DialogContent>

            <DialogActions sx={{
                p: 3,
                pt: 1,
                gap: 2,
                borderTop: `1px solid ${theme.palette.divider}`
            }}>
                <Button
                    onClick={onClose}
                    disabled={processing}
                    variant="outlined"
                    sx={{
                        borderRadius: 3,
                        px: 3,
                        py: 1.5,
                        fontWeight: 600
                    }}
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handlePayment}
                    variant="contained"
                    disabled={processing || finalAmount <= 0}
                    size="large"
                    startIcon={<LocalAtm />}
                    sx={{
                        borderRadius: 3,
                        px: 4,
                        py: 1.5,
                        fontWeight: 700,
                        fontSize: '1rem',
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 8px 25px rgba(37, 99, 235, 0.4)'
                        },
                        '&:disabled': {
                            background: 'rgba(148, 163, 184, 0.3)',
                            transform: 'none',
                            boxShadow: 'none'
                        }
                    }}
                >
                    {processing ? 'Procesando...' : `Cobrar ${formatMXN(finalAmount)}`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PaymentDialog;
