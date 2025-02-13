import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Button, Alert, CircularProgress } from '@mui/material';
import { getEntityScreenItems } from '../queries';
import { appconfig } from '../config';

const TableView = () => {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const config = appconfig();

    const loadTables = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('📊 Loading tables...');
            
            const items = await getEntityScreenItems(config.entityScreenName);
            console.log('📊 Tables loaded:', items?.length || 0);
            
            if (!Array.isArray(items)) {
                throw new Error('Invalid response format');
            }
            
            setTables(items);
        } catch (error) {
            const errorMessage = error.message.includes('Server error') 
                ? `Connection error: ${error.message}`
                : error.message;
                
            console.error('❌ Error loading tables:', error);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [config.entityScreenName]);

    useEffect(() => {
        loadTables();
    }, [loadTables]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" m={4}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box display="flex" flexDirection="column" alignItems="center" m={4}>
                <Alert 
                    severity="error" 
                    action={
                        <Button 
                            color="inherit" 
                            size="small" 
                            onClick={loadTables}
                        >
                            RETRY
                        </Button>
                    }
                >
                    {error}
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                mb: 2 
            }}>
                <Typography variant="h4">
                    {config.departmentName}
                </Typography>
                <Button 
                    variant="outlined" 
                    onClick={loadTables}
                >
                    Refresh
                </Button>
            </Box>
            
            {tables.length === 0 ? (
                <Alert severity="info">No tables available</Alert>
            ) : (
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: 2
                }}>
                    {tables.map((table) => (
                        <Box 
                            key={table.id} 
                            sx={{
                                p: 2,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                cursor: 'pointer',
                                backgroundColor: table.color,
                                color: table.labelColor,
                                '&:hover': {
                                    opacity: 0.9
                                }
                            }}
                        >
                            <Typography 
                                align="center"
                                dangerouslySetInnerHTML={{ __html: table.caption }}
                            />
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
};

export default TableView;