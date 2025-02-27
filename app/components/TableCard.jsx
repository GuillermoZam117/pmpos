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
                        icon={<AttachMoneyIcon />}
                        label="CUENTA"
                        color="error"
                        size="small"
                        sx={{ color: 'white' }}
                    />
                );
            case 'OCUPADO':
                return (
                    <Chip
                        icon={<GroupIcon />}
                        label="OCUPADO"
                        color="warning"
                        size="small"
                    />
                );
            default:
                return (
                    <Chip
                        icon={<TableRestaurantIcon />}
                        label="LIBRE"
                        color="default"
                        size="small"
                        variant="outlined"
                        sx={{ 
                            color: 'black',
                            borderColor: 'rgba(0, 0, 0, 0.23)' 
                        }}
                    />
                );
        }
    };

    return (
        <Paper
            elevation={3}
            onClick={() => onClick(table)}
            sx={{
                p: 2,
                height: '100%',
                cursor: 'pointer',
                bgcolor: table.color || '#E5E3D8',
                color: table.status === 'LIBRE' ? 'black' : 'white',
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
                    mb: 1
                }}
            >
                {table.name}
            </Typography>

            <Stack spacing={1} alignItems="center">
                {table.timeElapsed && (
                    <Chip
                        icon={<AccessTimeIcon />}
                        label={`${Math.floor(table.timeElapsed / 60000)} min`}
                        color={table.status === 'CUENTA' ? 'error' : 'warning'}
                        size="small"
                        sx={{ 
                            color: table.status === 'LIBRE' ? 'black' : 'white' 
                        }}
                    />
                )}
                {getStatusChip(table.status)}
            </Stack>
        </Paper>
    );
};

export default TableCard;