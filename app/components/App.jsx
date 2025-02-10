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

// Theme configuration for MUI
const theme = createTheme({
  palette: {
    mode: 'dark', // or 'light'
  },
});

const App = ({ 
    terminalId,
    message,
    isMessageOpen,
    setTerminalId,
    setTicket,
    closeMessage 
}) => {
    useEffect(() => {
        const initializeTerminal = async () => {
            const savedTerminalId = localStorage.getItem('terminalId');
            
            if (savedTerminalId) {
                const exists = await Queries.getTerminalExists(savedTerminalId);
                if (exists) {
                    const ticket = await Queries.getTerminalTicket(savedTerminalId);
                    setTerminalId(savedTerminalId);
                    setTicket(ticket);
                } else {
                    const newTerminalId = await Queries.registerTerminal();
                    updateTerminalId(newTerminalId);
                }
            } else {
                const newTerminalId = await Queries.registerTerminal();
                updateTerminalId(newTerminalId);
            }
        };

        initializeTerminal();
    }, []); // Empty dependency array for componentDidMount behavior

    const updateTerminalId = (id) => {
        localStorage.setItem('terminalId', id);
        setTerminalId(id);
    };

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
                        <Route path="/login" component={Login} />
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
    ticket: PropTypes.object,
    setTerminalId: PropTypes.func.isRequired,
    setTicket: PropTypes.func.isRequired,
    closeMessage: PropTypes.func.isRequired
};

const mapStateToProps = (state) => ({
  message: state.app.getIn(['message', 'text']),
  terminalId: state.app.get('terminalId'),
  isMessageOpen: state.app.getIn(['message', 'isOpen']),
  ticket: state.app.get('ticket')
});

const mapDispatchToProps = {
    setTerminalId, // Changed from changeTerminalId
    setTicket,
    closeMessage
};

export default connect(mapStateToProps, mapDispatchToProps)(App);
