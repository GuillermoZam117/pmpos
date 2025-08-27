/**
 * Mobile Optimized Menu Component
 * Compact and touch-friendly menu interface
 */
import React, { useState, useMemo } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    CardMedia,
    Grid,
    Chip,
    IconButton,
    TextField,
    InputAdornment,
    Paper,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Collapse,
    Badge,
    Fab,
    useTheme,
    alpha,
} from '@mui/material';
import {
    Search as SearchIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    RestaurantMenu as MenuIcon,
    LocalOffer as OfferIcon,
    AttachMoney as PriceIcon,
    Clear as ClearIcon,
} from '@mui/icons-material';
import { formatMXN } from '../../utils/currencyFormatter';
import PropTypes from 'prop-types';

const MobileMenu = ({ menu, onMenuItemClick, compact = false }) => {
    const theme = useTheme();
    const [selectedCategory, setSelectedCategory] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCategories, setExpandedCategories] = useState(new Set());
    
    // Process menu data
    const { categories, allItems } = useMemo(() => {
        if (!menu?.categories) {
            return { categories: [], allItems: [] };
        }
        
        const cats = menu.categories || [];
        const items = [];
        
        cats.forEach(category => {
            if (category.menuItems) {
                category.menuItems.forEach(item => {
                    items.push({
                        ...item,
                        categoryName: category.name,
                        categoryColor: category.color
                    });
                });
            }
        });
        
        return { categories: cats, allItems: items };
    }, [menu]);
    
    // Filter items based on search and category
    const filteredItems = useMemo(() => {
        let items = allItems;
        
        // Filter by category
        if (selectedCategory) {
            items = items.filter(item => item.categoryName === selectedCategory);
        }
        
        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            items = items.filter(item => 
                (item.name || '').toLowerCase().includes(query) ||
                (item.caption || '').toLowerCase().includes(query) ||
                (item.description || '').toLowerCase().includes(query)
            );
        }
        
        return items;
    }, [allItems, selectedCategory, searchQuery]);
    
    // Group items by category for display
    const groupedItems = useMemo(() => {
        const groups = {};
        filteredItems.forEach(item => {
            const categoryName = item.categoryName;
            if (!groups[categoryName]) {
                groups[categoryName] = {
                    category: categories.find(c => c.name === categoryName),
                    items: []
                };
            }
            groups[categoryName].items.push(item);
        });
        return Object.entries(groups);
    }, [filteredItems, categories]);
    
    const handleCategoryToggle = (categoryName) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(categoryName)) {
            newExpanded.delete(categoryName);
        } else {
            newExpanded.add(categoryName);
        }
        setExpandedCategories(newExpanded);
    };
    
    const getItemPrice = (item) => {
        if (item.portions && item.portions.length > 0) {
            const defaultPortion = item.portions.find(p => p.isDefault) || item.portions[0];
            return parseFloat(defaultPortion.price) || 0;
        }
        if (item.product?.portions && item.product.portions.length > 0) {
            const defaultPortion = item.product.portions.find(p => p.isDefault) || item.product.portions[0];
            return parseFloat(defaultPortion.price) || 0;
        }
        return parseFloat(item.price) || 0;
    };
    
    const clearSearch = () => {
        setSearchQuery('');
        setSelectedCategory('');
    };
    
    const MenuItemCard = ({ item }) => {
        const price = getItemPrice(item);
        const hasOptions = (item.defaultOrderTags && item.defaultOrderTags.length > 0) ||
                          (item.portions && item.portions.length > 1) ||
                          (item.product?.portions && item.product.portions.length > 1);
        
        return (
            <Card 
                sx={{ 
                    mb: 1.5, 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                        boxShadow: theme.shadows[4],
                        transform: 'translateY(-1px)'
                    },
                    '&:active': {
                        transform: 'translateY(0px)'
                    }
                }}
                onClick={() => onMenuItemClick(item)}
            >
                <CardContent sx={{ p: { xs: 2.5, sm: 2 }, '&:last-child': { pb: 2 } }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box flex={1} mr={2}>
                            <Typography 
                                variant="h6" 
                                fontWeight="bold" 
                                gutterBottom
                                sx={{ 
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    fontSize: { xs: '1.05rem', sm: '1rem' }
                                }}
                            >
                                {item.name || item.caption}
                            </Typography>
                            
                            {item.description && (
                                <Typography 
                                    variant="body1" 
                                    color="text.secondary" 
                                    sx={{ 
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        mb: 1,
                                        fontSize: { xs: '0.95rem', sm: '0.9rem' }
                                    }}
                                >
                                    {item.description}
                                </Typography>
                            )}
                            
                            <Box display="flex" alignItems="center" gap={0.5} flexWrap="wrap">
                                <Chip 
                                    size="small" 
                                    label={item.categoryName}
                                    sx={{ 
                                        bgcolor: alpha(item.categoryColor || theme.palette.primary.main, 0.1),
                                        color: item.categoryColor || theme.palette.primary.main,
                                        fontWeight: 500
                                    }}
                                />
                                {hasOptions && (
                                    <Chip 
                                        size="small" 
                                        icon={<OfferIcon sx={{ fontSize: '0.8rem' }} />}
                                        label="Opciones"
                                        variant="outlined"
                                        sx={{ fontSize: '0.7rem' }}
                                    />
                                )}
                            </Box>
                        </Box>
                        
                        <Box display="flex" flexDirection="column" alignItems="flex-end">
                            {price > 0 && (
                                <Typography 
                                    variant="h5" 
                                    color="primary.main" 
                                    fontWeight="bold"
                                    sx={{ mb: 0.5, fontSize: { xs: '1.4rem', sm: '1.2rem' } }}
                                >
                                    {formatMXN(price)}
                                </Typography>
                            )}
                            {(item.portions?.length > 1 || item.product?.portions?.length > 1) && (
                                <Typography variant="caption" color="text.secondary">
                                    Desde {formatMXN(price)}
                                </Typography>
                            )}
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        );
    };
    
    if (!menu) {
        return (
            <Box sx={{ p: 2, textAlign: 'center' }}>
                <MenuIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                    No hay menú disponible
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Verificando conexión con SambaPOS...
                </Typography>
            </Box>
        );
    }

    if (!categories.length) {
        return (
            <Box sx={{ p: 2, textAlign: 'center' }}>
                <MenuIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                    Menú vacío
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    No hay categorías configuradas en SambaPOS
                </Typography>
            </Box>
        );
    }
    
    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Search Header */}
            <Box sx={{ p: 2, pb: 1 }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Buscar productos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon color="action" />
                            </InputAdornment>
                        ),
                        endAdornment: (searchQuery || selectedCategory) && (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={clearSearch}>
                                    <ClearIcon />
                                </IconButton>
                            </InputAdornment>
                        )
                    }}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 3,
                            bgcolor: 'background.paper'
                        }
                    }}
                />
                
                {/* Category Filter Chips */}
                {!searchQuery && (
                    <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                            label="Todos"
                            onClick={() => setSelectedCategory('')}
                            color={selectedCategory === '' ? 'primary' : 'default'}
                            variant={selectedCategory === '' ? 'filled' : 'outlined'}
                            size="small"
                        />
                        {categories.map(category => (
                            <Chip
                                key={category.name}
                                label={category.name}
                                onClick={() => setSelectedCategory(category.name)}
                                color={selectedCategory === category.name ? 'primary' : 'default'}
                                variant={selectedCategory === category.name ? 'filled' : 'outlined'}
                                size="small"
                                sx={{
                                    bgcolor: selectedCategory === category.name ? 
                                        (category.color || theme.palette.primary.main) : 
                                        'transparent',
                                    borderColor: category.color || theme.palette.primary.main,
                                    '&:hover': {
                                        bgcolor: alpha(category.color || theme.palette.primary.main, 0.1)
                                    }
                                }}
                            />
                        ))}
                    </Box>
                )}
            </Box>
            
            {/* Results Summary */}
            {(searchQuery || selectedCategory) && (
                <Box sx={{ px: 2, pb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        {filteredItems.length} producto{filteredItems.length !== 1 ? 's' : ''} encontrado{filteredItems.length !== 1 ? 's' : ''}
                        {selectedCategory && ` en ${selectedCategory}`}
                        {searchQuery && ` para "${searchQuery}"`}
                    </Typography>
                </Box>
            )}
            
            {/* Menu Content */}
            <Box sx={{ flex: 1, overflow: 'auto', px: 2 }}>
                {searchQuery || selectedCategory ? (
                    // Search/Filter Results
                    filteredItems.length > 0 ? (
                        filteredItems.map(item => (
                            <MenuItemCard key={`${item.categoryName || 'cat'}-${item.productId || item.id || item.name}`} item={item} />
                        ))
                    ) : (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <SearchIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary">
                                No se encontraron productos
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Prueba con otros términos de búsqueda
                            </Typography>
                        </Box>
                    )
                ) : (
                    // Category-based Menu
                    categories.map(category => {
                        const categoryItems = allItems.filter(item => item.categoryName === category.name);
                        const isExpanded = expandedCategories.has(category.name);
                        
                        return (
                            <Paper key={category.name} sx={{ mb: 2 }} elevation={1}>
                                <ListItemButton
                                    onClick={() => handleCategoryToggle(category.name)}
                                    sx={{
                                        py: 2,
                                        bgcolor: alpha(category.color || theme.palette.primary.main, 0.1),
                                        '&:hover': {
                                            bgcolor: alpha(category.color || theme.palette.primary.main, 0.15)
                                        }
                                    }}
                                >
                                    <ListItemText
                                        primary={
                                            <Typography variant="h6" fontWeight="bold" 
                                                sx={{ color: category.color || theme.palette.primary.main }}
                                            >
                                                {category.name}
                                            </Typography>
                                        }
                                        secondary={`${categoryItems.length} productos`}
                                    />
                                    <Badge badgeContent={categoryItems.length} color="primary" sx={{ mr: 1 }} />
                                    {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </ListItemButton>
                                
                                <Collapse in={isExpanded}>
                                    <Box sx={{ p: 2, pt: 1 }}>
                                        {categoryItems.map(item => (
                                            <MenuItemCard key={`${category.name}-${item.productId || item.id || item.name}`} item={item} />
                                        ))}
                                    </Box>
                                </Collapse>
                            </Paper>
                        );
                    })
                )}
            </Box>
        </Box>
    );
};

MobileMenu.propTypes = {
    menu: PropTypes.object,
    onMenuItemClick: PropTypes.func.isRequired,
    compact: PropTypes.bool
};

export default MobileMenu;
