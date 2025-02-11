import React, { useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Snackbar, ThemeProvider, Button } from '@mui/material';
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
    updateMessage,
    loadDepartment,
    loadEntities,
    loadEntityScreenRequest, 
    loadEntityScreenSuccess
} from '../actions';
import * as Queries from '../queries';
import { authService } from '../services/authService';
import { appconfig } from '../config';

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
    const dispatch = useDispatch();
    const config = appconfig();

    useEffect(() => {
        console.log('🔍 App initialization started');
        const initializeApp = async () => {
            try {
                console.log('📝 Config:', config);
                
                // Set terminal ID
                dispatch(setTerminalId(config.terminalName));
                console.log('✅ Terminal ID set:', config.terminalName);

                // Load entities/tables
                console.log('🔄 Loading entities...');
                dispatch(loadEntityScreenRequest(config.entityScreenName));
                
                await getEntityScreenItems(config.entityScreenName, (items) => {
                    console.log('📊 Entities loaded:', items);
                    dispatch(loadEntityScreenSuccess(config.entityScreenName, items));
                });
            } catch (error) {
                console.error('❌ Initialization error:', error);
            }
        };

        initializeApp();
    }, [dispatch]);

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

    const handleLogout = () => {
        authService.logout();
        window.location.reload();
    };

    return (
        <ThemeProvider theme={theme}>
            <Router>
                <div className="mainDiv">
                    <Header />
                    <Button 
                        onClick={handleLogout}
                        sx={{ position: 'absolute', top: 10, right: 10 }}
                    >
                        Logout
                    </Button>
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
