import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector, connect } from 'react-redux';
import { HashRouter as Router, Route, Switch } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Snackbar, ThemeProvider } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Header from './Header';
import Menu from './Menu';
import Orders from './Orders';
import TicketTotal from './TicketTotal';
import TicketTags from './TicketTags';
import Commands from './Commands';
import MyTickets from './MyTickets';
import Login from './Login/Login';
import EntityList from './Entities/EntityList';
import PinPad from './PinPad';
import { 
    setTerminalId,
    setTicket, 
    closeMessage, 
    updateMessage 
} from '../actions';
import { 
    setAuthenticated, 
    initiateAuthentication,
    initializeAuth,
    login, 
    logout, 
    refreshToken 
} from '../actions/auth';
import * as Queries from '../queries';
import Debug from 'debug';
import { darkTheme } from '../theme';

const debug = Debug('pmpos:app');

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
        main: '#1976d2'
    },
    secondary: {
        main: '#dc004e'
    }
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
    const dispatch = useDispatch();
    const auth = useSelector(state => state.auth);
    const [isLoading, setIsLoading] = useState(true);
    const user = useSelector(state => state.auth.user);

    useEffect(() => {
        const initApp = async () => {
            debug('Initializing application...');
            setIsLoading(true);
            
            try {
                await dispatch(initializeAuth());
                debug('Authentication initialized');
            } catch (error) {
                debug('Authentication failed:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initApp();
    }, [dispatch]);

    useEffect(() => {
        const initAuth = async () => {
            try {
                await dispatch(refreshToken());
            } catch (error) {
                console.error('Auth initialization failed:', error);
            }
        };

        initAuth();
    }, [dispatch]);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!auth.isAuthenticated) {
        debug('User not authenticated, showing PinPad');
        return <PinPad />;
    }

    debug('User authenticated, rendering main app');
    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <Router>
                <div className="mainDiv">
                    {isAuthenticated && <Header />}
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
                        <Route exact path="/login" component={Login} />
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
