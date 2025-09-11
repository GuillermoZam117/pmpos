/**
 * Product Details Modal Component - Enhanced Design
 * Shows detailed product information with simplified, beautiful interface
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Chip,
    Grid,
    TextField,
    FormControlLabel,
    Radio,
    RadioGroup,
    FormControl,
    Divider,
    Card,
    CardContent,
    IconButton,
    Badge,
    Paper,
    Alert,
    Stack,
    Tooltip,
    Collapse,
    Fade,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
    Close as CloseIcon,
    Add as AddIcon,
    Remove as RemoveIcon,
    RestaurantMenu as MenuIcon,
    LocalOffer as OfferIcon,
    Comment as CommentIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    AttachMoney as PriceIcon,
    ShoppingCart as CartIcon,
    InfoOutlined as InfoIcon,
    CheckCircleOutlined as CheckIcon,
} from '@mui/icons-material';
import { formatMXN } from '../utils/currencyFormatter';
import PropTypes from 'prop-types';
import orderTagService from '../services/orderTagService';

const ProductDetailsModal = ({
    open,
    onClose,
    product,
    onAddToOrder,
    existingTags = [],
    showComments = true,
    showPortions = true,
    showOrderTags = true
}) => {
    // Early return BEFORE hooks to avoid hooks rule violation
    if (!product) return null;

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [quantity, setQuantity] = useState(1);
    const [selectedPortion, setSelectedPortion] = useState(null);
    const [selectedOrderTags, setSelectedOrderTags] = useState([]);
    const [comments, setComments] = useState('');
    const [showAllTags, setShowAllTags] = useState(false);
    const [showDescription, setShowDescription] = useState(false);

    // Reset state when product changes or modal opens
    useEffect(() => {
        if (open && product) {
            setQuantity(1);
            setComments('');
            setSelectedOrderTags(existingTags || []);

            // Set default portion
            if (product.portions && product.portions.length > 0) {
                const defaultPortion = product.portions.find(p => p.isDefault) || product.portions[0];
                setSelectedPortion(defaultPortion);
            } else if (product.product?.portions && product.product.portions.length > 0) {
                const defaultPortion = product.product.portions.find(p => p.isDefault) || product.product.portions[0];
                setSelectedPortion(defaultPortion);
            }
        }
    }, [open, product?.id, product?.productId]); // Removed existingTags - it causes infinite loops

    const productName = product.name || product.caption || 'Producto';
    const productDescription = product.description || product.product?.description || '';
    const portions = product.portions || product.product?.portions || [];

    // Debug logging for portions
    useEffect(() => {
        if (open && product) {
            console.log('📊 ProductDetailsModal Debug:', {
                productName,
                productId: product.id || product.productId,
                portionsFromProduct: product.portions,
                portionsFromNestedProduct: product.product?.portions,
                finalPortions: portions,
                portionsLength: portions.length,
                selectedPortion: selectedPortion?.name
            });
        }
    }, [open, product, portions, selectedPortion, productName]);

    const orderTags = product.defaultOrderTags || [];
    const [availableOrderTags, setAvailableOrderTags] = useState([]);
    const currentPrice = selectedPortion ? parseFloat(selectedPortion.price) || 0 : 0;
    const totalPrice = currentPrice * quantity;

    const handleQuantityChange = useCallback((delta) => {
        setQuantity(prev => Math.max(1, prev + delta));
    }, []); // No dependencies - use functional update

    const handlePortionChange = useCallback((event) => {
        const portionId = event.target.value;
        const portion = portions.find(p => p.id === portionId || p.name === portionId);
        setSelectedPortion(portion);
    }, [portions]);

    const handleOrderTagToggle = useCallback((tag) => {
        setSelectedOrderTags(prev => {
            const exists = prev.some(t => t.id === tag.id || t.name === tag.name);
            if (exists) {
                return prev.filter(t => t.id !== tag.id && t.name !== tag.name);
            } else {
                return [...prev, tag];
            }
        });
    }, []); // No dependencies needed for functional updates

    // Load order tags for this product/portion from SambaPOS
    useEffect(() => {
        let canceled = false;
        const loadOrderTags = async () => {
            try {
                const pid = product.productId || product.id || product.product?.id;
                const portionName = selectedPortion?.name || (portions.length > 0 ? portions[0].name : 'Normal');

                if (!pid) {
                    debug('ProductDetailsModal: No product ID available for order tags');
                    return;
                }

                debug('ProductDetailsModal: Loading order tags for product:', {
                    pid,
                    portionName,
                    selectedPortion: selectedPortion?.name,
                    availablePortions: portions.map(p => p.name),
                    productOrderTags: product.defaultOrderTags,
                    existingOrderTags: orderTags
                });

                // Usar orderTagService para obtener las etiquetas configuradas en SambaPOS
                const sambaposTags = await orderTagService.getGroups(pid, portionName);

                debug('ProductDetailsModal: orderTagService.getGroups returned:', {
                    sambaposTags,
                    isArray: Array.isArray(sambaposTags),
                    length: sambaposTags?.length
                });

                if (!canceled && Array.isArray(sambaposTags) && sambaposTags.length > 0) {
                    debug('ProductDetailsModal: Loaded SambaPOS tags:', sambaposTags.length);
                    setAvailableOrderTags(sambaposTags.map(t => ({
                        id: t.id || `${t.group || 'default'}:${t.name}`,
                        name: t.name,
                        group: t.group || 'Opciones',
                        price: parseFloat(t.price) || 0
                    })));
                } else {
                    debug('ProductDetailsModal: No SambaPOS tags found for this product/portion');
                    // Use product default tags if available
                    if (!canceled) {
                        const fallbackTags = product.defaultOrderTags || orderTags || [];
                        setAvailableOrderTags(fallbackTags.map(t => ({
                            id: t.id || t.name,
                            name: t.name,
                            group: t.group || 'Opciones',
                            price: parseFloat(t.price) || 0
                        })));
                    }
                }

            } catch (error) {
                debug('ProductDetailsModal: Error loading order tags:', error.message);
                console.error('Error loading order tags:', error);
                // Graceful fallback - usar tags predeterminadas o de debug
                if (!canceled) {
                    const fallbackTags = product.defaultOrderTags || orderTags || debugTags;
                    setAvailableOrderTags(fallbackTags.map(t => ({
                        id: t.id || t.name || Math.random().toString(),
                        name: t.name || t,
                        group: t.group || 'Opciones',
                        price: parseFloat(t.price) || 0
                    })));
                }
            }
        };

        if (open && selectedPortion && product) {
            loadOrderTags();
        }

        return () => {
            canceled = true;
        };
    }, [open, product?.id, product?.productId, selectedPortion?.name, product]);

    const debug = (message, data) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[ProductDetailsModal] ${message}`, data || '');
        }
    };

    const handleAddToOrder = useCallback(() => {
        const orderData = {
            product,
            quantity,
            portion: selectedPortion,
            orderTags: selectedOrderTags,
            comments: comments.trim(),
            price: currentPrice,
            totalPrice
        };

        onAddToOrder(orderData);
        onClose();
    }, [product, quantity, selectedPortion, selectedOrderTags, comments, currentPrice, totalPrice, onAddToOrder, onClose]);

    const handleToggleDescription = useCallback(() => {
        setShowDescription(prev => !prev);
    }, []); // Use functional update to avoid dependency

    const handleToggleAllTags = useCallback(() => {
        setShowAllTags(prev => !prev);
    }, []); // Use functional update to avoid dependency

    const handleIncreaseQuantity = useCallback(() => {
        handleQuantityChange(1);
    }, [handleQuantityChange]);

    const handleDecreaseQuantity = useCallback(() => {
        handleQuantityChange(-1);
    }, [handleQuantityChange]);

    const createTagToggleHandler = useCallback((tag) => {
        return () => handleOrderTagToggle(tag);
    }, [handleOrderTagToggle]);

    const getTagPrice = (tag) => {
        const tagPrice = parseFloat(tag.price) || 0;
        return tagPrice > 0 ? ` (+${formatMXN(tagPrice)})` : '';
    };

    // Use only real order tags - no fake data
    const mergedTags = availableOrderTags?.length > 0 ? availableOrderTags : (orderTags || []);
    const displayedTags = showAllTags ? mergedTags : mergedTags.slice(0, 8);
    const hasMoreTags = mergedTags.length > 8;

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
                    maxHeight: isMobile ? '100vh' : '95vh',
                    background: (theme) => `linear-gradient(145deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
                    boxShadow: (theme) => theme.shadows[24]
                }
            }}
        >
            {/* Enhanced Header with Gradient */}
            <DialogTitle sx={{
                background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: 'primary.contrastText',
                px: 3,
                py: 2.5,
                position: 'relative'
            }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h5" sx={{
                            fontWeight: 700,
                            fontSize: { xs: '1.3rem', sm: '1.5rem' },
                            mb: 0.5
                        }}>
                            {productName}
                        </Typography>
                        {currentPrice > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                    icon={<PriceIcon />}
                                    label={formatMXN(currentPrice)}
                                    size="small"
                                    sx={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                        color: 'inherit',
                                        fontWeight: 600,
                                        '& .MuiChip-icon': { color: 'inherit' }
                                    }}
                                />
                                {quantity > 1 && (
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                        × {quantity} = {formatMXN(totalPrice)}
                                    </Typography>
                                )}
                            </Box>
                        )}
                    </Box>
                    <Tooltip title="Cerrar">
                        <IconButton
                            onClick={onClose}
                            sx={{
                                color: 'inherit',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 3, minHeight: 300 }}>
                <Stack spacing={3}>
                    {/* Product Description - Simplified */}
                    {productDescription && (
                        <Fade in timeout={600}>
                            <Card variant="outlined" sx={{
                                borderRadius: 2,
                                border: theme => `1px solid ${theme.palette.divider}`,
                                background: theme => `${theme.palette.background.paper}F5`
                            }}>
                                <CardContent sx={{ p: 2.5 }}>
                                    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                                        <InfoIcon color="primary" />
                                        <Typography variant="subtitle1" fontWeight={600}>
                                            Descripción
                                        </Typography>
                                    </Stack>
                                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                                        {productDescription}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Fade>
                    )}

                    {/* Quantity and Portion in a Clean Row */}
                    <Grid container spacing={2} sx={{ justifyContent: 'center' }}>
                        {/* Enhanced Quantity Selector */}
                        <Grid item xs={12} sm={showPortions && portions.length > 0 ? 6 : 8}>
                            <Card sx={{
                                borderRadius: 3,
                                border: (theme) => `2px solid ${theme.palette.primary.light}`,
                                background: (theme) => theme.palette.primary.main + '08',
                                textAlign: 'center'
                            }}>
                                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                                    <Stack spacing={2.5} alignItems="center">
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                            <CartIcon color="primary" sx={{ fontSize: '1.5rem' }} />
                                            <Typography variant="h6" fontWeight={700} color="primary.main">
                                                Cantidad
                                            </Typography>
                                        </Box>

                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 2,
                                            backgroundColor: 'background.paper',
                                            borderRadius: 3,
                                            p: 2,
                                            minWidth: 160,
                                            boxShadow: theme => theme.shadows[2]
                                        }}>
                                            <IconButton
                                                onClick={handleDecreaseQuantity}
                                                disabled={quantity <= 1}
                                                size="large"
                                                sx={{
                                                    backgroundColor: theme => quantity > 1 ? theme.palette.primary.light + '30' : 'action.disabled',
                                                    color: theme => quantity > 1 ? theme.palette.primary.main : 'text.disabled',
                                                    '&:hover': {
                                                        backgroundColor: theme => quantity > 1 ? theme.palette.primary.light + '50' : 'action.disabled',
                                                        transform: quantity > 1 ? 'scale(1.05)' : 'none'
                                                    },
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <RemoveIcon fontSize="large" />
                                            </IconButton>

                                            <Typography variant="h3" sx={{
                                                minWidth: '2ch',
                                                textAlign: 'center',
                                                fontWeight: 800,
                                                color: 'primary.main',
                                                fontSize: '2.5rem'
                                            }}>
                                                {quantity}
                                            </Typography>

                                            <IconButton
                                                onClick={handleIncreaseQuantity}
                                                size="large"
                                                sx={{
                                                    backgroundColor: theme => theme.palette.primary.light + '30',
                                                    color: 'primary.main',
                                                    '&:hover': {
                                                        backgroundColor: theme => theme.palette.primary.light + '50',
                                                        transform: 'scale(1.05)'
                                                    },
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <AddIcon fontSize="large" />
                                            </IconButton>
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Enhanced Portions Selector */}
                        {showPortions && portions.length > 0 && (
                            <Grid item xs={12} sm={6}>
                                <Card sx={{
                                    borderRadius: 3,
                                    border: (theme) => `2px solid ${theme.palette.secondary.light}`,
                                    background: (theme) => theme.palette.secondary.main + '08',
                                    height: '100%'
                                }}>
                                    <CardContent sx={{ p: 3 }}>
                                        <Stack spacing={2.5}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                                <PriceIcon color="secondary" sx={{ fontSize: '1.5rem' }} />
                                                <Typography variant="h6" fontWeight={700} color="secondary.main">
                                                    Tamaño
                                                </Typography>
                                            </Box>

                                            <FormControl component="fieldset" fullWidth>
                                                <RadioGroup
                                                    value={selectedPortion?.id || selectedPortion?.name || ''}
                                                    onChange={handlePortionChange}
                                                    sx={{ alignItems: 'center' }}
                                                >
                                                    {portions.map((portion, index) => (
                                                        <Paper
                                                            key={portion.id || portion.name || index}
                                                            elevation={(selectedPortion?.id || selectedPortion?.name) === (portion.id || portion.name) ? 4 : 1}
                                                            sx={{
                                                                p: 2,
                                                                mb: 1,
                                                                borderRadius: 2,
                                                                cursor: 'pointer',
                                                                transition: 'all 0.3s ease',
                                                                background: (selectedPortion?.id || selectedPortion?.name) === (portion.id || portion.name)
                                                                    ? (theme) => `linear-gradient(135deg, ${theme.palette.secondary.light}22, ${theme.palette.secondary.main}11)`
                                                                    : 'transparent',
                                                                border: (theme) => (selectedPortion?.id || selectedPortion?.name) === (portion.id || portion.name)
                                                                    ? `2px solid ${theme.palette.secondary.main}`
                                                                    : `1px solid ${theme.palette.divider}`,
                                                                '&:hover': {
                                                                    elevation: 3,
                                                                    transform: 'translateY(-2px)',
                                                                    background: (theme) => `linear-gradient(135deg, ${theme.palette.secondary.light}15, ${theme.palette.secondary.main}08)`
                                                                }
                                                            }}
                                                            onClick={() => handlePortionChange({ target: { value: portion.id || portion.name } })}
                                                        >
                                                            <FormControlLabel
                                                                value={portion.id || portion.name}
                                                                control={<Radio color="secondary" />}
                                                                label={
                                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                                        <Typography variant="subtitle1" fontWeight={600}>
                                                                            {portion.name}
                                                                        </Typography>
                                                                        <Chip
                                                                            label={formatMXN(parseFloat(portion.price) || 0)}
                                                                            size="small"
                                                                            variant="filled"
                                                                            color="secondary"
                                                                            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                                                                        />
                                                                    </Box>
                                                                }
                                                                sx={{
                                                                    m: 0,
                                                                    width: '100%',
                                                                    '& .MuiFormControlLabel-label': { flex: 1, width: '100%' }
                                                                }}
                                                            />
                                                        </Paper>
                                                    ))}
                                                </RadioGroup>
                                            </FormControl>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}

                    </Grid>

                    {/* Simplified Order Tags */}
                    {showOrderTags && mergedTags.length > 0 && (
                        <Fade in timeout={800}>
                            <Card sx={{
                                borderRadius: 2,
                                border: theme => `1px solid ${theme.palette.warning.light}`,
                                background: theme => theme.palette.warning.main + '03'
                            }}>
                                <CardContent sx={{ p: 2.5 }}>
                                    <Stack spacing={2}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <OfferIcon color="warning" />
                                                <Typography variant="h6" fontWeight={600}>
                                                    Opciones
                                                </Typography>
                                                <Chip
                                                    label={selectedOrderTags.length}
                                                    size="small"
                                                    color="warning"
                                                    variant={selectedOrderTags.length > 0 ? "filled" : "outlined"}
                                                />
                                            </Box>

                                            {hasMoreTags && (
                                                <Button
                                                    size="small"
                                                    onClick={handleToggleAllTags}
                                                    endIcon={showAllTags ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                    sx={{ minWidth: 'auto' }}
                                                >
                                                    {showAllTags ? 'Menos' : `+${Math.max(0, mergedTags.length - 8)}`}
                                                </Button>
                                            )}
                                        </Box>

                                        {/* Mostrar etiquetas organizadas por grupos */}
                                        {(() => {
                                            // Agrupar tags por grupo
                                            const tagsByGroup = displayedTags.reduce((acc, tag) => {
                                                const group = tag.group || 'Opciones';
                                                if (!acc[group]) acc[group] = [];
                                                acc[group].push(tag);
                                                return acc;
                                            }, {});

                                            return Object.entries(tagsByGroup).map(([groupName, groupTags]) => (
                                                <Box key={groupName} sx={{ width: '100%' }}>
                                                    {/* Mostrar nombre del grupo si hay múltiples grupos */}
                                                    {Object.keys(tagsByGroup).length > 1 && (
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                display: 'block',
                                                                fontWeight: 600,
                                                                color: 'warning.main',
                                                                mb: 1,
                                                                textTransform: 'uppercase',
                                                                fontSize: '0.7rem'
                                                            }}
                                                        >
                                                            {groupName}
                                                        </Typography>
                                                    )}

                                                    {/* Tags del grupo */}
                                                    <Box sx={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                                        gap: 1.5,
                                                        mb: 2
                                                    }}>
                                                        {groupTags.map((tag, index) => {
                                                            const isSelected = selectedOrderTags.some(t => t.id === tag.id || t.name === tag.name);
                                                            const tagPrice = parseFloat(tag.price) || 0;
                                                            return (
                                                                <Tooltip
                                                                    key={tag.id || tag.name || index}
                                                                    title={`Grupo: ${tag.group || 'Opciones'}${tagPrice > 0 ? ` • +${formatMXN(tagPrice)}` : ' • Sin costo adicional'}`}
                                                                    placement="top"
                                                                >
                                                                    <Chip
                                                                        icon={isSelected ? <CheckIcon /> : undefined}
                                                                        label={
                                                                            <Box>
                                                                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                                                    {tag.name}
                                                                                </Typography>
                                                                                {tagPrice > 0 && (
                                                                                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                                                                        +{formatMXN(tagPrice)}
                                                                                    </Typography>
                                                                                )}
                                                                            </Box>
                                                                        }
                                                                        onClick={() => handleOrderTagToggle(tag)}
                                                                        color="warning"
                                                                        variant={isSelected ? "filled" : "outlined"}
                                                                        sx={{
                                                                            cursor: 'pointer',
                                                                            height: 'auto',
                                                                            py: 1,
                                                                            '& .MuiChip-label': {
                                                                                px: 1,
                                                                                display: 'block',
                                                                                textAlign: 'center'
                                                                            },
                                                                            '&:hover': {
                                                                                transform: 'translateY(-1px)',
                                                                                boxShadow: theme => theme.shadows[4],
                                                                            },
                                                                            transition: 'all 0.2s ease-in-out'
                                                                        }}
                                                                    />
                                                                </Tooltip>
                                                            );
                                                        })}
                                                    </Box>
                                                </Box>
                                            ));
                                        })()}
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Fade>
                    )}

                    {/* Enhanced Comments Section */}
                    {showComments && (
                        <Fade in timeout={1000}>
                            <Card sx={{
                                borderRadius: 2,
                                border: theme => `1px solid ${theme.palette.info.light}`,
                                background: theme => theme.palette.info.main + '03'
                            }}>
                                <CardContent sx={{ p: 2.5 }}>
                                    <Stack spacing={2}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <CommentIcon color="info" />
                                            <Typography variant="h6" fontWeight={600}>
                                                Notas Especiales
                                            </Typography>
                                        </Box>

                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={isMobile ? 2 : 3}
                                            value={comments}
                                            onChange={(e) => setComments(e.target.value)}
                                            placeholder="Ej: Sin cebolla, término medio, salsa aparte..."
                                            variant="outlined"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 2,
                                                    backgroundColor: 'background.paper'
                                                }
                                            }}
                                        />
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Fade>
                    )}

                    {/* Beautiful Order Summary */}
                    {currentPrice > 0 && (
                        <Fade in timeout={1200}>
                            <Alert
                                severity="success"
                                variant="filled"
                                sx={{
                                    borderRadius: 2,
                                    '& .MuiAlert-message': { width: '100%' }
                                }}
                            >
                                <Stack spacing={1}>
                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                        Resumen de tu pedido
                                    </Typography>
                                    <Box>
                                        <Typography variant="body2">
                                            {quantity} × {productName}
                                            {selectedPortion && ` (${selectedPortion.name})`}
                                        </Typography>
                                        {selectedOrderTags.length > 0 && (
                                            <Typography variant="body2">
                                                + {selectedOrderTags.length} opciones adicionales
                                            </Typography>
                                        )}
                                        {comments && (
                                            <Typography variant="body2">
                                                + Notas personalizadas
                                            </Typography>
                                        )}
                                    </Box>
                                    <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                        Total: {formatMXN(totalPrice)}
                                    </Typography>
                                </Stack>
                            </Alert>
                        </Fade>
                    )}
                </Stack>
            </DialogContent>

            {/* Enhanced Actions */}
            <DialogActions sx={{
                p: 3,
                gap: 2,
                backgroundColor: theme => theme.palette.background.default,
                borderTop: theme => `1px solid ${theme.palette.divider}`
            }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    size="large"
                    sx={{
                        flex: 1,
                        borderRadius: 2,
                        py: 1.5,
                        fontWeight: 600
                    }}
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleAddToOrder}
                    variant="contained"
                    size="large"
                    disabled={!selectedPortion && portions.length > 0}
                    startIcon={<CartIcon />}
                    sx={{
                        flex: 2,
                        borderRadius: 2,
                        py: 1.5,
                        fontWeight: 700,
                        background: theme => `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
                        '&:hover': {
                            background: theme => `linear-gradient(45deg, ${theme.palette.primary.dark} 30%, ${theme.palette.primary.main} 90%)`,
                        }
                    }}
                >
                    Agregar {totalPrice > 0 && `• ${formatMXN(totalPrice)}`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

ProductDetailsModal.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    product: PropTypes.object,
    onAddToOrder: PropTypes.func.isRequired,
    existingTags: PropTypes.array,
    showComments: PropTypes.bool,
    showPortions: PropTypes.bool,
    showOrderTags: PropTypes.bool
};

export default ProductDetailsModal;
