import React from 'react';
import { Typography, Button, Box } from '@mui/material';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('React Error Boundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <Box 
                    sx={{
                        p: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2
                    }}
                >
                    <Typography variant="h4" color="error">
                        Something went wrong
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        {this.state.error?.message}
                    </Typography>
                    <Button 
                        variant="contained" 
                        onClick={() => window.location.reload()}
                    >
                        Reload Application
                    </Button>
                </Box>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;