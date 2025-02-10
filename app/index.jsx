import 'core-js/stable';
import 'regenerator-runtime/runtime';
import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { RefreshToken } from './queries';

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
        },
        secondary: {
            main: '#f48fb1',
        },
    },
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

function Render() {
    ReactDOM.render(<RootApp />, document.getElementById('app'));
}

// Authentication check with error handling
if (localStorage['refresh_token']) {
    RefreshToken(localStorage['refresh_token'], Render)
        .catch(error => {
            console.error('Auth refresh failed:', error);
            localStorage.removeItem('refresh_token');
            Render();
        });
} else {
    Render();
}

// Hot module replacement support
if (module.hot) {
    module.hot.accept();
}
