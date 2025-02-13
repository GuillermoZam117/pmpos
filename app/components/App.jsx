import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HashRouter as Router, Route, Switch } from 'react-router-dom';
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

const App = () => {
    const dispatch = useDispatch();
    const auth = useSelector(state => state.auth);
    const [isLoading, setIsLoading] = useState(true);
    const user = useSelector(state => state.auth.user);
    const message = useSelector(state => state.app.getIn(['message', 'text']));
    const terminalId = useSelector(state => state.app.get('terminalId'));
    const isMessageOpen = useSelector(state => state.app.getIn(['message', 'isOpen']));
    const ticket = useSelector(state => state.app.get('ticket'));
    const isAuthenticated = useSelector(state => state.auth.isAuthenticated);

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

    const handleCloseMessage = () => {
        dispatch(closeMessage());
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
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
                        onClose={handleCloseMessage}
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

export default App;
