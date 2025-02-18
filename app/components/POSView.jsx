import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Grid, Paper } from '@mui/material';
import Debug from 'debug';

const debug = Debug('pmpos:pos');

const POSView = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { ticket, tableId } = location.state || {};

    useEffect(() => {
        if (!ticket?.uid) {
            debug('❌ No ticket data, redirecting...');
            navigate('/tables');
            return;
        }

        debug('🎫 Loading ticket:', ticket.uid);
    }, [ticket, navigate]);

    return (
        <Box sx={{ flexGrow: 1, height: '100vh', p: 2 }}>
            <Grid container spacing={2} sx={{ height: '100%' }}>
                {/* Left Panel - Categories & Menu Items */}
                <Grid item xs={8}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                        <h2>Menu</h2>
                        <pre>{JSON.stringify({ ticket, tableId }, null, 2)}</pre>
                    </Paper>
                </Grid>

                {/* Right Panel - Ticket & Orders */}
                <Grid item xs={4}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                        <h2>Ticket #{ticket?.number || 'New'}</h2>
                        <h3>Table {tableId}</h3>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default POSView;