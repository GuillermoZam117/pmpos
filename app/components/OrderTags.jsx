import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Chip,
    Box,
    Divider
} from '@mui/material';

const OrderTags = ({ open, onClose, onConfirm, menuItem }) => {
    const [selectedTags, setSelectedTags] = useState([]);

    const handleTagToggle = (tagGroup, tag) => {
        const tagKey = `${tagGroup}:${tag}`;
        setSelectedTags(prev => {
            if (prev.includes(tagKey)) {
                return prev.filter(t => t !== tagKey);
            } else {
                return [...prev, tagKey];
            }
        });
    };

    const handleConfirm = () => {
        onConfirm(selectedTags);
        setSelectedTags([]);
        onClose();
    };

    const handleCancel = () => {
        setSelectedTags([]);
        onClose();
    };

    // Parse default order tags if they exist
    const getOrderTagGroups = () => {
        if (!menuItem?.defaultOrderTags) {
            return [];
        }

        // For now, show a placeholder for order tags
        // TODO: Implement proper order tag fetching from SambaPOS
        return [
            {
                name: 'Tamaño',
                tags: ['Pequeño', 'Mediano', 'Grande']
            },
            {
                name: 'Extras',
                tags: ['Sin cebolla', 'Extra queso', 'Picante']
            }
        ];
    };

    const orderTagGroups = getOrderTagGroups();

    if (!menuItem) return null;

    return (
        <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
            <DialogTitle>
                Personalizar: {menuItem.name || menuItem.caption}
            </DialogTitle>
            
            <DialogContent>
                {orderTagGroups.length > 0 ? (
                    orderTagGroups.map((group, groupIndex) => (
                        <Box key={groupIndex} sx={{ mb: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                {group.name}
                            </Typography>
                            
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {group.tags.map((tag, tagIndex) => (
                                    <Chip
                                        key={tagIndex}
                                        label={tag}
                                        onClick={() => handleTagToggle(group.name, tag)}
                                        variant={selectedTags.includes(`${group.name}:${tag}`) ? 'filled' : 'outlined'}
                                        color={selectedTags.includes(`${group.name}:${tag}`) ? 'primary' : 'default'}
                                        clickable
                                    />
                                ))}
                            </Box>
                            
                            {groupIndex < orderTagGroups.length - 1 && (
                                <Divider sx={{ mt: 2 }} />
                            )}
                        </Box>
                    ))
                ) : (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                        <Typography color="text.secondary">
                            No hay opciones de personalización disponibles para este producto.
                        </Typography>
                    </Box>
                )}

                {selectedTags.length > 0 && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                        <Typography variant="body2" gutterBottom>
                            Selecciones:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {selectedTags.map((tag, index) => (
                                <Chip 
                                    key={index} 
                                    label={tag.split(':')[1]} 
                                    size="small" 
                                    color="primary"
                                />
                            ))}
                        </Box>
                    </Box>
                )}
            </DialogContent>
            
            <DialogActions>
                <Button onClick={handleCancel}>
                    Cancelar
                </Button>
                <Button 
                    onClick={handleConfirm} 
                    variant="contained"
                    disabled={orderTagGroups.length > 0 && selectedTags.length === 0}
                >
                    Agregar al Ticket
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default OrderTags;