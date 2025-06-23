import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Chip,
    Box,
    Divider,
    TextField
} from '@mui/material';

const OrderTags = ({ open, onClose, onConfirm, menuItem, existingTags = [], isEditMode = false, orderInfo = null }) => {
    const [selectedTags, setSelectedTags] = useState([]);
    const [comments, setComments] = useState('');

    // Initialize selected tags and comments when opening in edit mode
    useEffect(() => {
        if (open && isEditMode && existingTags) {
            const tags = Array.isArray(existingTags) ? existingTags : [];
            // Separate comments from other tags
            const commentTag = tags.find(tag => tag.startsWith('Comentarios:'));
            const otherTags = tags.filter(tag => !tag.startsWith('Comentarios:'));
            
            setSelectedTags(otherTags);
            setComments(commentTag ? commentTag.replace('Comentarios:', '') : '');
        } else if (open && !isEditMode) {
            setSelectedTags([]);
            setComments('');
        }
    }, [open, isEditMode, existingTags]);

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
        // Combine selected tags with comments
        const allTags = [...selectedTags];
        if (comments.trim()) {
            allTags.push(`Comentarios:${comments.trim()}`);
        }
        onConfirm(allTags);
        setSelectedTags([]);
        setComments('');
        onClose();
    };

    const handleCancel = () => {
        setSelectedTags([]);
        setComments('');
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
                {isEditMode ? 'Editar' : 'Personalizar'}: {menuItem.name || menuItem.caption}
                {isEditMode && orderInfo && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Cantidad: {orderInfo.quantity} • {orderInfo.portion || 'Normal'}
                    </Typography>
                )}
            </DialogTitle>
            
            <DialogContent>
                {orderTagGroups.length > 0 && (
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
                            
                            <Divider sx={{ mt: 2, mb: 3 }} />
                        </Box>
                    ))
                )}

                {/* Comments Section - Always Available */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Comentarios
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Agregar comentarios especiales (ej: sin cebolla, extra picante, etc.)"
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        variant="outlined"
                        sx={{ mb: 2 }}
                    />
                </Box>

                {(selectedTags.length > 0 || comments.trim()) && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                        <Typography variant="body2" gutterBottom>
                            Selecciones:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                            {selectedTags.map((tag, index) => (
                                <Chip 
                                    key={index} 
                                    label={tag.split(':')[1]} 
                                    size="small" 
                                    color="primary"
                                />
                            ))}
                        </Box>
                        {comments.trim() && (
                            <Box sx={{ mt: 1 }}>
                                <Chip 
                                    label={`💬 ${comments.trim()}`}
                                    size="small" 
                                    color="secondary"
                                    variant="outlined"
                                />
                            </Box>
                        )}
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
                >
                    {isEditMode ? 'Actualizar' : 'Agregar al Ticket'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default OrderTags;