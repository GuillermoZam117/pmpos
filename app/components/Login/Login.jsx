import React from 'react';
import { useDispatch } from 'react-redux';
import { Grid, Button, Paper, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { loginWithPin } from '../../actions/auth';

const PinPad = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(2),
    margin: theme.spacing(2),
    maxWidth: 300,
    backgroundColor: theme.palette.background.default
}));

const PinButton = styled(Button)(({ theme }) => ({
    margin: theme.spacing(0.5),
    minWidth: '60px',
    minHeight: '60px',
    fontSize: '1.5rem'
}));

const Login = () => {
    const [pin, setPin] = React.useState('');
    const [error, setError] = React.useState('');
    const dispatch = useDispatch();

    const handleNumber = (num) => {
        if (pin.length < 6) {
            setPin(prev => prev + num);
        }
    };

    const handleClear = () => {
        setPin('');
    };

    const handleEnter = async () => {
        if (pin.length > 0) {
            try {
                setError('');
                await dispatch(loginWithPin(pin));
            } catch (err) {
                setError(err.message);
                setPin('');
            }
        }
    };

    return (
        <Grid 
            container 
            justifyContent="center" 
            alignItems="center" 
            style={{ minHeight: '100vh' }}
        >
            <PinPad elevation={3}>
                <Typography variant="h5" align="center" gutterBottom>
                    Enter PIN
                </Typography>
                
                {error && (
                    <Typography color="error" align="center" gutterBottom>
                        {error}
                    </Typography>
                )}
                
                <Typography 
                    variant="h4" 
                    align="center" 
                    style={{ margin: '20px 0' }}
                >
                    {pin.replace(/./g, '•')}
                </Typography>

                <Grid container spacing={1} justifyContent="center">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <Grid item xs={4} key={num}>
                            <PinButton
                                variant="contained"
                                color="primary"
                                onClick={() => handleNumber(num)}
                                fullWidth
                            >
                                {num}
                            </PinButton>
                        </Grid>
                    ))}
                    <Grid item xs={4}>
                        <PinButton
                            variant="contained"
                            color="secondary"
                            onClick={handleClear}
                            fullWidth
                        >
                            Clear
                        </PinButton>
                    </Grid>
                    <Grid item xs={4}>
                        <PinButton
                            variant="contained"
                            color="primary"
                            onClick={() => handleNumber(0)}
                            fullWidth
                        >
                            0
                        </PinButton>
                    </Grid>
                    <Grid item xs={4}>
                        <PinButton
                            variant="contained"
                            color="primary"
                            onClick={handleEnter}
                            fullWidth
                        >
                            Enter
                        </PinButton>
                    </Grid>
                </Grid>
            </PinPad>
        </Grid>
    );
};

export default Login;
