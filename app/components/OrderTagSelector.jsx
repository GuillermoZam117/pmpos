/**
 * Componente simplificado para selección de etiquetas de orden
 * UI moderna, user-friendly, mobile-responsive con dark mode
 */

import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Box, Chip, Grid, Alert,
    CircularProgress, IconButton, useTheme, Divider,
    Card, CardContent, Stack, useMediaQuery
} from '@mui/material';
import {
    Close as CloseIcon,
    LocalOffer as TagIcon,
    Check as CheckIcon,
    Restaurant as RestaurantIcon
} from '@mui/icons-material';
import { orderService } from '../services/orderService';
import orderTagService from '../services/orderTagService';
import productOrderTagsIndex from '../services/productOrderTagsIndex';
import Debug from 'debug';

const debug = Debug('pmpos:order-tag-selector');

const OrderTagSelector = ({
    terminalId,
    product,
    orderUid,
    open,
    onClose,
    onTagsSelected
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [loading, setLoading] = useState(false);
    const [availableTags, setAvailableTags] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [error, setError] = useState(null);
    const [tagGroups, setTagGroups] = useState([]);

    // Precargar las order tags disponibles para este producto
    useEffect(() => {
        if (open && product) {
            loadAvailableOrderTags();
        }
    }, [open, product]);

    const loadAvailableOrderTags = async () => {
        setLoading(true);
        setError(null);

        try {
            debug('🏷️ Cargando order tags para producto:', product);
            console.log('🏷️ DEBUG - Producto completo:', JSON.stringify(product, null, 2));

            let groupedTags = [];

            // Método 1: Usar el índice precargado con nombre y porción
            if (product.Name) {
                debug('🔍 Buscando en índice precargado:', product.Name);
                console.log('🔍 DEBUG - Buscando en índice:', { name: product.Name, portion: product.Portion || 'Normal' });
                const portion = product.Portion || 'Normal';
                groupedTags = await productOrderTagsIndex.get(product.Name, portion);
                debug('📋 Tags desde índice:', groupedTags?.length || 0);
                console.log('📋 DEBUG - Tags desde índice:', groupedTags);
            }

            // Método 2: Si no hay resultados, usar orderTagService con productId
            if ((!groupedTags || groupedTags.length === 0) && (product.Id || product.productId)) {
                debug('🔍 Fallback a orderTagService con productId:', product.Id || product.productId);
                console.log('🔍 DEBUG - Fallback a orderTagService:', {
                    productId: product.Id || product.productId,
                    portion: product.Portion || 'Normal'
                });
                const productId = product.Id || product.productId;
                const portion = product.Portion || 'Normal';

                try {
                    const flatTags = await orderTagService.getGroups(productId, portion);
                    debug('📋 Tags desde service (flat):', flatTags?.length || 0);
                    console.log('📋 DEBUG - Tags desde service (raw):', flatTags);

                    if (flatTags && flatTags.length > 0) {
                        // Convertir formato plano a formato agrupado
                        const groups = {};
                        flatTags.forEach(tag => {
                            const groupName = tag.group || 'Opciones';
                            if (!groups[groupName]) {
                                groups[groupName] = [];
                            }
                            groups[groupName].push({
                                Id: tag.id || tag.name, // Generar ID si no existe
                                Name: tag.name,
                                Price: tag.price || 0,
                                GroupName: groupName
                            });
                        });

                        groupedTags = Object.keys(groups).map(groupName => ({
                            name: groupName,
                            tags: groups[groupName]
                        }));
                        console.log('📋 DEBUG - Tags agrupadas procesadas:', groupedTags);
                    }
                } catch (serviceError) {
                    debug('⚠️ Error en orderTagService:', serviceError);
                    console.error('⚠️ DEBUG - Error en orderTagService:', serviceError);
                }
            }

            setTagGroups(groupedTags || []);

            // Convertir a formato plano para compatibilidad
            const flatTags = [];
            (groupedTags || []).forEach(group => {
                (group.tags || []).forEach(tag => {
                    flatTags.push(tag);
                });
            });
            setAvailableTags(flatTags);

            debug('✅ Order tags cargadas:', flatTags?.length || 0, 'grupos:', groupedTags?.length || 0);
            console.log('✅ DEBUG - Resultado final:', {
                flatTagsCount: flatTags?.length || 0,
                gruposCount: groupedTags?.length || 0,
                tagGroups: groupedTags,
                flatTags: flatTags
            });

            if (!groupedTags || groupedTags.length === 0) {
                debug('ℹ️ No se encontraron order tags para este producto');
                console.log('ℹ️ DEBUG - No se encontraron order tags');
            }

        } catch (err) {
            debug('❌ Error cargando order tags:', err);
            console.error('❌ DEBUG - Error principal:', err);
            setError('No se pudieron cargar las opciones para este producto');
            setAvailableTags([]);
            setTagGroups([]);
        } finally {
            setLoading(false);
        }
    };

    const organizeTagsByGroups = (tags) => {
        if (!tags || tags.length === 0) return [];

        const groups = {};

        tags.forEach(tag => {
            const groupName = tag.GroupName || tag.group || 'Opciones';
            if (!groups[groupName]) {
                groups[groupName] = [];
            }
            groups[groupName].push({
                Id: tag.Id || tag.id || tag.Name || tag.name,
                Name: tag.Name || tag.name,
                Price: tag.Price || tag.price || 0,
                GroupName: groupName
            });
        });

        return Object.keys(groups).map(groupName => ({
            name: groupName,
            tags: groups[groupName]
        }));
    };

    const handleTagSelect = (tag) => {
        const isSelected = selectedTags.find(t => t.Id === tag.Id);

        if (isSelected) {
            // Deseleccionar tag
            setSelectedTags(selectedTags.filter(t => t.Id !== tag.Id));
            debug('🏷️ Tag deseleccionada:', tag.Name);
        } else {
            // Verificar si es un tag de grupo exclusivo
            const tagGroup = tagGroups.find(g => g.tags.some(t => t.Id === tag.Id));
            if (tagGroup && tagGroup.tags.length > 1) {
                // Si es grupo exclusivo, desseleccionar otras del mismo grupo
                const otherGroupTags = tagGroup.tags.filter(t => t.Id !== tag.Id);
                const newSelectedTags = selectedTags.filter(t =>
                    !otherGroupTags.some(groupTag => groupTag.Id === t.Id)
                );
                setSelectedTags([...newSelectedTags, tag]);
            } else {
                setSelectedTags([...selectedTags, tag]);
            }
            debug('🏷️ Tag seleccionada:', tag.Name);
        }
    };

    const handleApplyTags = async () => {
        if (selectedTags.length === 0) {
            onClose();
            return;
        }

        setLoading(true);
        try {
            debug('🏷️ Aplicando', selectedTags.length, 'tags seleccionadas');

            if (onTagsSelected) {
                await onTagsSelected(orderUid, selectedTags);
            }

            onClose();
        } catch (err) {
            debug('❌ Error aplicando tags:', err);
            setError('Error al aplicar las opciones seleccionadas');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedTags([]);
        setError(null);
        onClose();
    };

    const isTagSelected = (tag) => {
        return selectedTags.some(t => t.Id === tag.Id);
    };

    if (!product) {
        return null;
    }
    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="md"
            fullScreen={isMobile}
            PaperProps={{
                sx: {
                    borderRadius: isMobile ? 0 : 2,
                    maxHeight: '90vh'
                }
            }}
        >
            <DialogTitle
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    pb: 1,
                    background: theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)'
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                }}
            >
                <Box display="flex" alignItems="center" gap={2}>
                    <RestaurantIcon />
                    <Box>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                            Personaliza tu {product.Name}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                            Selecciona las opciones que deseas
                        </Typography>
                    </Box>
                </Box>
                <IconButton
                    onClick={handleClose}
                    sx={{ color: 'white' }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                        <CircularProgress />
                        <Typography variant="body2" sx={{ ml: 2 }}>
                            Cargando opciones...
                        </Typography>
                    </Box>
                ) : tagGroups.length === 0 ? (
                    <Box textAlign="center" py={4}>
                        <TagIcon sx={{ fontSize: 48, opacity: 0.5, mb: 2 }} />
                        <Typography variant="h6" color="textSecondary" gutterBottom>
                            No hay opciones disponibles
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            Este producto no tiene personalizaciones adicionales
                        </Typography>
                    </Box>
                ) : (
                    <Stack spacing={3}>
                        {tagGroups.map((group, groupIndex) => (
                            <Card
                                key={groupIndex}
                                elevation={0}
                                sx={{
                                    border: 1,
                                    borderColor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200',
                                    borderRadius: 2
                                }}
                            >
                                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                    <Typography
                                        variant="h6"
                                        gutterBottom
                                        sx={{
                                            fontWeight: 600,
                                            color: theme.palette.primary.main,
                                            mb: 2
                                        }}
                                    >
                                        {group.name}
                                    </Typography>

                                    <Grid container spacing={1}>
                                        {group.tags.map((tag) => (
                                            <Grid item xs={12} sm={6} md={4} key={tag.Id}>
                                                <Chip
                                                    label={tag.Name}
                                                    onClick={() => handleTagSelect(tag)}
                                                    color={isTagSelected(tag) ? "primary" : "default"}
                                                    variant={isTagSelected(tag) ? "filled" : "outlined"}
                                                    icon={isTagSelected(tag) ? <CheckIcon /> : <TagIcon />}
                                                    sx={{
                                                        width: '100%',
                                                        height: 48,
                                                        fontSize: '0.9rem',
                                                        fontWeight: isTagSelected(tag) ? 600 : 400,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        '&:hover': {
                                                            transform: 'translateY(-1px)',
                                                            boxShadow: theme.shadows[4]
                                                        },
                                                        ...(tag.Price && tag.Price > 0 && {
                                                            '&::after': {
                                                                content: `"+$${tag.Price}"`,
                                                                marginLeft: 1,
                                                                fontSize: '0.8rem',
                                                                opacity: 0.8
                                                            }
                                                        })
                                                    }}
                                                />
                                            </Grid>
                                        ))}
                                    </Grid>
                                </CardContent>
                            </Card>
                        ))}

                        {selectedTags.length > 0 && (
                            <Card
                                elevation={0}
                                sx={{
                                    border: 1,
                                    borderColor: theme.palette.primary.main,
                                    backgroundColor: theme.palette.mode === 'dark'
                                        ? 'rgba(25, 118, 210, 0.08)'
                                        : 'rgba(25, 118, 210, 0.04)'
                                }}
                            >
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Opciones seleccionadas ({selectedTags.length})
                                    </Typography>
                                    <Box display="flex" flexWrap="wrap" gap={1}>
                                        {selectedTags.map((tag) => (
                                            <Chip
                                                key={tag.Id}
                                                label={tag.Name}
                                                onDelete={() => handleTagSelect(tag)}
                                                color="primary"
                                                size="small"
                                            />
                                        ))}
                                    </Box>
                                </CardContent>
                            </Card>
                        )}
                    </Stack>
                )}
            </DialogContent>

            <DialogActions
                sx={{
                    p: { xs: 2, sm: 3 },
                    gap: 2,
                    flexDirection: isMobile ? 'column' : 'row'
                }}
            >
                <Button
                    onClick={handleClose}
                    variant="outlined"
                    size="large"
                    fullWidth={isMobile}
                    disabled={loading}
                    sx={{ minHeight: 48 }}
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleApplyTags}
                    variant="contained"
                    size="large"
                    fullWidth={isMobile}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <CheckIcon />}
                    sx={{
                        minHeight: 48,
                        fontWeight: 600,
                        ...(selectedTags.length === 0 && {
                            backgroundColor: 'grey.500',
                            '&:hover': {
                                backgroundColor: 'grey.600'
                            }
                        })
                    }}
                >
                    {loading ? 'Aplicando...' :
                        selectedTags.length === 0 ? 'Continuar sin opciones' :
                            `Aplicar ${selectedTags.length} opción${selectedTags.length > 1 ? 'es' : ''}`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default OrderTagSelector;
