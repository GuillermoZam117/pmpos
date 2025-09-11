/**
 * Componente unificado de procesamiento de pagos
 * Inspirado en SambaPOS pero con diseño moderno y dark mode
 * Layout: Keypad + Métodos de Pago + Propinas/Descuentos + Botón Cobrar
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    IconButton,
    useTheme,
    useMediaQuery,
    Paper,
    Stack,
    Chip,
    Divider,
    Fade,
    Zoom,
    CircularProgress
} from '@mui/material';
import {
    Close as CloseIcon,
    LocalAtm as CashIcon,
    CreditCard as CardIcon,
    AccountBalance as BankIcon,
    Receipt as ReceiptIcon,
    Backspace as BackspaceIcon,
    Payment as PaymentIcon,
    MonetizationOn as MoneyIcon
} from '@mui/icons-material';

import { paymentService } from '../services/paymentService';
import { formatMXN } from '../utils/currencyFormatter';
import { executePrintJobAsync } from '../queries';
import Debug from 'debug';

const debug = Debug('pmpos:payment-processor');

const PaymentProcessor = ({
    open,
    onClose,
    ticketTotal,
    terminalId,
    onPaymentCompleted
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();

    // Estados del componente
    const [enteredAmount, setEnteredAmount] = useState('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('Efectivo');
    const [tipPercentage, setTipPercentage] = useState(0);
    const [discountPercentage, setDiscountPercentage] = useState(0);
    const [customTip, setCustomTip] = useState(0);
    const [customDiscount, setCustomDiscount] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [paymentResult, setPaymentResult] = useState(null);
    const [cardLastFour, setCardLastFour] = useState('');
    const [autoTipForCard, setAutoTipForCard] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState([
        // Tipos de pago por defecto mientras cargan los reales
        { name: 'Efectivo', icon: CashIcon, color: '#4CAF50' },
        { name: 'Tarjeta', icon: CardIcon, color: '#2196F3' },
        { name: 'Mixto', icon: PaymentIcon, color: '#FF9800' },
        { name: 'Cuenta', icon: BankIcon, color: '#9C27B0' }
    ]);

    // Métodos de pago disponibles - ahora dinámicos
    // (movido a useState arriba)

    // Opciones de propina y descuento
    const tipOptions = [10, 15, 20];
    const discountOptions = [5, 10, 15];

    // Cálculos automáticos
    const calculatedTip = useMemo(() => {
        if (customTip > 0) return customTip;
        return (ticketTotal * tipPercentage) / 100;
    }, [ticketTotal, tipPercentage, customTip]);

    const calculatedDiscount = useMemo(() => {
        if (customDiscount > 0) return customDiscount;
        return (ticketTotal * discountPercentage) / 100;
    }, [ticketTotal, discountPercentage, customDiscount]);

    const finalTotal = useMemo(() => {
        return Math.max(0, ticketTotal + calculatedTip - calculatedDiscount);
    }, [ticketTotal, calculatedTip, calculatedDiscount]);

    const calculatedChange = useMemo(() => {
        const entered = parseFloat(enteredAmount) || 0;
        return Math.max(0, entered - finalTotal);
    }, [enteredAmount, finalTotal]);

    // Cargar tipos de pago reales de SambaPOS
    useEffect(() => {
        const loadPaymentTypes = async () => {
            try {
                debug('📋 Cargando tipos de pago de SambaPOS...');
                const types = await paymentService.getPaymentTypes();

                if (types && types.length > 0) {
                    const mappedTypes = types.map(type => {
                        // Mapear iconos y colores basados en el nombre
                        let icon = PaymentIcon;
                        let color = '#2196F3';

                        const name = type.name.toLowerCase();
                        if (name.includes('efectivo') || name.includes('cash')) {
                            icon = CashIcon;
                            color = '#4CAF50';
                        } else if (name.includes('tarjeta') || name.includes('card') || name.includes('débito') || name.includes('crédito')) {
                            icon = CardIcon;
                            color = '#2196F3';
                        } else if (name.includes('transferencia') || name.includes('transfer')) {
                            icon = BankIcon;
                            color = '#9C27B0';
                        } else if (name.includes('mixto') || name.includes('mixed')) {
                            icon = PaymentIcon;
                            color = '#FF9800';
                        }

                        return {
                            name: type.name,
                            icon,
                            color,
                            id: type.id
                        };
                    });

                    setPaymentMethods(mappedTypes);
                    debug('✅ Tipos de pago cargados:', mappedTypes.length);
                }
            } catch (error) {
                debug('⚠️ Error cargando tipos de pago, usando defaults:', error);
                // Los tipos por defecto ya están configurados en useState
            }
        };

        if (open) {
            loadPaymentTypes();
        }
    }, [open]);

    // Detectar si el método de pago seleccionado es una tarjeta
    const isCardPayment = useMemo(() => {
        const method = selectedPaymentMethod.toLowerCase();
        return method.includes('tarjeta') || method.includes('card') || method.includes('crédito') || method.includes('débito');
    }, [selectedPaymentMethod]);

    // Validar si se puede procesar el pago
    const canProcessPayment = useMemo(() => {
        if (processing || finalTotal <= 0) return false;

        // Si es pago con tarjeta, validar campos adicionales
        if (isCardPayment) {
            return cardLastFour.length === 4;
        }

        return true;
    }, [processing, finalTotal, isCardPayment, cardLastFour]);

    // Limpiar estado al abrir
    useEffect(() => {
        if (open) {
            setEnteredAmount('');
            setSelectedPaymentMethod('Efectivo');
            setTipPercentage(0);
            setDiscountPercentage(0);
            setCustomTip(0);
            setCustomDiscount(0);
            setProcessing(false);
            setPaymentSuccess(false);
            setPaymentResult(null);
            setCardLastFour('');
            setAutoTipForCard(false);
        }
    }, [open]);

    // Handlers del keypad numérico
    const handleKeypadPress = useCallback((key) => {
        if (key === 'limpiar') {
            setEnteredAmount('');
        } else if (key === 'borrar') {
            setEnteredAmount(prev => prev.slice(0, -1));
        } else {
            setEnteredAmount(prev => {
                const newValue = prev + key;
                // Validar que sea un número válido
                if (isNaN(parseFloat(newValue))) return prev;
                return newValue;
            });
        }
    }, []);

    // Handler de propina
    const handleTipSelect = useCallback((percentage) => {
        if (tipPercentage === percentage) {
            setTipPercentage(0);
            setCustomTip(0);
        } else {
            setTipPercentage(percentage);
            setCustomTip(0);
        }
    }, [tipPercentage]);

    // Handler de descuento
    const handleDiscountSelect = useCallback((percentage) => {
        if (discountPercentage === percentage) {
            setDiscountPercentage(0);
            setCustomDiscount(0);
        } else {
            setDiscountPercentage(percentage);
            setCustomDiscount(0);
        }
    }, [discountPercentage]);

    // Handler del procesamiento de pago
    const handleProcessPayment = useCallback(async () => {
        if (processing) return;

        try {
            setProcessing(true);
            debug('💳 Procesando pago:', {
                method: selectedPaymentMethod,
                amount: finalTotal,
                tip: calculatedTip,
                discount: calculatedDiscount,
                enteredAmount: parseFloat(enteredAmount) || 0
            });

            // Aplicar propina si existe
            if (calculatedTip > 0) {
                await paymentService.applyTip(terminalId, calculatedTip);
            }

            // Aplicar descuento si existe
            if (calculatedDiscount > 0) {
                await paymentService.applyDiscount(terminalId, calculatedDiscount);
            }

            // Procesar el pago
            const paymentResult = await paymentService.payTerminalTicket(
                terminalId,
                selectedPaymentMethod,
                finalTotal
            );

            debug('✅ Pago procesado exitosamente:', paymentResult);

            // Preparar resultado para el modal de éxito
            const result = {
                paymentMethod: selectedPaymentMethod,
                amount: finalTotal,
                tip: calculatedTip,
                discount: calculatedDiscount,
                change: calculatedChange,
                result: paymentResult
            };

            setPaymentResult(result);
            setPaymentSuccess(true);

        } catch (error) {
            debug('❌ Error procesando pago:', error);

            // Mostrar error específico al usuario
            let errorMessage = 'Error procesando pago';
            if (error.message?.includes('401')) {
                errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
            } else if (error.message?.includes('400')) {
                errorMessage = 'Datos de pago inválidos. Verifica la información.';
            } else if (isCardPayment && !cardLastFour) {
                errorMessage = 'Por favor, ingresa los últimos 4 dígitos de la tarjeta.';
            }

            alert(errorMessage); // TODO: Reemplazar con un modal más elegante
        } finally {
            setProcessing(false);
        }
    }, [
        processing, selectedPaymentMethod, finalTotal, calculatedTip,
        calculatedDiscount, enteredAmount, calculatedChange, terminalId,
        onPaymentCompleted, onClose
    ]);

    // Manejar confirmación de pago exitoso SIN impresión
    const handlePaymentSuccessClose = useCallback(async () => {
        try {
            // Cerrar el ticket automáticamente para que salga a mesas
            debug('🎫 Cerrando ticket automáticamente...');
            await paymentService.closeTerminalTicket(terminalId);
            debug('✅ Ticket cerrado exitosamente');

            if (onPaymentCompleted && paymentResult) {
                await onPaymentCompleted(paymentResult);
            }
        } catch (error) {
            debug('❌ Error cerrando ticket:', error);
            // Continuar aunque haya error al cerrar
        }

        // Cerrar el modal primero
        setPaymentSuccess(false);
        setPaymentResult(null);
        onClose();

        // Navegar a las mesas después del pago exitoso
        debug('🏠 Navegando a mesas después del pago exitoso...');
        navigate('/tables', { replace: true });
    }, [onPaymentCompleted, paymentResult, onClose, terminalId, navigate]);

    // Manejar impresión de ticket DESPUÉS de cerrar el ticket
    const handlePrintTicket = useCallback(async () => {
        debug('🖨️ Iniciando proceso de impresión después del pago...');
        setPrinting(true);

        try {
            // PASO 1: Cerrar el ticket PRIMERO para que el ticket esté en estado final
            debug('🎫 Cerrando ticket antes de imprimir...');
            await paymentService.closeTerminalTicket(terminalId);
            debug('✅ Ticket cerrado exitosamente');

            // PASO 2: Obtener el ID del ticket cerrado para impresión
            const ticketId = paymentResult?.result?.ticketId || paymentResult?.result?.id;

            if (!ticketId) {
                debug('❌ No se encontró ID del ticket para imprimir');
                throw new Error('No se pudo obtener el ID del ticket para impresión');
            }

            debug('🖨️ Ejecutando impresión de ticket cerrado ID:', ticketId);

            // PASO 3: Imprimir el ticket YA CERRADO (con el pago reflejado)
            await executePrintJobAsync({
                ticketId: ticketId,
                copies: 1,
                name: 'Imprimir factura CAJA'
            });

            debug('✅ Ticket impreso exitosamente después del cierre');

        } catch (error) {
            debug('❌ Error en el proceso de impresión:', error);
            alert(`Error imprimiendo ticket: ${error.message}`);
        } finally {
            setPrinting(false);
        }

        // PASO 4: Completar el flujo de pago
        if (onPaymentCompleted && paymentResult) {
            await onPaymentCompleted(paymentResult);
        }

        // Cerrar el modal y navegar
        setPaymentSuccess(false);
        setPaymentResult(null);
        onClose();

        // Navegar a mesas después de la impresión
        debug('🏠 Navegando a mesas después de imprimir...');
        navigate('/tables', { replace: true });
    }, [paymentResult, onPaymentCompleted, onClose, terminalId, navigate]);

    // Renderizar modal de éxito
    const renderSuccessModal = () => (
        <Dialog
            open={paymentSuccess}
            onClose={handlePaymentSuccessClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    textAlign: 'center',
                    p: 3,
                    background: theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
                        : 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)'
                }
            }}
        >
            <Box>
                <Zoom in={paymentSuccess}>
                    <Box
                        sx={{
                            backgroundColor: theme.palette.success.main,
                            borderRadius: '50%',
                            width: 80,
                            height: 80,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                            color: 'white'
                        }}
                    >
                        <MoneyIcon sx={{ fontSize: 40 }} />
                    </Box>
                </Zoom>

                <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: theme.palette.success.main }}>
                    ¡PAGO EXITOSO!
                </Typography>

                <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                    Total Pagado: {formatMXN(paymentResult?.amount || 0)}
                </Typography>

                {paymentResult?.change > 0 && (
                    <Paper
                        elevation={3}
                        sx={{
                            backgroundColor: theme.palette.error.main,
                            color: 'white',
                            p: 2,
                            mb: 3,
                            borderRadius: 2
                        }}
                    >
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            CAMBIO A ENTREGAR: {formatMXN(paymentResult.change)}
                        </Typography>
                    </Paper>
                )}

                <Box sx={{ mb: 3 }}>
                    <Typography variant="body1" color="textSecondary">
                        Método: <strong>{paymentResult?.paymentMethod}</strong>
                    </Typography>
                    {paymentResult?.tip > 0 && (
                        <Typography variant="body1" color="textSecondary">
                            Propina: <strong>{formatMXN(paymentResult.tip)}</strong>
                        </Typography>
                    )}
                    {paymentResult?.discount > 0 && (
                        <Typography variant="body1" color="textSecondary">
                            Descuento: <strong>{formatMXN(paymentResult.discount)}</strong>
                        </Typography>
                    )}
                </Box>

                <Stack direction="row" spacing={2} justifyContent="center">
                    <Button
                        variant="contained"
                        startIcon={printing ? <CircularProgress size={20} color="inherit" /> : <ReceiptIcon />}
                        onClick={handlePrintTicket}
                        disabled={printing}
                        sx={{
                            backgroundColor: theme.palette.primary.main,
                            '&:hover': {
                                backgroundColor: theme.palette.primary.dark
                            },
                            '&:disabled': {
                                backgroundColor: theme.palette.grey[500]
                            }
                        }}
                    >
                        {printing ? 'Imprimiendo...' : 'Imprimir Ticket'}
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={handlePaymentSuccessClose}
                        disabled={printing}
                        sx={{
                            borderColor: theme.palette.success.main,
                            color: theme.palette.success.main,
                            '&:hover': {
                                backgroundColor: theme.palette.success.main,
                                color: 'white'
                            },
                            '&:disabled': {
                                borderColor: theme.palette.grey[500],
                                color: theme.palette.grey[500]
                            }
                        }}
                    >
                        Continuar
                    </Button>
                </Stack>
            </Box>
        </Dialog>
    );

    // Renderizar keypad numérico
    const renderKeypad = () => {
        const keys = [
            ['7', '8', '9'],
            ['4', '5', '6'],
            ['1', '2', '3'],
            ['limpiar', '0', 'borrar']
        ];

        return (
            <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                {keys.map((row, rowIndex) => (
                    <Grid container spacing={1} key={rowIndex} sx={{ mb: 1, flex: 1 }}>
                        {row.map((key) => (
                            <Grid item xs={4} key={key} sx={{ display: 'flex' }}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    onClick={() => handleKeypadPress(key)}
                                    sx={{
                                        height: '100%',
                                        minHeight: { xs: 56, sm: 64, md: 72 },
                                        fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.5rem' },
                                        fontWeight: 700,
                                        backgroundColor: key === 'limpiar' ? theme.palette.error.main :
                                            key === 'borrar' ? theme.palette.warning.main :
                                                theme.palette.primary.main,
                                        color: 'white',
                                        border: 2,
                                        borderColor: key === 'limpiar' ? theme.palette.error.dark :
                                            key === 'borrar' ? theme.palette.warning.dark :
                                                theme.palette.primary.dark,
                                        '&:hover': {
                                            filter: 'brightness(1.1)',
                                            transform: 'translateY(-2px)',
                                            boxShadow: theme.shadows[8],
                                            backgroundColor: key === 'limpiar' ? theme.palette.error.dark :
                                                key === 'borrar' ? theme.palette.warning.dark :
                                                    theme.palette.primary.dark,
                                        },
                                        transition: 'all 0.2s ease',
                                        borderRadius: 2,
                                        flex: 1,
                                        // Estilos específicos para acciones
                                        ...(key === 'limpiar' && {
                                            fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
                                            boxShadow: theme.shadows[4]
                                        }),
                                        ...(key === 'borrar' && {
                                            fontSize: { xs: '1rem', sm: '1.2rem', md: '1.3rem' },
                                            boxShadow: theme.shadows[4]
                                        })
                                    }}
                                >
                                    {key === 'limpiar' ? 'C' :
                                        key === 'borrar' ? '⌫' : key}
                                </Button>
                            </Grid>
                        ))}
                    </Grid>
                ))}
            </Box>
        );
    };

    // Renderizar métodos de pago
    const renderPaymentMethods = () => (
        <Stack spacing={1}>
            {paymentMethods.map((method) => {
                const IconComponent = method.icon;
                const isSelected = selectedPaymentMethod === method.name;

                return (
                    <Button
                        key={method.name}
                        fullWidth
                        variant={isSelected ? 'contained' : 'outlined'}
                        onClick={() => setSelectedPaymentMethod(method.name)}
                        startIcon={<IconComponent />}
                        sx={{
                            height: 56,
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            justifyContent: 'flex-start',
                            border: 2,
                            borderColor: isSelected ? method.color : theme.palette.divider,
                            backgroundColor: isSelected ? method.color : 'transparent',
                            color: isSelected ? 'white' : theme.palette.text.primary,
                            '&:hover': {
                                backgroundColor: method.color,
                                color: 'white',
                                transform: 'translateX(4px)',
                                boxShadow: theme.shadows[6]
                            },
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {method.name}
                    </Button>
                );
            })}
        </Stack>
    );

    // Renderizar banner de cambio
    const renderChangeBanner = () => {
        if (calculatedChange <= 0) return null;

        return (
            <Fade in={calculatedChange > 0}>
                <Paper
                    elevation={4}
                    sx={{
                        backgroundColor: theme.palette.error.main,
                        color: 'white',
                        p: 2,
                        mb: 2,
                        borderRadius: 2,
                        textAlign: 'center',
                        border: `2px solid ${theme.palette.error.dark}`,
                        animation: 'pulse 1s ease-in-out infinite alternate'
                    }}
                >
                    <Typography variant="h5" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                        CAMBIO: {formatMXN(calculatedChange)}
                    </Typography>
                </Paper>
            </Fade>
        );
    };

    // Renderizar controles específicos para tarjetas
    const renderCardControls = () => {
        if (!isCardPayment) return null;

        return (
            <Card elevation={2} sx={{ p: { xs: 1, sm: 2 }, mb: { xs: 1, sm: 2 } }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: theme.palette.info.main }}>
                    💳 Datos de Tarjeta
                </Typography>

                {/* Últimos 4 dígitos */}
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                        Últimos 4 dígitos:
                    </Typography>
                    <Grid container spacing={1}>
                        <Grid item xs={6}>
                            <Button
                                fullWidth
                                variant="outlined"
                                sx={{
                                    height: 40,
                                    fontSize: '1.2rem',
                                    fontWeight: 600,
                                    borderColor: theme.palette.info.main,
                                    color: cardLastFour || 'gray'
                                }}
                            >
                                {cardLastFour || '****'}
                            </Button>
                        </Grid>
                        <Grid item xs={6}>
                            <Button
                                fullWidth
                                variant="contained"
                                onClick={() => {
                                    const digits = prompt('Ingrese los últimos 4 dígitos de la tarjeta:');
                                    if (digits && digits.length === 4 && !isNaN(digits)) {
                                        setCardLastFour(digits);
                                    }
                                }}
                                sx={{
                                    height: 40,
                                    fontSize: '0.9rem',
                                    backgroundColor: theme.palette.info.main
                                }}
                            >
                                Ingresar
                            </Button>
                        </Grid>
                    </Grid>
                </Box>

                {/* Propina automática para tarjetas */}
                <Box>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                        Cálculo de propina:
                    </Typography>
                    <Grid container spacing={1}>
                        <Grid item xs={6}>
                            <Button
                                fullWidth
                                variant={autoTipForCard ? 'outlined' : 'contained'}
                                onClick={() => {
                                    setAutoTipForCard(false);
                                    setTipPercentage(0);
                                    setCustomTip(0);
                                }}
                                sx={{ height: 40, fontSize: '0.9rem' }}
                            >
                                Manual
                            </Button>
                        </Grid>
                        <Grid item xs={6}>
                            <Button
                                fullWidth
                                variant={autoTipForCard ? 'contained' : 'outlined'}
                                onClick={() => {
                                    setAutoTipForCard(true);
                                    setTipPercentage(15); // 15% automático para tarjetas
                                    setCustomTip(0);
                                }}
                                sx={{
                                    height: 40,
                                    fontSize: '0.9rem',
                                    backgroundColor: autoTipForCard ? theme.palette.success.main : 'transparent',
                                    borderColor: theme.palette.success.main,
                                    color: autoTipForCard ? 'white' : theme.palette.success.main
                                }}
                            >
                                Auto (15%)
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            </Card>
        );
    };

    // Renderizar controles de propina
    const renderTipControls = () => (
        <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2, color: theme.palette.success.main }}>
                💰 PROPINA
            </Typography>
            <Grid container spacing={1}>
                {tipOptions.map((tip) => (
                    <Grid item xs={3} key={tip}>
                        <Button
                            fullWidth
                            variant={tipPercentage === tip ? 'contained' : 'outlined'}
                            onClick={() => handleTipSelect(tip)}
                            sx={{
                                height: 44,
                                fontSize: '1rem',
                                fontWeight: 600,
                                backgroundColor: tipPercentage === tip ? theme.palette.success.main : 'transparent',
                                borderColor: theme.palette.success.main,
                                color: tipPercentage === tip ? 'white' : theme.palette.success.main,
                                '&:hover': {
                                    backgroundColor: theme.palette.success.main,
                                    color: 'white'
                                }
                            }}
                        >
                            {tip}%
                        </Button>
                    </Grid>
                ))}
                <Grid item xs={3}>
                    <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => {
                            // Lógica para propina personalizada
                            const customAmount = prompt('Ingrese cantidad de propina:', '0');
                            if (customAmount !== null) {
                                setCustomTip(parseFloat(customAmount) || 0);
                                setTipPercentage(0);
                            }
                        }}
                        sx={{
                            height: 44,
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            borderColor: theme.palette.success.main,
                            color: theme.palette.success.main,
                            '&:hover': {
                                backgroundColor: theme.palette.success.main,
                                color: 'white'
                            }
                        }}
                    >
                        CUSTOM
                    </Button>
                </Grid>
            </Grid>
            {customTip > 0 && (
                <Typography variant="body2" sx={{ mt: 1, color: theme.palette.success.main, fontWeight: 600 }}>
                    Propina personalizada: {formatMXN(customTip)}
                </Typography>
            )}
        </Box>
    );

    // Renderizar controles de descuento
    const renderDiscountControls = () => (
        <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2, color: theme.palette.warning.main }}>
                🔥 DESCUENTO
            </Typography>
            <Grid container spacing={1}>
                {discountOptions.map((discount) => (
                    <Grid item xs={3} key={discount}>
                        <Button
                            fullWidth
                            variant={discountPercentage === discount ? 'contained' : 'outlined'}
                            onClick={() => handleDiscountSelect(discount)}
                            sx={{
                                height: 44,
                                fontSize: '1rem',
                                fontWeight: 600,
                                backgroundColor: discountPercentage === discount ? theme.palette.warning.main : 'transparent',
                                borderColor: theme.palette.warning.main,
                                color: discountPercentage === discount ? 'white' : theme.palette.warning.main,
                                '&:hover': {
                                    backgroundColor: theme.palette.warning.main,
                                    color: 'white'
                                }
                            }}
                        >
                            {discount}%
                        </Button>
                    </Grid>
                ))}
                <Grid item xs={3}>
                    <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => {
                            // Lógica para descuento personalizado
                            const customAmount = prompt('Ingrese cantidad de descuento:', '0');
                            if (customAmount !== null) {
                                setCustomDiscount(parseFloat(customAmount) || 0);
                                setDiscountPercentage(0);
                            }
                        }}
                        sx={{
                            height: 44,
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            borderColor: theme.palette.warning.main,
                            color: theme.palette.warning.main,
                            '&:hover': {
                                backgroundColor: theme.palette.warning.main,
                                color: 'white'
                            }
                        }}
                    >
                        CUSTOM
                    </Button>
                </Grid>
            </Grid>
            {customDiscount > 0 && (
                <Typography variant="body2" sx={{ mt: 1, color: theme.palette.warning.main, fontWeight: 600 }}>
                    Descuento personalizado: {formatMXN(customDiscount)}
                </Typography>
            )}
        </Box>
    );

    if (!open) return null;

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                fullWidth
                maxWidth={false}
                fullScreen
                PaperProps={{
                    sx: {
                        margin: 0,
                        maxHeight: '100vh',
                        height: '100vh',
                        maxWidth: '100vw',
                        width: '100vw',
                        borderRadius: 0,
                        background: theme.palette.mode === 'dark'
                            ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
                            : 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
                        display: 'flex',
                        flexDirection: 'column'
                    }
                }}
            >
                {/* Header con Total Principal */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        p: { xs: 3, sm: 4 },
                        background: theme.palette.mode === 'dark'
                            ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
                            : 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
                        color: theme.palette.mode === 'dark' ? 'white' : 'black',
                        flexShrink: 0,
                        minHeight: { xs: 80, sm: 100 },
                        position: 'relative'
                    }}
                >
                    <Typography variant={isMobile ? "h2" : "h1"} sx={{ fontWeight: 900, textAlign: 'center' }}>
                        Total: {formatMXN(finalTotal)}
                    </Typography>
                    <IconButton
                        onClick={onClose}
                        sx={{
                            position: 'absolute',
                            right: { xs: 16, sm: 24 },
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: theme.palette.mode === 'dark' ? 'white' : 'black'
                        }}
                    >
                        <CloseIcon fontSize="large" />
                    </IconButton>
                </Box>

                {/* Contenido Principal - Flex Container */}
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        p: { xs: 1, sm: 2 }
                    }}
                >
                    {/* Desglose de totales (solo si hay propina o descuento) */}
                    {(calculatedTip > 0 || calculatedDiscount > 0) && (
                        <Paper
                            elevation={1}
                            sx={{
                                p: 2,
                                mb: 2,
                                textAlign: 'center',
                                background: theme.palette.mode === 'dark' ? '#2d2d2d' : 'white',
                                flexShrink: 0
                            }}
                        >
                            <Typography variant="body1" color="textSecondary">
                                Base: {formatMXN(ticketTotal)}
                                {calculatedTip > 0 && ` + Propina: ${formatMXN(calculatedTip)}`}
                                {calculatedDiscount > 0 && ` - Descuento: ${formatMXN(calculatedDiscount)}`}
                            </Typography>
                        </Paper>
                    )}

                    {/* Banner de cambio */}
                    {renderChangeBanner()}

                    {/* Grid Principal - Ocupa todo el espacio restante */}
                    <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ flex: 1, overflow: 'hidden' }}>
                        {/* Columna izquierda: Keypad */}
                        <Grid item xs={12} lg={6} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <Card
                                elevation={2}
                                sx={{
                                    p: { xs: 1, sm: 2 },
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    mb: { xs: 1, sm: 2 }
                                }}
                            >
                                {/* Display de calculadora para Monto Recibido */}
                                <Box
                                    sx={{
                                        mb: 2,
                                        border: '2px solid',
                                        borderColor: theme.palette.divider,
                                        borderRadius: 2,
                                        background: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
                                        p: { xs: 1.5, sm: 2 },
                                        textAlign: 'center',
                                        minHeight: { xs: 60, sm: 70 },
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: 'text.secondary',
                                            fontWeight: 500,
                                            mb: 0.5,
                                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                        }}
                                    >
                                        Monto Recibido
                                    </Typography>
                                    <Typography
                                        variant={isMobile ? "h4" : "h3"}
                                        sx={{
                                            fontWeight: 700,
                                            color: theme.palette.mode === 'dark' ? 'white' : '#1a1a1a',
                                            fontFamily: 'monospace',
                                            fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.5rem' },
                                            lineHeight: 1.2
                                        }}
                                    >
                                        ${enteredAmount || '0.00'}
                                    </Typography>
                                </Box>
                                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                                    {renderKeypad()}
                                </Box>
                            </Card>

                            {/* Cambio - Posición fija en la parte inferior */}
                            {enteredAmount && parseFloat(enteredAmount) > 0 && (
                                <Fade in={true}>
                                    <Paper
                                        elevation={2}
                                        sx={{
                                            p: 2,
                                            textAlign: 'center',
                                            backgroundColor: theme.palette.success.light,
                                            flexShrink: 0
                                        }}
                                    >
                                        <Typography
                                            variant="h3"
                                            sx={{
                                                fontWeight: 700,
                                                color: 'white',
                                                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                                                textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                                                letterSpacing: '0.02em'
                                            }}
                                        >
                                            CAMBIO: {formatMXN(calculatedChange)}
                                        </Typography>
                                    </Paper>
                                </Fade>
                            )}
                        </Grid>

                        {/* Columna derecha: Métodos de pago y controles */}
                        <Grid item xs={12} lg={6} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1, sm: 2 }, height: '100%' }}>
                                {/* Métodos de pago */}
                                <Card elevation={2} sx={{ p: { xs: 1, sm: 2 }, flex: '0 0 auto' }}>
                                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                                        Método de Pago
                                    </Typography>
                                    {renderPaymentMethods()}
                                </Card>

                                {/* Controles específicos para tarjetas */}
                                {renderCardControls()}

                                {/* Propina y Descuento - Flexibles */}
                                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: { xs: 1, sm: 2 } }}>
                                    {/* Propina */}
                                    <Card elevation={2} sx={{ p: { xs: 1, sm: 2 }, flex: 1 }}>
                                        {renderTipControls()}
                                    </Card>

                                    {/* Descuento */}
                                    <Card elevation={2} sx={{ p: { xs: 1, sm: 2 }, flex: 1 }}>
                                        {renderDiscountControls()}
                                    </Card>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>

                    {/* Botón de pago - Fijo en la parte inferior */}
                    <Box sx={{ flexShrink: 0, mt: { xs: 1, sm: 2 } }}>
                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            onClick={handleProcessPayment}
                            disabled={!canProcessPayment}
                            startIcon={processing ? null : <MoneyIcon />}
                            sx={{
                                height: { xs: 56, sm: 64 },
                                fontSize: { xs: '1.1rem', sm: '1.3rem' },
                                fontWeight: 700,
                                background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #45a049 0%, #3d8b40 100%)',
                                    transform: 'translateY(-2px)',
                                    boxShadow: theme.shadows[12]
                                },
                                '&:disabled': {
                                    background: theme.palette.grey[400]
                                },
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {processing ? 'Procesando...' : `Cobrar ${formatMXN(finalTotal)}`}
                        </Button>
                    </Box>
                </Box>

            </Dialog>

            {/* Modal de éxito de pago */}
            {renderSuccessModal()}
        </>
    );
};

export default PaymentProcessor;
