import 'core-js/stable';
import 'regenerator-runtime/runtime';
import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { RefreshToken } from './queries';
import { authService } from './services/authService';
import { tokenService } from './services/tokenService';
import Debug from 'debug';

// Enable debug logging in development
if (process.env.NODE_ENV !== 'production') {
    Debug.enable('pmpos:*');
}

// Components
import App from './components/App';
import EntityList from './components/Entities';
import Login from './components/Login';
import ErrorBoundary from './components/ErrorBoundary';

// Theme configuration
const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#90caf9',
            // Agregar colores complementarios
            light: '#b3e5fc',
            dark: '#5d99c6'
        },
        secondary: {
            main: '#f48fb1',
            light: '#f6a5c0',
            dark: '#bf5f82'
        },
        background: {
            default: '#121212',
            paper: '#1e1e1e'
        }
    },
    typography: {
        fontFamily: [
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif'
        ].join(',')
    }
});

function RootApp() {
    return (
        <StrictMode>
            <ErrorBoundary>
                <ThemeProvider theme={darkTheme}>
                    <Provider store={store}>
                        <BrowserRouter>
                            <Switch>
                                <Route exact path="/" component={RequireAuth(App)} />
                                <Route path="/entities/:terminalId/:screenName" component={RequireAuth(EntityList)} />
                                <Route path="/login" component={Login} />
                            </Switch>
                        </BrowserRouter>
                    </Provider>
                </ThemeProvider>
            </ErrorBoundary>
        </StrictMode>
    );
}

// High Order Component para proteger rutas
const RequireAuth = (WrappedComponent) => {
    return class extends React.Component {
        componentDidMount() {
            if (!authService.isAuthenticated()) {
                this.props.history.push('/login');
            }
        }
        
        render() {
            return <WrappedComponent {...this.props} />;
        }
    }
};

const rootElement = document.getElementById('root');

const render = (Component) => {
    const renderApp = () => {
        ReactDOM.render(
            <Provider store={store}>
                <Component />
            </Provider>,
            rootElement
        );
    };

    // First render the app
    renderApp();

    // Then initialize auth
    initializeAuth()
        .then(token => {
            if (token) {
                console.log('Authentication initialized successfully');
            }
        })
        .catch(console.error);
};

// Initial render
render(App);

// Enable HMR
if (module.hot) {
    module.hot.accept('./components/App', () => {
        const NextApp = require('./components/App').default;
        render(NextApp);
    });
}

// Initialize token handling with proper timeout and retry logic
const initializeAuth = async (retryCount = 3) => {
    try {
        console.time('initialTokenAcquisition');
        const token = await tokenService.getToken();
        console.timeEnd('initialTokenAcquisition');
        console.log('Initial token acquired successfully');
        return token;
    } catch (error) {
        console.error(`Token fetch attempt failed: ${error.message}`);
        if (retryCount > 0) {
            console.log(`Retrying... (${retryCount} attempts remaining)`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between retries
            return initializeAuth(retryCount - 1);
        }
        console.error('All token fetch attempts failed');
    }
};
