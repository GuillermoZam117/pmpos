import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useDispatch } from 'react-redux';
import { logout } from '../actions/auth';

const Header = () => {
    const dispatch = useDispatch();

    const handleLogout = () => {
        dispatch(logout());
    };

    return (
        <AppBar position="sticky">
            <Toolbar sx={{
                minHeight: { xs: 56, sm: 64 },
                pt: 'env(safe-area-inset-top, 0px)',
                px: { xs: 1, sm: 2 },
                display: 'flex',
                flexWrap: { xs: 'wrap', sm: 'nowrap' },
                gap: 1
            }}>
                <Typography variant="h6" sx={{ color: 'common.white', fontWeight: 700 }} noWrap>
                    SAMBASOFTMX
                </Typography>
            </Toolbar>
        </AppBar>
    );
}

export default Header;
