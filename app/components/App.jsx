import React, { Component } from 'react';
import { authenticateUser, getMenu, getTables, createTicket } from '../queries';
import Login from './Login';
import Menu from './Menu/Menu';
import MyTickets from './MyTickets';
import { Snackbar, ThemeProvider, Button } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import Header from './Header';
import TicketTotal from './TicketTotal';
import TicketTags from './TicketTags';
import Commands from './Commands';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import PinPad from './PinPad';
import { appconfig } from '../config';

// Theme configuration for MUI
const theme = createTheme({
  palette: {
    mode: 'dark', // or 'light'
  },
});

class App extends Component {
    state = {
        token: null,
        authenticated: false,
        loading: true,
        error: null,
        menu: null,
        tables: [],
        user: null
    };

    componentDidMount() {
        this.initializeApp();
    }

    initializeApp = async () => {
        try {
            const authResult = await authService.login('graphiql', 'graphiql');
            console.log('Token obtenido:', authResult);

            if (authResult && authResult.token) {
                this.setState({
                    token: authResult.token,  // Make sure this is being set
                    authenticated: true,
                    loading: false
                });
            }
        } catch (error) {
            console.error('Error en autenticación inicial:', error);
            this.setState({
                error: 'No se pudo inicializar la aplicación',
                loading: false
            });
        }
    };

    loadMenu = async () => {
        this.setState({ loading: true });
        await getMenu((menu) => {
            if (menu) {
                this.setState({ menu, loading: false });
            } else {
                this.setState({ error: 'Error al cargar el menú', loading: false });
            }
        }, this.state.token);  // Pass token here
    };

    loadTables = async () => {
        await getTables((tables) => {
            if (tables) {
                this.setState({ tables });
            } else {
                console.warn('No se pudieron cargar las mesas');
            }
        }, this.state.token);  // Pass token here
    };

    handlePinSubmit = async (pin) => {
        try {
            console.log('Validando PIN:', pin);
            const user = await userService.validatePin(pin);
            console.log('Respuesta validación:', user);
            
            if (user) {
                // Store token in localStorage and state
                const token = localStorage.getItem('access_token');
                
                this.setState({ 
                    user,
                    token,
                    error: null
                }, () => {
                    // Pass token to load functions
                    this.loadMenu();
                    this.loadTables();
                });
            } else {
                this.setState({ 
                    error: 'Usuario no encontrado',
                    user: null 
                });
            }
        } catch (error) {
            console.error('Error en validación:', error);
            this.setState({ 
                error: error.message || 'PIN inválido',
                user: null 
            });
        }
    };

    handleCreateTicket = async (ticketData) => {
        await createTicket(ticketData, (ticket) => {
            if (ticket) {
                console.log('Ticket creado:', ticket);
            } else {
                console.error('Fallo al crear ticket');
            }
        });
    };

    handleLogout = () => {
        authService.logout();
        window.location.reload();
    };

    render() {
        const { loading, error, authenticated, menu, tables, user } = this.state;

        if (loading) {
            return <div>Iniciando aplicación...</div>;
        }

        if (error) {
            return <div>Error: {error}</div>;
        }

        if (!authenticated) {
            return <div>No se pudo autenticar la aplicación</div>;
        }

        if (!user) {
            return (
                <PinPad 
                    onPinSubmit={this.handlePinSubmit}
                    error={error}
                />
            );
        }

        return (
            <ThemeProvider theme={theme}>
                <div className="mainDiv">
                    <Header />
                    <Button 
                        onClick={this.handleLogout}
                        sx={{ position: 'absolute', top: 10, right: 10 }}
                    >
                        Logout
                    </Button>
                    <div className="mainBody">
                        <Menu menu={menu} />
                        <MyTickets />
                    </div>
                    <TicketTags />
                    <Commands />
                    <TicketTotal />
                    {error && <div className="error">{error}</div>}
                    <Snackbar
                        open={!!error}
                        message={error}
                        autoHideDuration={4000}
                        onClose={() => this.setState({ error: null })}
                    />
                </div>
            </ThemeProvider>
        );
    }
}

export default App;
