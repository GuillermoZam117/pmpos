import React, { useMemo } from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GroupIcon from '@mui/icons-material/Group';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

const getStatusColor = (status) => {
    switch (status) {
        case 'OCUPADO': return '#FFFF00';  // Yellow
        case 'CUENTA': return '#FF0000';   // Red
        case 'LIBRE': return '#FFFFFF';    // White
        default: return '#E5E3D8';         // Default gray
    }
};

const StyledPaper = styled(Paper)(({ theme, status }) => ({
    padding: theme.spacing(2),
    cursor: 'pointer',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.2s ease-in-out',
    backgroundColor: getStatusColor(status),
    color: status === 'LIBRE' ? '#000000' : '#FFFFFF',
    '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: theme.shadows[4]
    }
}));

const InfoRow = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1)
}));

const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    return hours > 0 
        ? `${hours}h ${minutes % 60}m`
        : `${minutes}m`;
};

const TableCard = ({ table, onClick }) => {
    const statusColor = useMemo(() => {
        switch (table.status) {
            case 'OCUPADO': return 'warning';
            case 'RESERVADO': return 'info';
            case 'BLOQUEADO': return 'error';
            default: return 'success';
        }
    }, [table.status]);

    return (
        <StyledPaper 
            elevation={2}
            onClick={onClick}
            status={table.status}
        >
            <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                height: '100%',
                gap: 1
            }}>
                <Typography variant="h5" align="center">
                    {table.name}
                </Typography>
                
                <Chip
                    label={table.status}
                    color={statusColor}
                    size="small"
                    sx={{ alignSelf: 'center' }}
                />

                {table.occupancy && (
                    <>
                        <InfoRow>
                            <AccessTimeIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                                {formatTime(table.occupancy.timeElapsed)}
                            </Typography>
                        </InfoRow>

                        {table.occupancy.guestCount > 0 && (
                            <InfoRow>
                                <GroupIcon fontSize="small" color="action" />
                                <Typography variant="body2">
                                    {table.occupancy.guestCount} personas
                                </Typography>
                            </InfoRow>
                        )}

                        {table.occupancy.amount > 0 && (
                            <Box sx={{ 
                                mt: 'auto', 
                                pt: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 0.5
                            }}>
                                <AttachMoneyIcon color="primary" />
                                <Typography 
                                    variant="h6" 
                                    color="primary"
                                >
                                    {table.occupancy.amount.toFixed(2)}
                                </Typography>
                            </Box>
                        )}
                    </>
                )}
            </Box>
        </StyledPaper>
    );
};

export default React.memo(TableCard);