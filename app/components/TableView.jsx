import React, { useEffect, useState, useCallback } from 'react';
import { 
    Box, 
    Typography, 
    Grid, 
    Alert, 
    Button,
    CircularProgress 
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import TableCard from './TableCard';
import { getEntityScreenItems } from '../queries';
import { useNavigate } from 'react-router-dom';
import Debug from 'debug';

const debug = Debug('pmpos:tables');

const TableView = () => {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const loadTables = useCallback(async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            debug('🔄 Fetching tables from SambaPOS...');
            const items = await getEntityScreenItems('MESAS');
            
            // Process tables data
            const processedTables = items.map(table => ({
                ...table,
                status: parseTableStatus(table),
                timeElapsed: parseTimeFromCaption(table.caption)
            }));

            debug(`✅ Loaded ${processedTables.length} tables`);
            setTables(processedTables);
            setError(null);
        } catch (err) {
            debug('❌ Error loading tables:', err);
            setError(err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const parseTableStatus = (table) => {
        if (table.color === '#FF0000') return 'OCUPADO';
        if (table.color === '#FFFF00') return 'RESERVADO';
        if (table.color === '#E5E3D8') return 'LIBRE';
        return 'BLOQUEADO';
    };

    const parseTimeFromCaption = (caption) => {
        if (!caption) return null;
        const match = caption.match(/(\d+)\s*min/);
        return match ? parseInt(match[1], 10) * 60000 : null;
    };

    const handleTableClick = useCallback((table) => {
        debug('🎯 Table clicked:', table);
        // Add your table click logic here
        // For example, navigate to table details:
        navigate(`/tables/${table.name}`, { 
            state: { 
                table,
                returnTo: '/tables'
            }
        });
    }, [navigate]);

    useEffect(() => {
        loadTables();
        const interval = setInterval(() => loadTables(true), 30000);
        return () => clearInterval(interval);
    }, [loadTables]);

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
                position: 'sticky',
                top: 0,
                bgcolor: 'background.default',
                zIndex: 1
            }}>
                <Typography variant="h4">
                    Mesas
                </Typography>
                <Button
                    variant="outlined"
                    onClick={() => loadTables(true)}
                    disabled={refreshing}
                    startIcon={<RefreshIcon />}
                >
                    Actualizar
                </Button>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            ) : error ? (
                <Alert 
                    severity="error"
                    action={
                        <Button color="inherit" size="small" onClick={() => loadTables()}>
                            Reintentar
                        </Button>
                    }
                >
                    {error}
                </Alert>
            ) : (
                <Grid container spacing={2}>
                    {tables.map(table => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={table.name}>
                            <TableCard 
                                table={table}
                                onClick={() => handleTableClick(table)}
                            />
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
};

export default TableView;