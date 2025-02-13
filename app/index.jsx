import 'core-js/stable';
import 'regenerator-runtime/runtime';
import React, { StrictMode, Suspense } from 'react';
import ReactDOM from 'react-dom';
import { ThemeProvider } from '@mui/material/styles';
import { HashRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { darkTheme } from './theme';
import Loading from './components/Loading';
import ErrorBoundary from './components/ErrorBoundary';
import Debug from 'debug';
import CircularProgress from '@mui/material/CircularProgress';

// Lazy load components
const App = React.lazy(() => import('./components/App'));

// Enable debug logging in development
if (process.env.NODE_ENV !== 'production') {
    Debug.enable('pmpos:*');
}

// Root Component
const RootApp = () => {
    return (
        <Provider store={store}>
            <HashRouter>
                <Suspense fallback={<LoadingFallback />}>
                    <App />
                </Suspense>
            </HashRouter>
        </Provider>
    );
};

const LoadingFallback = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh' 
  }}>
    <CircularProgress />
  </div>
);

// Silenciar warnings de React Router
const router = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
};

// Initialize token handling
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
            await new Promise(resolve => setTimeout(resolve, 2000));
            return initializeAuth(retryCount - 1);
        }
        console.error('All token fetch attempts failed');
    }
};

// Mount application
ReactDOM.render(
    <Provider store={store}>
        <HashRouter>
            <Suspense fallback={<LoadingFallback />}>
                <App />
            </Suspense>
        </HashRouter>
    </Provider>,
    document.getElementById('root')
);

// Enable Hot Module Replacement (HMR)
if (module.hot) {
    module.hot.accept('./components/App', () => {
        ReactDOM.render(<RootApp />, document.getElementById('root'));
    });
};
