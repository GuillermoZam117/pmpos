/**
 * Sales Summary Card Component
 * Displays quick sales summary for the current shift
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Grid,
    Chip,
    IconButton,
    Collapse,
    Divider,
    Stack,
    Box,
    CircularProgress,
    Tooltip,
    List,
    ListItem,
    ListItemText
} from '@mui/material';
import {
    ExpandMore as ExpandIcon,
    ExpandLess as CollapseIcon,
    Refresh as RefreshIcon,
    TrendingUp as TrendingIcon,
    Receipt as TicketIcon,
    AttachMoney as MoneyIcon,
    Assessment as ChartIcon
} from '@mui/icons-material';
import salesSummaryService from '../services/salesSummaryService';
import { formatMXN } from '../utils/currencyFormatter';
import PropTypes from 'prop-types';

const SalesSummaryCard = ({ departmentName = null, compact = false }) => {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [error, setError] = useState(null);

    const loadSummary = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await salesSummaryService.getQuickSummary(departmentName);
            setSummary(data);
        } catch (err) {
            console.error('Error loading sales summary:', err);
            setError('No se pudo cargar el resumen');
            setSummary({ count: 0, total: 0, avg: 0 });
        } finally {
            setLoading(false);
        }
    }, [departmentName]);

    const loadDetailedSummary = useCallback(async () => {
        try {
            const data = await salesSummaryService.getSalesSummary({ departmentName });
            setSummary(data);
        } catch (err) {
            console.error('Error loading detailed summary:', err);
        }
    }, [departmentName]);

    useEffect(() => {
        loadSummary();

        // Auto-refresh every 60 seconds
        const interval = setInterval(loadSummary, 60000);

        return () => clearInterval(interval);
    }, [loadSummary]);

    useEffect(() => {
        if (expanded && summary && !summary.byPaymentType) {
            loadDetailedSummary();
        }
    }, [expanded, summary, loadDetailedSummary]);

    const handleRefresh = () => {
        salesSummaryService.clearCache();
        if (expanded) {
            loadDetailedSummary();
        } else {
            loadSummary();
        }
    };

    if (loading && !summary) {
        return (
            <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <CircularProgress size={24} />
                        <Typography variant="body2" color="text.secondary">
                            Cargando resumen de ventas...
                        </Typography>
                    </Stack>
                </CardContent>
            </Card>
        );
    }

    if (error && !summary) {
        return (
            <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                    <Typography variant="body2" color="error">
                        {error}
                    </Typography>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
                {/* Header */}
                <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 2 }}
                >
                    <Typography
                        variant="h6"
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                    >
                        <TrendingIcon /> Resumen del Turno
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <Tooltip title="Actualizar">
                            <IconButton size="small" onClick={handleRefresh} disabled={loading}>
                                <RefreshIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={expanded ? "Contraer" : "Expandir detalles"}>
                            <IconButton
                                size="small"
                                onClick={() => setExpanded(!expanded)}
                            >
                                {expanded ? <CollapseIcon /> : <ExpandIcon />}
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Stack>

                {/* Quick Summary */}
                {!compact && (
                    <Grid container spacing={2}>
                        <Grid item xs={4}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Chip
                                    icon={<TicketIcon />}
                                    label={`${summary?.count || 0} tickets`}
                                    color="primary"
                                    variant="outlined"
                                    sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                                />
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                    Cerrados
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={4}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Chip
                                    icon={<MoneyIcon />}
                                    label={formatMXN(summary?.total || 0)}
                                    color="success"
                                    sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                                />
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                    Total Vendido
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={4}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Chip
                                    icon={<ChartIcon />}
                                    label={formatMXN(summary?.avg || 0)}
                                    color="info"
                                    variant="outlined"
                                    sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                                />
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                    Promedio
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                )}

                {compact && (
                    <Stack direction="row" spacing={1} justifyContent="space-between">
                        <Chip
                            icon={<TicketIcon />}
                            label={`${summary?.count || 0}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                        />
                        <Chip
                            label={formatMXN(summary?.total || 0)}
                            size="small"
                            color="success"
                        />
                        <Chip
                            label={`Prom: ${formatMXN(summary?.avg || 0)}`}
                            size="small"
                            color="info"
                            variant="outlined"
                        />
                    </Stack>
                )}

                {/* Detailed Summary */}
                <Collapse in={expanded} timeout="auto" unmountOnExit>
                    <Divider sx={{ my: 2 }} />

                    {summary?.byPaymentType && Object.keys(summary.byPaymentType).length > 0 && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                                Por Método de Pago:
                            </Typography>
                            <List dense>
                                {Object.entries(summary.byPaymentType).map(([type, data]) => (
                                    <ListItem key={type} sx={{ py: 0.5 }}>
                                        <ListItemText
                                            primary={type}
                                            secondary={`${data.count} pago(s)`}
                                        />
                                        <Chip
                                            label={formatMXN(data.total)}
                                            size="small"
                                            color="primary"
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    )}

                    {summary?.byUser && Object.keys(summary.byUser).length > 0 && (
                        <Box>
                            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                                Por Usuario:
                            </Typography>
                            <List dense>
                                {Object.entries(summary.byUser).map(([user, data]) => (
                                    <ListItem key={user} sx={{ py: 0.5 }}>
                                        <ListItemText
                                            primary={user}
                                            secondary={`${data.count} ticket(s)`}
                                        />
                                        <Chip
                                            label={formatMXN(data.total)}
                                            size="small"
                                            color="secondary"
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    )}

                    {summary?.totalTax !== undefined && summary.totalTax > 0 && (
                        <Box sx={{ mt: 2 }}>
                            <Divider sx={{ mb: 1 }} />
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">
                                    Total Impuestos:
                                </Typography>
                                <Typography variant="body2" fontWeight="bold">
                                    {formatMXN(summary.totalTax)}
                                </Typography>
                            </Stack>
                        </Box>
                    )}
                </Collapse>
            </CardContent>
        </Card>
    );
};

SalesSummaryCard.propTypes = {
    departmentName: PropTypes.string,
    compact: PropTypes.bool
};

export default SalesSummaryCard;
