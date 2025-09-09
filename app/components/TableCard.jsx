import React from 'react';
import { Paper, Typography, Stack, Chip } from '@mui/material';
import AccessTimeOutlined from '@mui/icons-material/AccessTimeOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import GroupOutlined from '@mui/icons-material/GroupOutlined';
import AttachMoneyOutlined from '@mui/icons-material/AttachMoneyOutlined';
import EventSeatOutlined from '@mui/icons-material/EventSeatOutlined';

const TableCard = ({ table, onClick }) => {
    const getStatusChip = (status) => {
        switch (status) {
            case 'CUENTA':
                return (
                    <Chip
                        icon={<AttachMoneyOutlined sx={{ color: '#dc2626 !important' }} />}
                        label="CUENTA"
                        sx={{ 
                            color: '#dc2626 !important',
                            backgroundColor: 'rgba(220, 38, 38, 0.1)',
                            border: '1px solid #dc2626',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            backdropFilter: 'blur(4px)'
                        }}
                    />
                );
            case 'OCUPADO':
                return (
                    <Chip
                        icon={<GroupOutlined sx={{ color: '#d97706 !important' }} />}
                        label="OCUPADO"
                        sx={{ 
                            color: '#d97706 !important',
                            backgroundColor: 'rgba(217, 119, 6, 0.1)',
                            border: '1px solid #d97706',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            backdropFilter: 'blur(4px)'
                        }}
                    />
                );
            case 'BLOQUEADO':
                return (
                    <Chip
                        icon={<AttachMoneyOutlined sx={{ color: '#dc2626 !important' }} />}
                        label="BLOQUEADO"
                        sx={{ 
                            color: '#dc2626 !important',
                            backgroundColor: 'rgba(220, 38, 38, 0.1)',
                            border: '1px solid #dc2626',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            backdropFilter: 'blur(4px)'
                        }}
                    />
                );
            default:
                return (
                    <Chip
                        icon={<EventSeatOutlined sx={{ 
                            color: '#374151 !important',
                            fontSize: '1.25rem'
                        }} />}
                        label="LIBRE"
                        sx={{ 
                            color: '#374151 !important',
                            backgroundColor: 'rgba(55, 65, 81, 0.1)',
                            border: '1px solid #9ca3af',
                            fontWeight: 600,
                            fontSize: '1rem',
                            backdropFilter: 'blur(4px)',
                            '& .MuiChip-label': {
                                fontWeight: 600
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
                bgcolor: table.color || '#f5f5f4', // Solid color exactly matching SambaPOS
                border: '2px solid #374151',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                '&:hover': {
                    transform: 'scale(1.02)',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
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
                    color: '#000000', // Always black text for contrast on light backgrounds
                    textShadow: 'none'
                }}
            >
                {table.name}
            </Typography>

            <Stack spacing={1} alignItems="center">
                {/* Status-based time info (priority) */}
                {table.timeInfo && (
                    <Chip
                        icon={<AccessTimeOutlined sx={{ 
                            color: table.timeInfo.status === 'cuenta' ? '#dc2626 !important' : '#374151 !important'
                        }} />}
                        label={table.timeInfo.text}
                        sx={{ 
                            color: table.timeInfo.status === 'cuenta' ? '#dc2626' : '#374151',
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            border: `1px solid ${table.timeInfo.status === 'cuenta' ? '#dc2626' : '#374151'}`,
                            fontWeight: 'bold',
                            fontSize: '0.8rem',
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
                        icon={<AccessTimeOutlined sx={{ color: '#374151 !important' }} />}
                        label={`${Math.floor(table.timeElapsed / 60000)} min`}
                        sx={{ 
                            color: '#374151',
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            border: '1px solid #374151',
                            fontWeight: 'bold'
                        }}
                    />
                )}
                
                {getStatusChip(table.status)}

                {/* Show ticket number when available */}
                {table.ticketNumber && (
                    <Chip
                        icon={<ReceiptLongOutlined sx={{ color: '#111827 !important' }} />}
                        label={`Ticket #${String(table.ticketNumber)}`}
                        sx={{
                            color: '#111827',
                            backgroundColor: 'rgba(17, 24, 39, 0.06)',
                            border: '1px solid #9ca3af',
                            fontWeight: 600,
                            fontSize: '0.8rem'
                        }}
                    />
                )}
            </Stack>
        </Paper>
    );
};

export default TableCard;
