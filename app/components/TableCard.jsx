import React from 'react';
import { Paper, Typography, Stack, Chip } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GroupIcon from '@mui/icons-material/Group';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';

const TableCard = ({ table, onClick }) => {
    const getStatusChip = (status) => {
        switch (status) {
            case 'CUENTA':
                return (
                    <Chip
                        icon={<AttachMoneyIcon sx={{ color: 'red !important' }} />}
                        label="CUENTA"
                        sx={{ 
                            color: 'red !important',
                            backgroundColor: 'transparent',
                            border: '2px solid red',
                            fontWeight: 'bold',
                            fontSize: '1rem'
                        }}
                    />
                );
            case 'OCUPADO':
                return (
                    <Chip
                        icon={<GroupIcon sx={{ color: 'black !important' }} />}
                        label="OCUPADO"
                        sx={{ 
                            color: 'black !important',
                            backgroundColor: 'transparent',
                            border: '2px solid black',
                            fontWeight: 'bold',
                            fontSize: '1rem'
                        }}
                    />
                );
            default:
                return (
                    <Chip
                        icon={<TableRestaurantIcon sx={{ 
                            color: 'black !important',
                            fontSize: '2rem' // 2x más grande
                        }} />}
                        label="LIBRE"
                        sx={{ 
                            color: 'black !important',
                            backgroundColor: 'transparent',
                            border: '2px solid black',
                            fontWeight: 'bold',
                            fontSize: '1.5rem', // 2x más grande
                            '& .MuiChip-label': {
                                fontSize: '1.5rem', // 2x más grande para el texto
                                fontWeight: 'bold'
                            }
                        }}
                    />
                );
        }
    };

    return (
        <Paper
            elevation={3}
            onClick={onClick}
            sx={{
                p: 2,
                height: '100%',
                cursor: 'pointer',
                bgcolor: table.color || '#F5F1E6', // Color sólido según estado
                border: '2px solid black', // margen negro
                transition: 'all 0.2s',
                '&:hover': {
                    transform: 'scale(1.02)',
                    boxShadow: 6
                },
                display: 'flex',
                flexDirection: 'column',
                gap: 1
            }}
        >
            <Typography 
                variant="h4" 
                align="center"
                sx={{ 
                    fontWeight: 'bold',
                    mb: 1,
                    color: 'black !important' // Siempre texto negro
                }}
            >
                {table.name}
            </Typography>

            <Stack spacing={1} alignItems="center">
                {/* Status-based time info (priority) */}
                {table.timeInfo && (
                    <Chip
                        icon={<AccessTimeIcon sx={{ 
                            color: table.timeInfo.status === 'cuenta' ? 'red !important' : 'black !important'
                        }} />}
                        label={table.timeInfo.text}
                        sx={{ 
                            color: table.timeInfo.status === 'cuenta' ? 'red !important' : 'black !important',
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            maxWidth: '100%',
                            '& .MuiChip-label': {
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }
                        }}
                    />
                )}
                
                {/* Fallback to SambaPOS time (if no timeInfo available) */}
                {!table.timeInfo && table.timeElapsed && (
                    <Chip
                        icon={<AccessTimeIcon sx={{ color: 'black !important' }} />}
                        label={`${Math.floor(table.timeElapsed / 60000)} min`}
                        sx={{ 
                            color: 'black !important',
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            fontWeight: 'bold'
                        }}
                    />
                )}
                
                {getStatusChip(table.status)}
            </Stack>
        </Paper>
    );
};

export default TableCard;
