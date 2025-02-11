import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Snackbar, ThemeProvider } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import Header from './Header';
import Menu from './Menu';
import Orders from './Orders';
import TicketTotal from './TicketTotal';
import TicketTags from './TicketTags';
import Commands from './Commands';
import MyTickets from './MyTickets';
import Login from './Login/Login';
import EntityList from './Entities/EntityList';
import { 
    setTerminalId,
    setTicket, 
    closeMessage, 
    updateMessage 
} from '../actions';
import * as Queries from '../queries';

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
});

const App = ({ 
    terminalId,
    message,
    isMessageOpen,
    isAuthenticated,
    setTerminalId,
    setTicket,
    closeMessage 
}) => {
    useEffect(() => {
        const initializeTerminal = async () => {
            if (!isAuthenticated) {
                return;
            }

            const savedTerminalId = localStorage.getItem('terminalId');
            
            if (savedTerminalId) {
                const exists = await Queries.getTerminalExists(savedTerminalId);
                if (exists) {
                    Queries.getTerminalTicket(savedTerminalId, (ticket) => {
                        setTerminalId(savedTerminalId);
                        setTicket(ticket);
                    });
                } else {
                    Queries.registerTerminal((newTerminalId) => {
                        updateTerminalId(newTerminalId);
                    });
                }
            } else {
                Queries.registerTerminal((newTerminalId) => {
                    updateTerminalId(newTerminalId);
                });
            }
        };

        initializeTerminal();
    }, [isAuthenticated]); // Dependency on authentication state

    const updateTerminalId = (id) => {
        localStorage.setItem('terminalId', id);
        setTerminalId(id);
    };

    // Si no está autenticado, muestra la pantalla de login
    if (!isAuthenticated) {
        return (
            <ThemeProvider theme={theme}>
                <Router>
                    <Switch>
                        <Route path="/" component={Login} />
                    </Switch>
                </Router>
            </ThemeProvider>
        );
    }

    return (
        <ThemeProvider theme={theme}>
            <Router>
                <div className="mainDiv">
                    <Header />
                    <div className="mainBody">
                        <Menu />
                        <Orders />
                        <MyTickets />
                    </div>
                    <TicketTags />
                    <Commands />
                    <TicketTotal />
                    <Snackbar
                        open={isMessageOpen}
                        message={message}
                        autoHideDuration={4000}
                        onClose={closeMessage}
                    />
                    <Switch>
                        <Route path="/" exact component={() => <div>Home</div>} />
                        <Route path="/entities/:terminalId/:screenName" component={EntityList} />
                    </Switch>
                </div>
            </Router>
        </ThemeProvider>
    );
};

App.propTypes = {
    terminalId: PropTypes.string,
    message: PropTypes.string,
    isMessageOpen: PropTypes.bool,
    isAuthenticated: PropTypes.bool,
    ticket: PropTypes.object,
    setTerminalId: PropTypes.func.isRequired,
    setTicket: PropTypes.func.isRequired,
    closeMessage: PropTypes.func.isRequired
};

const mapStateToProps = (state) => ({
    message: state.app.getIn(['message', 'text']),
    terminalId: state.app.get('terminalId'),
    isMessageOpen: state.app.getIn(['message', 'isOpen']),
    isAuthenticated: state.app.get('isAuthenticated'),
    ticket: state.app.get('ticket')
});

const mapDispatchToProps = {
    setTerminalId,
    setTicket,
    closeMessage
};

export default connect(mapStateToProps, mapDispatchToProps)(App);
