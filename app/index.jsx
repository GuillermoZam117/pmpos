import 'core-js/stable';
import 'regenerator-runtime/runtime';
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { RefreshToken } from './queries';
import { authService } from './services/authService';

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
                                <Route exact path="/" component={App} />
                                <Route path="/entities/:terminalId/:screenName" component={EntityList} />
                                <Route path="/login" component={Login} />
                            </Switch>
                        </BrowserRouter>
                    </Provider>
                </ThemeProvider>
            </ErrorBoundary>
        </StrictMode>
    );
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('root');
    const root = createRoot(container);

    const render = (Component) => {
        root.render(
            <Provider store={store}>
                <Component />
            </Provider>
        );
    };

    render(App);

    if (module.hot) {
        module.hot.accept('./components/App', () => {
            const NextApp = require('./components/App').default;
            render(NextApp);
        });
    }
});
