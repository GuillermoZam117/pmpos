import React, { useState } from 'react';
import { Box, TextField, Button, Typography, CircularProgress } from '@mui/material';
import { authService } from '../services/authService';
import { appconfig } from '../config';

const Login = () => {
    const config = appconfig();
    const [credentials, setCredentials] = useState({ 
        username: config.userName,     // Default from config
        password: config.password      // Default from config
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            await authService.login(credentials.username, credentials.password);
            window.location.reload();
        } catch (err) {
            console.error('Login failed:', err);
            setError(`Invalid credentials. Please use ${config.userName}/${config.password}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            bgcolor: 'background.default'
        }}>
            <form onSubmit={handleLogin}>
                <Typography variant="h5" sx={{ mb: 3 }}>INCIO DE SESION SAMBAPOS_COMANDAS</Typography>
                <Box sx={{ mb: 2 }}>
                    <TextField
                        fullWidth
                        label="Username"
                        value={credentials.username}
                        onChange={(e) => setCredentials({
                            ...credentials,
                            username: e.target.value
                        })}
                        disabled={loading}
                    />
                </Box>
                <Box sx={{ mb: 2 }}>
                    <TextField
                        fullWidth
                        type="password"
                        label="Password"
                        value={credentials.password}
                        onChange={(e) => setCredentials({
                            ...credentials,
                            password: e.target.value
                        })}
                        disabled={loading}
                    />
                </Box>
                {error && (
                    <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
                )}
                <Button 
                    fullWidth 
                    variant="contained" 
                    type="submit"
                    disabled={loading}
                >
                    {loading ? <CircularProgress size={24} /> : 'Login'}
                </Button>
            </form>
        </Box>
    );
};

export default Login;