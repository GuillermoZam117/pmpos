import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import Debug from 'debug';

const debug = Debug('pmpos:pos');

const POSView = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { ticket, tableId, isNew } = location.state || {};

    useEffect(() => {
        if (!ticket?.uid) {
            debug('❌ No ticket data, redirecting...');
            navigate('/tables');
            return;
        }

        // Load menu categories
        debug('🔄 Loading menu...');
        
    }, [ticket, navigate]);

    return (
        <div>
            <h1>POS View</h1>
            <pre>{JSON.stringify({ ticket, tableId }, null, 2)}</pre>
        </div>
    );
};

export default POSView;