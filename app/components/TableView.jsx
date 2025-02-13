import React, { useEffect, useState } from 'react';
import { Box, Grid, Paper, Typography, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import { appconfig } from '../config';
import { getEntityScreenItems } from '../queries';

const TableButton = styled(Paper)(({ theme, color }) => ({
    padding: theme.spacing(2),
    textAlign: 'center',
    cursor: 'pointer',
    height: '120px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: color || theme.palette.background.paper,
    '&:hover': {
        opacity: 0.9,
        transform: 'scale(1.02)',
        transition: 'all 0.2s'
    }
}));

const TableView = () => {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const config = appconfig();

    useEffect(() => {
        console.log('📊 TableView mounted');
        const loadTables = async () => {
            try {
                console.log('📊 Loading entity screen items...');
                await getEntityScreenItems(config.entityScreenName, (items) => {
                    console.log('Tables loaded:', items);
                    setTables(items);
                    setLoading(false);
                });
            } catch (error) {
                console.error('Error loading tables:', error);
                setLoading(false);
            }
        };

        loadTables();
    }, []);

    const handleTableClick = (table) => {
        console.log('Selected table:', table);
        // Handle table selection
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ mb: 3 }}>
                Mesas
            </Typography>
            
            {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <CircularProgress />
                </Box>
            ) : (
                <Grid container spacing={2}>
                    {tables.map((table) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={table.name}>
                            <TableButton 
                                onClick={() => handleTableClick(table)}
                                color={table.color}
                            >
                                <Typography variant="h5" color={table.labelColor || 'inherit'}>
                                    {table.caption || table.name}
                                </Typography>
                                <Typography 
                                    variant="body2" 
                                    color={table.labelColor || 'textSecondary'}
                                    sx={{ mt: 1 }}
                                >
                                    {table.type || 'Mesa'}
                                </Typography>
                            </TableButton>
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
};

export default TableView;