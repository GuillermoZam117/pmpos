/**
 * Product Details Modal Component
 * Shows detailed product information with portions, options, and comments
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
    FormLabel,
    Divider,
    Card,
    CardContent,
    IconButton,
    Badge,
    Paper,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Collapse,
    Alert,
} from '@mui/material';
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
} from '@mui/icons-material';
import { formatMXN } from '../utils/currencyFormatter';
import PropTypes from 'prop-types';

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
    const orderTags = product.defaultOrderTags || [];
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

    const displayedTags = showAllTags ? orderTags : orderTags.slice(0, 6);
    const hasMoreTags = orderTags.length > 6;

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="md" 
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    maxHeight: '90vh'
                }
            }}
        >
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Typography variant="h5" component="div" gutterBottom>
                            {productName}
                        </Typography>
                        {currentPrice > 0 && (
                            <Typography variant="h6" color="primary.main" sx={{ fontWeight: 'bold' }}>
                                {formatMXN(currentPrice)}
                                {quantity > 1 && (
                                    <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                                        × {quantity} = {formatMXN(totalPrice)}
                                    </Typography>
                                )}
                            </Typography>
                        )}
                    </Box>
                    <IconButton onClick={onClose} size="large">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent dividers>
                <Grid container spacing={3}>
                    {/* Product Description */}
                    {productDescription && (
                        <Grid item xs={12}>
                            <Card variant="outlined">
                                <CardContent sx={{ py: 2 }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={showDescription ? 1 : 0}>
                                        <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                                            <MenuIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                                            Descripción
                                        </Typography>
                                        <IconButton size="small" onClick={handleToggleDescription}>
                                            {showDescription ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                        </IconButton>
                                    </Box>
                                    <Collapse in={showDescription}>
                                        <Typography variant="body2" color="text.primary">
                                            {productDescription}
                                        </Typography>
                                    </Collapse>
                                </CardContent>
                            </Card>
                        </Grid>
                    )}

                    {/* Quantity Selector */}
                    <Grid item xs={12} sm={6}>
                        <Paper elevation={1} sx={{ p: 2 }}>
                            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                <Badge color="primary" badgeContent={quantity}>
                                    <AddIcon sx={{ mr: 1 }} />
                                </Badge>
                                Cantidad
                            </Typography>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mt={2}>
                                <IconButton 
                                    onClick={handleDecreaseQuantity} 
                                    disabled={quantity <= 1}
                                    color="primary"
                                    size="large"
                                >
                                    <RemoveIcon />
                                </IconButton>
                                <Typography variant="h4" sx={{ mx: 2, minWidth: '3ch', textAlign: 'center' }}>
                                    {quantity}
                                </Typography>
                                <IconButton 
                                    onClick={handleIncreaseQuantity} 
                                    color="primary"
                                    size="large"
                                >
                                    <AddIcon />
                                </IconButton>
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Portions Selector */}
                    {showPortions && portions.length > 0 && (
                        <Grid item xs={12} sm={6}>
                            <Paper elevation={1} sx={{ p: 2 }}>
                                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                    <PriceIcon sx={{ mr: 1 }} />
                                    Tamaño / Precio
                                </Typography>
                                <FormControl component="fieldset" fullWidth>
                                    <RadioGroup
                                        value={selectedPortion?.id || selectedPortion?.name || ''}
                                        onChange={handlePortionChange}
                                    >
                                        {portions.map((portion, index) => (
                                            <FormControlLabel
                                                key={portion.id || portion.name || index}
                                                value={portion.id || portion.name}
                                                control={<Radio />}
                                                label={
                                                    <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                                                        <Typography variant="body2">{portion.name}</Typography>
                                                        <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'bold' }}>
                                                            {formatMXN(parseFloat(portion.price) || 0)}
                                                        </Typography>
                                                    </Box>
                                                }
                                                sx={{ 
                                                    width: '100%',
                                                    mr: 0,
                                                    '& .MuiFormControlLabel-label': {
                                                        width: '100%'
                                                    }
                                                }}
                                            />
                                        ))}
                                    </RadioGroup>
                                </FormControl>
                            </Paper>
                        </Grid>
                    )}

                    {/* Order Tags */}
                    {showOrderTags && orderTags.length > 0 && (
                        <Grid item xs={12}>
                            <Paper elevation={1} sx={{ p: 2 }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center' }}>
                                        <OfferIcon sx={{ mr: 1 }} />
                                        Opciones Disponibles
                                    </Typography>
                                    {hasMoreTags && (
                                        <Button
                                            size="small"
                                            onClick={handleToggleAllTags}
                                            endIcon={showAllTags ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                        >
                                            {showAllTags ? 'Ver menos' : `Ver ${orderTags.length - 6} más`}
                                        </Button>
                                    )}
                                </Box>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {displayedTags.map((tag, index) => {
                                        const isSelected = selectedOrderTags.some(t => t.id === tag.id || t.name === tag.name);
                                        return (
                                            <Chip
                                                key={tag.id || tag.name || index}
                                                label={`${tag.name}${getTagPrice(tag)}`}
                                                onClick={() => handleOrderTagToggle(tag)}
                                                color={isSelected ? "primary" : "default"}
                                                variant={isSelected ? "filled" : "outlined"}
                                                sx={{
                                                    cursor: 'pointer',
                                                    '&:hover': {
                                                        backgroundColor: isSelected ? 'primary.dark' : 'action.hover'
                                                    }
                                                }}
                                            />
                                        );
                                    })}
                                </Box>
                            </Paper>
                        </Grid>
                    )}

                    {/* Comments */}
                    {showComments && (
                        <Grid item xs={12}>
                            <Paper elevation={1} sx={{ p: 2 }}>
                                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                    <CommentIcon sx={{ mr: 1 }} />
                                    Comentarios / Notas Especiales
                                </Typography>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={2}
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                    placeholder="Ej: Sin cebolla, término medio, salsa aparte..."
                                    variant="outlined"
                                    size="small"
                                />
                            </Paper>
                        </Grid>
                    )}

                    {/* Order Summary */}
                    {currentPrice > 0 && (
                        <Grid item xs={12}>
                            <Alert severity="info" sx={{ mt: 1 }}>
                                <Typography variant="body2">
                                    <strong>Resumen:</strong> {quantity} × {productName}
                                    {selectedPortion && ` (${selectedPortion.name})`}
                                    {selectedOrderTags.length > 0 && (
                                        <span> • {selectedOrderTags.length} opciones</span>
                                    )}
                                    {comments && <span> • Con comentarios</span>}
                                </Typography>
                                <Typography variant="h6" color="primary.main" sx={{ mt: 1, fontWeight: 'bold' }}>
                                    Total: {formatMXN(totalPrice)}
                                </Typography>
                            </Alert>
                        </Grid>
                    )}
                </Grid>
            </DialogContent>

            <DialogActions sx={{ p: 2, gap: 1 }}>
                <Button onClick={onClose} variant="outlined" size="large">
                    Cancelar
                </Button>
                <Button 
                    onClick={handleAddToOrder} 
                    variant="contained" 
                    size="large"
                    disabled={!selectedPortion && portions.length > 0}
                    sx={{ minWidth: 120 }}
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