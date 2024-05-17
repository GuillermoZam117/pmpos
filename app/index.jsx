import 'core-js/stable';
import 'regenerator-runtime/runtime';
import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App';
import EntityList from './components/Entities';
import Login from './components/Login';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { RefreshToken } from './queries';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

const AppHandler = () => (
  <ThemeProvider theme={darkTheme}>
    <Provider store={store}>
      <Router>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/entities/:terminalId/:screenName" element={<EntityList />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </Router>
    </Provider>
  </ThemeProvider>
);

if (localStorage['refresh_token']) {
  RefreshToken(localStorage['refresh_token'], () => {
    Render();
  });
} else Render();

function Render() {
  ReactDOM.render(
    <AppHandler />,
    document.getElementById('app') // Ensure this element exists in your HTML
  );
}
