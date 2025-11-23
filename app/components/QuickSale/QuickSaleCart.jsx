/**
 * Quick Sale Cart Component
 * Floating cart for quick counter sales
 */
import React, { useState, useMemo } from 'react';
import {
    Fab,
    Badge,
    Popover,
    Paper,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Typography,
    Button,
    Divider,
    Stack,
    Box,
    Chip,
    Zoom,
    useTheme,
    useMediaQuery
} from '@mui/material';
import {
    ShoppingCart as CartIcon,
    Add as AddIcon,
    Remove as RemoveIcon,
    Delete as DeleteIcon,
    Close as CloseIcon,
    Payment as PaymentIcon
} from '@mui/icons-material';
import { formatMXN } from '../../utils/currencyFormatter';
import PropTypes from 'prop-types';

const QuickSaleCart = ({
    cart = [],
    onUpdateQuantity,
    onRemoveItem,
    onCheckout,
    onClearCart,
    position = { bottom: 24, right: 24 }
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [anchorEl, setAnchorEl] = useState(null);

    const open = Boolean(anchorEl);

    // Calculate totals
    const { itemCount, subtotal } = useMemo(() => {
        const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        const total = cart.reduce((sum, item) => {
            const price = parseFloat(item.price) || 0;
            const qty = item.quantity || 1;
            return sum + (price * qty);
        }, 0);

        return { itemCount: count, subtotal: total };
    }, [cart]);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleCheckout = () => {
        handleClose();
        onCheckout?.();
    };

    const handleIncrement = (item) => {
        onUpdateQuantity?.(item, (item.quantity || 1) + 1);
    };

    const handleDecrement = (item) => {
        if (item.quantity > 1) {
            onUpdateQuantity?.(item, item.quantity - 1);
        } else {
            onRemoveItem?.(item);
        }
    };

    const handleRemove = (item) => {
        onRemoveItem?.(item);
    };

    const handleClear = () => {
        if (window.confirm('¿Vaciar el carrito?')) {
            onClearCart?.();
            handleClose();
        }
    };

    // Don't show FAB if cart is empty
    if (cart.length === 0) {
        return null;
    }

    return (
        <>
            {/* Floating Action Button */}
            <Zoom in={cart.length > 0}>
                <Fab
                    color="primary"
                    aria-label="cart"
                    onClick={handleClick}
                    sx={{
                        position: 'fixed',
                        bottom: position.bottom,
                        right: position.right,
                        zIndex: 1000
                    }}
                >
                    <Badge
                        badgeContent={itemCount}
                        color="error"
                        max={99}
                        sx={{
                            '& .MuiBadge-badge': {
                                fontSize: '0.9rem',
                                height: 24,
                                minWidth: 24,
                                fontWeight: 'bold'
                            }
                        }}
                    >
                        <CartIcon />
                    </Badge>
                </Fab>
            </Zoom>

            {/* Cart Popover */}
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'left'
                }}
                transformOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right'
                }}
                PaperProps={{
                    sx: {
                        width: isMobile ? '90vw' : 400,
                        maxHeight: '80vh',
                        display: 'flex',
                        flexDirection: 'column'
                    }
                }}
            >
                <Paper elevation={0}>
                    {/* Header */}
                    <Box
                        sx={{
                            p: 2,
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CartIcon /> Carrito ({itemCount})
                        </Typography>
                        <IconButton
                            size="small"
                            onClick={handleClose}
                            sx={{ color: 'inherit' }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    {/* Cart Items */}
                    <List
                        sx={{
                            flexGrow: 1,
                            overflow: 'auto',
                            maxHeight: '50vh'
                        }}
                    >
                        {cart.map((item, index) => {
                            const itemTotal = (parseFloat(item.price) || 0) * (item.quantity || 1);

                            return (
                                <React.Fragment key={item.id || item.productId || index}>
                                    <ListItem
                                        sx={{
                                            py: 2,
                                            flexDirection: 'column',
                                            alignItems: 'stretch'
                                        }}
                                    >
                                        <Stack
                                            direction="row"
                                            justifyContent="space-between"
                                            alignItems="flex-start"
                                            sx={{ width: '100%', mb: 1 }}
                                        >
                                            <Box sx={{ flex: 1, pr: 1 }}>
                                                <Typography variant="subtitle2" fontWeight="bold">
                                                    {item.name}
                                                </Typography>
                                                {item.portionName && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {item.portionName}
                                                    </Typography>
                                                )}
                                                {item.orderTags && item.orderTags.length > 0 && (
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        {item.orderTags.map(t => t.tag || t).join(', ')}
                                                    </Typography>
                                                )}
                                            </Box>
                                            <Chip
                                                label={formatMXN(itemTotal)}
                                                color="primary"
                                                size="small"
                                                sx={{ fontWeight: 'bold' }}
                                            />
                                        </Stack>

                                        {/* Quantity controls */}
                                        <Stack
                                            direction="row"
                                            justifyContent="space-between"
                                            alignItems="center"
                                        >
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleDecrement(item)}
                                                    color="error"
                                                >
                                                    <RemoveIcon fontSize="small" />
                                                </IconButton>
                                                <Chip
                                                    label={item.quantity || 1}
                                                    size="small"
                                                    sx={{ minWidth: 40, fontWeight: 'bold' }}
                                                />
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleIncrement(item)}
                                                    color="success"
                                                >
                                                    <AddIcon fontSize="small" />
                                                </IconButton>
                                            </Stack>

                                            <IconButton
                                                size="small"
                                                onClick={() => handleRemove(item)}
                                                color="error"
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                    </ListItem>
                                    {index < cart.length - 1 && <Divider />}
                                </React.Fragment>
                            );
                        })}
                    </List>

                    <Divider />

                    {/* Footer with total and checkout */}
                    <Box sx={{ p: 2 }}>
                        <Stack spacing={2}>
                            {/* Subtotal */}
                            <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                            >
                                <Typography variant="h6">
                                    Total:
                                </Typography>
                                <Typography variant="h5" color="primary" fontWeight="bold">
                                    {formatMXN(subtotal)}
                                </Typography>
                            </Stack>

                            {/* Action buttons */}
                            <Button
                                variant="contained"
                                size="large"
                                fullWidth
                                onClick={handleCheckout}
                                startIcon={<PaymentIcon />}
                                sx={{
                                    py: 1.5,
                                    fontSize: '1.1rem',
                                    fontWeight: 'bold'
                                }}
                            >
                                COBRAR
                            </Button>

                            <Button
                                variant="outlined"
                                size="small"
                                fullWidth
                                onClick={handleClear}
                                color="error"
                            >
                                Vaciar carrito
                            </Button>
                        </Stack>
                    </Box>
                </Paper>
            </Popover>
        </>
    );
};

QuickSaleCart.propTypes = {
    cart: PropTypes.array,
    onUpdateQuantity: PropTypes.func,
    onRemoveItem: PropTypes.func,
    onCheckout: PropTypes.func,
    onClearCart: PropTypes.func,
    position: PropTypes.shape({
        bottom: PropTypes.number,
        right: PropTypes.number
    })
};

export default QuickSaleCart;
