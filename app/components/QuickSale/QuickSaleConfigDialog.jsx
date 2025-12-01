/**
 * Quick Sale Configuration Dialog
 * Allows users to select which products appear in the quick sale grid
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    TextField,
    InputAdornment,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Chip,
    Stack,
    Typography,
    Divider,
    Alert,
    Tabs,
    Tab,
    Badge,
    Checkbox,
    Paper,
    Grid
} from '@mui/material';
import {
    Search as SearchIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    DragIndicator as DragIcon,
    Settings as SettingsIcon,
    Check as CheckIcon
} from '@mui/icons-material';
import { getQuickSaleConfig, saveQuickSaleConfig, getQuickProductPrice } from '../../config/quickSale';
import { formatMXN } from '../../utils/currencyFormatter';
import PropTypes from 'prop-types';

const QuickSaleConfigDialog = ({ open, onClose, menuData, onSave }) => {
    const [config, setConfig] = useState({ enabled: true, products: [] });
    const [searchQuery, setSearchQuery] = useState('');
    const [currentTab, setCurrentTab] = useState(0);
    const [selectedProducts, setSelectedProducts] = useState(new Set());

    // Load current config on open
    useEffect(() => {
        if (open) {
            const currentConfig = getQuickSaleConfig();
            setConfig(currentConfig);
            setSelectedProducts(new Set(currentConfig.products.map(p => p.id || p.productId)));
        }
    }, [open]);

    // Flatten menu items
    const allMenuItems = useMemo(() => {
        if (!menuData?.categories) return [];

        const items = [];
        menuData.categories.forEach(category => {
            if (category.menuItems) {
                category.menuItems.forEach(item => {
                    items.push({
                        ...item,
                        categoryName: category.name,
                        price: getQuickProductPrice(item)
                    });
                });
            }
        });

        return items;
    }, [menuData]);

    // Filter menu items by search
    const filteredMenuItems = useMemo(() => {
        if (!searchQuery) return allMenuItems;

        const query = searchQuery.toLowerCase();
        return allMenuItems.filter(item =>
            (item.name || '').toLowerCase().includes(query) ||
            (item.categoryName || '').toLowerCase().includes(query)
        );
    }, [allMenuItems, searchQuery]);

    // Get currently selected products
    const currentProducts = useMemo(() => {
        return config.products || [];
    }, [config]);

    const handleToggleProduct = (item) => {
        const itemId = item.id || item.productId;
        const newSelected = new Set(selectedProducts);

        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
        } else {
            newSelected.add(itemId);
        }

        setSelectedProducts(newSelected);
    };

    const handleSave = () => {
        // Build products array from selected items
        const products = allMenuItems
            .filter(item => selectedProducts.has(item.id || item.productId))
            .map(item => ({
                id: item.id || item.productId,
                productId: item.productId || item.id,
                name: item.name,
                price: getQuickProductPrice(item),
                portions: item.portions || [],
                categoryName: item.categoryName,
                orderTags: item.defaultOrderTags || [],
                image: item.image || null
            }));

        const newConfig = {
            enabled: config.enabled,
            products: products
        };

        saveQuickSaleConfig(newConfig);
        onSave?.(newConfig);
        onClose();
    };

    const handleRemoveProduct = (productId) => {
        const newSelected = new Set(selectedProducts);
        newSelected.delete(productId);
        setSelectedProducts(newSelected);
    };

    const handleClearAll = () => {
        setSelectedProducts(new Set());
    };

    const handleSelectTop10 = () => {
        const top10 = allMenuItems.slice(0, 10).map(item => item.id || item.productId);
        setSelectedProducts(new Set(top10));
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { height: '80vh' }
            }}
        >
            <DialogTitle>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <SettingsIcon />
                    <Typography variant="h6">Configurar Venta Rápida</Typography>
                    <Badge badgeContent={selectedProducts.size} color="primary" sx={{ ml: 2 }}>
                        <Chip label="Productos" size="small" />
                    </Badge>
                </Stack>
            </DialogTitle>

            <DialogContent dividers>
                <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)} sx={{ mb: 2 }}>
                    <Tab label="Seleccionar Productos" />
                    <Tab label={`Productos Seleccionados (${selectedProducts.size})`} />
                </Tabs>

                {/* Tab 1: Select Products */}
                {currentTab === 0 && (
                    <Box>
                        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={handleSelectTop10}
                            >
                                Top 10
                            </Button>
                            <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={handleClearAll}
                            >
                                Limpiar Todo
                            </Button>
                        </Stack>

                        <TextField
                            fullWidth
                            placeholder="Buscar productos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                )
                            }}
                            sx={{ mb: 2 }}
                        />

                        <Alert severity="info" sx={{ mb: 2 }}>
                            Selecciona los productos que aparecerán en el grid de venta rápida.
                            Se recomienda entre 6 y 12 productos.
                        </Alert>

                        <Paper variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
                            <List>
                                {filteredMenuItems.map((item, index) => {
                                    const itemId = item.id || item.productId;
                                    const isSelected = selectedProducts.has(itemId);

                                    return (
                                        <React.Fragment key={itemId}>
                                            <ListItem
                                                button
                                                onClick={() => handleToggleProduct(item)}
                                                selected={isSelected}
                                            >
                                                <Checkbox
                                                    checked={isSelected}
                                                    edge="start"
                                                    tabIndex={-1}
                                                    disableRipple
                                                />
                                                <ListItemText
                                                    primary={item.name}
                                                    secondary={
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <Chip
                                                                label={item.categoryName}
                                                                size="small"
                                                                variant="outlined"
                                                            />
                                                            <Chip
                                                                label={formatMXN(item.price)}
                                                                size="small"
                                                                color="primary"
                                                            />
                                                        </Stack>
                                                    }
                                                />
                                                {isSelected && (
                                                    <ListItemSecondaryAction>
                                                        <CheckIcon color="primary" />
                                                    </ListItemSecondaryAction>
                                                )}
                                            </ListItem>
                                            {index < filteredMenuItems.length - 1 && <Divider />}
                                        </React.Fragment>
                                    );
                                })}

                                {filteredMenuItems.length === 0 && (
                                    <ListItem>
                                        <ListItemText
                                            primary="No se encontraron productos"
                                            secondary="Intenta con otra búsqueda"
                                        />
                                    </ListItem>
                                )}
                            </List>
                        </Paper>
                    </Box>
                )}

                {/* Tab 2: Selected Products */}
                {currentTab === 1 && (
                    <Box>
                        {selectedProducts.size === 0 ? (
                            <Alert severity="warning">
                                No has seleccionado ningún producto. Ve a la pestaña "Seleccionar Productos".
                            </Alert>
                        ) : (
                            <>
                                <Alert severity="success" sx={{ mb: 2 }}>
                                    Has seleccionado {selectedProducts.size} producto(s).
                                    Estos aparecerán en el grid de venta rápida.
                                </Alert>

                                <Grid container spacing={2}>
                                    {allMenuItems
                                        .filter(item => selectedProducts.has(item.id || item.productId))
                                        .map((item) => (
                                            <Grid item xs={6} key={item.id || item.productId}>
                                                <Paper
                                                    variant="outlined"
                                                    sx={{
                                                        p: 2,
                                                        position: 'relative',
                                                        '&:hover': { bgcolor: 'action.hover' }
                                                    }}
                                                >
                                                    <IconButton
                                                        size="small"
                                                        sx={{ position: 'absolute', top: 4, right: 4 }}
                                                        onClick={() => handleRemoveProduct(item.id || item.productId)}
                                                        color="error"
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>

                                                    <Typography variant="subtitle2" fontWeight="bold">
                                                        {item.name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        {item.categoryName}
                                                    </Typography>
                                                    <Chip
                                                        label={formatMXN(item.price)}
                                                        size="small"
                                                        color="primary"
                                                        sx={{ mt: 1 }}
                                                    />
                                                </Paper>
                                            </Grid>
                                        ))}
                                </Grid>
                            </>
                        )}
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={selectedProducts.size === 0}
                >
                    Guardar Configuración
                </Button>
            </DialogActions>
        </Dialog>
    );
};

QuickSaleConfigDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    menuData: PropTypes.object,
    onSave: PropTypes.func
};

export default QuickSaleConfigDialog;
