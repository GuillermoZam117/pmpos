/**
 * Sales Reports Dialog
 * Displays hour-by-hour sales chart and top products report
 */
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Stack,
    Tabs,
    Tab,
    Paper,
    Grid,
    Chip,
    CircularProgress,
    Alert,
    Divider,
    LinearProgress,
    IconButton
} from '@mui/material';
import {
    Timeline as TimelineIcon,
    TrendingUp as TrendingUpIcon,
    Refresh as RefreshIcon,
    Assessment as AssessmentIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import { formatMXN } from '../../utils/currencyFormatter';
import salesSummaryService from '../../services/salesSummaryService';
import reportService from '../../services/reportService';
import PropTypes from 'prop-types';

const SalesReportsDialog = ({ open, onClose, departmentName }) => {
    const [currentTab, setCurrentTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [hourlyData, setHourlyData] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState(null);

    const loadReportsData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Get sales summary
            const summaryData = await salesSummaryService.getSalesSummary({
                departmentName,
                useCache: false
            });
            setSummary(summaryData);

            // Get hourly sales breakdown
            const hourlySalesData = await reportService.getHourlySales({
                departmentName,
                useCache: false
            });
            setHourlyData(hourlySalesData);

            // Get top products
            const topProductsData = await reportService.getTopProducts({
                departmentName,
                limit: 10,
                useCache: false
            });
            setTopProducts(topProductsData);
        } catch (err) {
            console.error('Error loading reports:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            loadReportsData();
        }
    }, [open, departmentName]);

    const maxHourlySales = Math.max(...hourlyData.map(h => h.sales), 1);
    const maxProductQuantity = Math.max(...topProducts.map(p => p.quantity), 1);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { height: '85vh' }
            }}
        >
            <DialogTitle>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <AssessmentIcon />
                        <Typography variant="h6">Reportes de Ventas</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                        <IconButton size="small" onClick={loadReportsData} disabled={loading}>
                            <RefreshIcon />
                        </IconButton>
                        <IconButton size="small" onClick={onClose}>
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </Stack>
            </DialogTitle>

            <DialogContent dividers>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        Error cargando reportes: {error}
                    </Alert>
                )}

                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        {/* Summary cards */}
                        {summary && (
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={4}>
                                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                                        <Typography variant="h4" color="primary">
                                            {summary.ticketCount}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Tickets
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={4}>
                                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                                        <Typography variant="h4" color="success.main">
                                            {formatMXN(summary.totalSales)}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Ventas Totales
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={4}>
                                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                                        <Typography variant="h4" color="info.main">
                                            {formatMXN(summary.avgTicket)}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Ticket Promedio
                                        </Typography>
                                    </Paper>
                                </Grid>
                            </Grid>
                        )}

                        <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)} sx={{ mb: 2 }}>
                            <Tab icon={<TimelineIcon />} label="Ventas por Hora" iconPosition="start" />
                            <Tab icon={<TrendingUpIcon />} label="Productos Top" iconPosition="start" />
                        </Tabs>

                        {/* Tab 1: Hourly Sales Chart */}
                        {currentTab === 0 && (
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="h6" gutterBottom>
                                    Ventas por Hora
                                </Typography>
                                <Divider sx={{ mb: 2 }} />

                                {hourlyData.length === 0 ? (
                                    <Alert severity="info">
                                        No hay datos de ventas por hora disponibles
                                    </Alert>
                                ) : (
                                    <Box sx={{ minHeight: 400 }}>
                                        {/* Simple bar chart using CSS */}
                                        <Stack spacing={1}>
                                            {hourlyData
                                                .filter(h => h.sales > 0)
                                                .sort((a, b) => b.sales - a.sales)
                                                .slice(0, 12) // Top 12 hours
                                                .map((hour) => {
                                                    const percentage = (hour.sales / maxHourlySales) * 100;
                                                    return (
                                                        <Box key={hour.hour}>
                                                            <Stack
                                                                direction="row"
                                                                alignItems="center"
                                                                spacing={2}
                                                                sx={{ mb: 0.5 }}
                                                            >
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{ minWidth: 60, fontWeight: 'bold' }}
                                                                >
                                                                    {hour.label}
                                                                </Typography>
                                                                <Box sx={{ flexGrow: 1 }}>
                                                                    <LinearProgress
                                                                        variant="determinate"
                                                                        value={percentage}
                                                                        sx={{
                                                                            height: 24,
                                                                            borderRadius: 1,
                                                                            bgcolor: 'action.hover',
                                                                            '& .MuiLinearProgress-bar': {
                                                                                bgcolor: 'primary.main',
                                                                                borderRadius: 1
                                                                            }
                                                                        }}
                                                                    />
                                                                </Box>
                                                                <Stack alignItems="flex-end" sx={{ minWidth: 140 }}>
                                                                    <Typography variant="body2" fontWeight="bold">
                                                                        {formatMXN(hour.sales)}
                                                                    </Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {hour.tickets} tickets
                                                                    </Typography>
                                                                </Stack>
                                                            </Stack>
                                                        </Box>
                                                    );
                                                })}
                                        </Stack>
                                    </Box>
                                )}
                            </Paper>
                        )}

                        {/* Tab 2: Top Products */}
                        {currentTab === 1 && (
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="h6" gutterBottom>
                                    Productos Más Vendidos
                                </Typography>
                                <Divider sx={{ mb: 2 }} />

                                {topProducts.length === 0 ? (
                                    <Alert severity="info">
                                        No hay datos de productos disponibles
                                    </Alert>
                                ) : (
                                    <Stack spacing={2}>
                                        {topProducts.map((product, index) => {
                                            const percentage = (product.quantity / maxProductQuantity) * 100;
                                            return (
                                                <Paper
                                                    key={index}
                                                    variant="outlined"
                                                    sx={{
                                                        p: 2,
                                                        '&:hover': { bgcolor: 'action.hover' }
                                                    }}
                                                >
                                                    <Stack direction="row" alignItems="center" spacing={2}>
                                                        <Chip
                                                            label={`#${index + 1}`}
                                                            color="primary"
                                                            size="small"
                                                        />
                                                        <Box sx={{ flexGrow: 1 }}>
                                                            <Typography variant="subtitle1" fontWeight="bold">
                                                                {product.name}
                                                            </Typography>
                                                            <Stack direction="row" spacing={1} alignItems="center">
                                                                <Chip
                                                                    label={product.category}
                                                                    size="small"
                                                                    variant="outlined"
                                                                />
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {product.quantity} unidades
                                                                </Typography>
                                                            </Stack>
                                                            <Box sx={{ mt: 1 }}>
                                                                <LinearProgress
                                                                    variant="determinate"
                                                                    value={percentage}
                                                                    sx={{
                                                                        height: 8,
                                                                        borderRadius: 1,
                                                                        bgcolor: 'action.hover',
                                                                        '& .MuiLinearProgress-bar': {
                                                                            bgcolor: 'success.main',
                                                                            borderRadius: 1
                                                                        }
                                                                    }}
                                                                />
                                                            </Box>
                                                        </Box>
                                                        <Stack alignItems="flex-end">
                                                            <Typography variant="h6" color="success.main">
                                                                {formatMXN(product.total)}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {formatMXN(product.total / product.quantity)} c/u
                                                            </Typography>
                                                        </Stack>
                                                    </Stack>
                                                </Paper>
                                            );
                                        })}
                                    </Stack>
                                )}
                            </Paper>
                        )}
                    </>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>Cerrar</Button>
                <Button
                    variant="contained"
                    startIcon={<RefreshIcon />}
                    onClick={loadReportsData}
                    disabled={loading}
                >
                    Actualizar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

SalesReportsDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    departmentName: PropTypes.string
};

export default SalesReportsDialog;
