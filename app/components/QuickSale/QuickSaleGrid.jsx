/**
 * Quick Sale Grid Component
 * Displays frequent products for fast counter sales
 */
import React, { useState, useMemo } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    CardMedia,
    Typography,
    Chip,
    IconButton,
    Badge,
    Stack,
    Tooltip,
    Alert,
    Button,
    useTheme
} from '@mui/material';
import {
    Add as AddIcon,
    Remove as RemoveIcon,
    RestaurantMenu as MenuIcon,
    Settings as SettingsIcon,
    ShoppingCart as CartIcon
} from '@mui/icons-material';
import { formatMXN } from '../../utils/currencyFormatter';
import { getQuickProductPrice } from '../../config/quickSale';
import PropTypes from 'prop-types';

const QuickSaleGrid = ({
    products = [],
    cart = [],
    onAddToCart,
    onRemoveFromCart,
    onProductConfig,
    onOpenFullMenu,
    compact = false
}) => {
    const theme = useTheme();
    const [selectedProduct, setSelectedProduct] = useState(null);

    // Get quantity of product in cart
    const getCartQuantity = (productId) => {
        const cartItem = cart.find(item =>
            item.productId === productId || item.id === productId
        );
        return cartItem?.quantity || 0;
    };

    // Calculate total items in cart
    const cartTotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    }, [cart]);

    const handleProductClick = (product) => {
        setSelectedProduct(product);
        onAddToCart?.(product);
    };

    const handleQuickAdd = (e, product) => {
        e.stopPropagation();
        onAddToCart?.(product);
    };

    const handleQuickRemove = (e, product) => {
        e.stopPropagation();
        onRemoveFromCart?.(product);
    };

    if (!products || products.length === 0) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert
                    severity="info"
                    action={
                        <Button
                            size="small"
                            onClick={onProductConfig}
                            startIcon={<SettingsIcon />}
                        >
                            Configurar
                        </Button>
                    }
                >
                    No hay productos frecuentes configurados.
                    Añade productos desde el menú completo.
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%' }}>
            {/* Header con botón de configuración */}
            <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 2, px: { xs: 1, sm: 2 } }}
            >
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MenuIcon /> Productos Frecuentes
                </Typography>
                <Stack direction="row" spacing={1}>
                    {onOpenFullMenu && (
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={onOpenFullMenu}
                        >
                            Menú Completo
                        </Button>
                    )}
                    {onProductConfig && (
                        <Tooltip title="Configurar productos frecuentes">
                            <IconButton size="small" onClick={onProductConfig}>
                                <SettingsIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
            </Stack>

            {/* Grid de productos */}
            <Grid container spacing={compact ? 1 : 2} sx={{ px: { xs: 1, sm: 2 } }}>
                {products.map((product, index) => {
                    const price = getQuickProductPrice(product);
                    const quantity = getCartQuantity(product.id || product.productId);
                    const hasOptions = (product.portions && product.portions.length > 1) ||
                                      (product.orderTags && product.orderTags.length > 0);

                    return (
                        <Grid
                            item
                            xs={6}
                            sm={4}
                            md={3}
                            lg={2}
                            key={product.id || product.productId || index}
                        >
                            <Card
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    transition: 'all 0.2s',
                                    border: quantity > 0 ? `2px solid ${theme.palette.success.main}` : undefined,
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: theme.shadows[8]
                                    },
                                    '&:active': {
                                        transform: 'translateY(-2px)'
                                    }
                                }}
                                onClick={() => handleProductClick(product)}
                            >
                                {/* Badge de cantidad en carrito */}
                                {quantity > 0 && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            zIndex: 1
                                        }}
                                    >
                                        <Badge
                                            badgeContent={quantity}
                                            color="success"
                                            sx={{
                                                '& .MuiBadge-badge': {
                                                    fontSize: '1rem',
                                                    height: 28,
                                                    minWidth: 28,
                                                    borderRadius: '50%'
                                                }
                                            }}
                                        >
                                            <CartIcon color="success" />
                                        </Badge>
                                    </Box>
                                )}

                                {/* Imagen del producto */}
                                {product.image && (
                                    <CardMedia
                                        component="img"
                                        height={compact ? "100" : "140"}
                                        image={product.image}
                                        alt={product.name}
                                        sx={{ objectFit: 'cover' }}
                                    />
                                )}

                                <CardContent sx={{ flexGrow: 1, p: compact ? 1.5 : 2 }}>
                                    <Typography
                                        variant={compact ? "body2" : "subtitle1"}
                                        fontWeight="bold"
                                        gutterBottom
                                        sx={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            minHeight: compact ? '2.5em' : '3em'
                                        }}
                                    >
                                        {product.name}
                                    </Typography>

                                    {product.categoryName && !compact && (
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ display: 'block', mb: 1 }}
                                        >
                                            {product.categoryName}
                                        </Typography>
                                    )}

                                    <Stack
                                        direction="row"
                                        justifyContent="space-between"
                                        alignItems="center"
                                        spacing={1}
                                    >
                                        <Chip
                                            label={formatMXN(price)}
                                            color="primary"
                                            size={compact ? "small" : "medium"}
                                            sx={{ fontWeight: 'bold' }}
                                        />

                                        {/* Botones rápidos +/- */}
                                        {quantity > 0 && (
                                            <Stack direction="row" spacing={0.5}>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={(e) => handleQuickRemove(e, product)}
                                                    sx={{
                                                        bgcolor: 'error.light',
                                                        '&:hover': { bgcolor: 'error.main' }
                                                    }}
                                                >
                                                    <RemoveIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="success"
                                                    onClick={(e) => handleQuickAdd(e, product)}
                                                    sx={{
                                                        bgcolor: 'success.light',
                                                        '&:hover': { bgcolor: 'success.main' }
                                                    }}
                                                >
                                                    <AddIcon fontSize="small" />
                                                </IconButton>
                                            </Stack>
                                        )}
                                    </Stack>

                                    {hasOptions && !compact && (
                                        <Typography
                                            variant="caption"
                                            color="primary"
                                            sx={{ display: 'block', mt: 0.5 }}
                                        >
                                            • Tiene opciones
                                        </Typography>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>
        </Box>
    );
};

QuickSaleGrid.propTypes = {
    products: PropTypes.array,
    cart: PropTypes.array,
    onAddToCart: PropTypes.func,
    onRemoveFromCart: PropTypes.func,
    onProductConfig: PropTypes.func,
    onOpenFullMenu: PropTypes.func,
    compact: PropTypes.bool
};

export default QuickSaleGrid;
