import { appconfig } from '../config';

export const debugReduxState = () => {
    if (window.store) {
        const state = window.store.getState();
        console.group('Redux State');
        Object.keys(state).forEach(key => {
            console.log(`${key}:`, state[key].toJS());
        });
        console.groupEnd();
    }
};

export const debugGraphQLState = (operation, variables, result) => {
    if (process.env.NODE_ENV !== 'production') {
        console.group('GraphQL Operation');
        console.log('Operation:', operation);
        console.log('Variables:', variables);
        console.log('Result:', result);
        console.groupEnd();
    }
};

export const debugGraphQLRequest = (operation, variables) => {
    if (process.env.NODE_ENV !== 'production') {
        console.group('GraphQL Request');
        console.log('Operation:', operation);
        console.log('Variables:', variables);
        console.groupEnd();
    }
};

// Add new debug utilities for auth
export const debugAuthState = () => {
    if (window.store) {
        const state = window.store.getState();
        const config = appconfig();
        console.group('Authentication State');
        console.log('Login State:', state.login.toJS());
        console.log('API URL:', config.GQLurl);
        console.log('Terminal:', config.terminalName);
        console.log('User:', config.userName);
        console.groupEnd();
    }
};

export const debugConnection = async () => {
    const config = appconfig();
    try {
        console.group('Connection Test');
        
        // Test API endpoint
        const response = await fetch(config.GQLurl);
        console.log('API Status:', response.status);
        console.log('API Headers:', Object.fromEntries(response.headers));
        
        // Test current auth
        const state = window.store.getState();
        const token = state.login.get('accessToken');
        console.log('Has Token:', !!token);
        
        if (token) {
            const authResponse = await fetch(config.GQLurl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: `{ __typename }`
                })
            });
            console.log('Auth Test:', authResponse.status === 200 ? 'Valid' : 'Invalid');
        }
        
        console.groupEnd();
    } catch (error) {
        console.error('Connection test failed:', error);
        console.groupEnd();
    }
};

export const debugAuth = async () => {
    console.group('Auth Configuration');
    try {
        const config = appconfig();
        console.log('API URL:', config.GQLurl);
        console.log('Terminal:', config.terminalName);
        console.log('User:', config.userName);
        
        const state = window.store.getState();
        console.log('Current Token:', state.login.get('accessToken') ? '✓ Present' : '✗ Missing');
        
        // Test connection
        const response = await fetch(config.GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: `
                    mutation authenticate($username: String!, $password: String!) {
                        authenticate(username: $username, password: $password) {
                            token
                        }
                    }
                `,
                variables: {
                    username: config.userName,
                    password: config.password
                }
            })
        });

        const data = await response.json();
        console.log('Auth Test:', data.data ? '✓ Success' : '✗ Failed');
        console.log('Response:', data);
        
    } catch (error) {
        console.error('Auth Test Failed:', error);
    }
    console.groupEnd();
};

export const debugSambaPOS = async () => {
    console.group('🔍 SambaPOS Debug');
    try {
        const config = appconfig();
        
        // Step 1: Configuration Check
        console.log('1. Configuration:', {
            url: config.GQLurl,
            terminal: config.terminalName,
            user: config.userName
        });

        // Step 2: Authentication Test
        console.group('2. Authentication Test');
        const authResponse = await fetch(config.GQLurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                query: `
                    mutation authenticate($username: String!, $password: String!) {
                        authenticate(username: $username, password: $password) {
                            token
                            refreshToken
                        }
                    }
                `,
                variables: {
                    username: config.userName,
                    password: config.password
                }
            })
        });

        const authData = await authResponse.json();
        console.log('Status:', authResponse.status);
        console.log('Headers:', Object.fromEntries(authResponse.headers));
        
        if (authData.data?.authenticate?.token) {
            console.log('✅ Authentication successful');
            const token = authData.data.authenticate.token;
            
            // Step 3: Test Protected Query
            console.group('3. Testing Protected Query');
            const testResponse = await fetch(config.GQLurl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: `
                        query {
                            terminal(name: "${config.terminalName}") {
                                id
                                name
                            }
                        }
                    `
                })
            });
            
            const testData = await testResponse.json();
            console.log('Protected Query Result:', testData);
            console.groupEnd();
        } else {
            console.error('❌ Authentication failed:', authData.errors || 'Unknown error');
        }
        console.groupEnd();

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
    console.groupEnd();
};

// Attach endpoint debugger to window for quick inspection
export const attachDebugEndpoint = () => {
  try {
    const { resolveGqlUrl } = require('./gqlEndpoint');
    const { appconfig } = require('../config');
    window.debugEndpoint = () => {
      const cfg = appconfig();
      const url = resolveGqlUrl(cfg);
      const qs = new URLSearchParams(window.location.search);
      const info = {
        resolvedUrl: url,
        query: {
          api: qs.get('api'),
          port: qs.get('port')
        },
        env: {
          REACT_APP_USE_PROXY: process?.env?.REACT_APP_USE_PROXY,
          SAMBAPOS_API_URL: process?.env?.SAMBAPOS_API_URL,
          SAMBAPOS_API_PORT: process?.env?.SAMBAPOS_API_PORT
        },
        storage: {
          pmpos_api_url: localStorage.getItem('pmpos_api_url'),
          pmpos_api_port: localStorage.getItem('pmpos_api_port')
        }
      };
      console.group('GraphQL Endpoint Resolver');
      console.log(info);
      console.groupEnd();
      return info;
    };
    console.log('🔧 debugEndpoint() attached. Call window.debugEndpoint() to inspect GraphQL endpoint.');
  } catch (e) {
    try { console.warn('debugEndpoint attachment failed:', e?.message || e); } catch (_) {}
  }
};

// Auto-attach in development
try {
  if (typeof window !== 'undefined' && process && process.env && process.env.NODE_ENV !== 'production') {
    attachDebugEndpoint();
    try {
      const { resolveGqlUrl } = require('./gqlEndpoint');
      const { appconfig } = require('../config');
      const url = resolveGqlUrl(appconfig());
      // Startup banner for endpoint visibility in dev
      console.log('🛰️ GraphQL endpoint:', url, {
        REACT_APP_USE_PROXY: process?.env?.REACT_APP_USE_PROXY,
        SAMBAPOS_API_URL: process?.env?.SAMBAPOS_API_URL,
        SAMBAPOS_API_PORT: process?.env?.SAMBAPOS_API_PORT
      });
      // Attach fetch interceptor so all modules use the same endpoint transparently
      try {
        const { attachGraphQLFetchInterceptor } = require('./gqlEndpoint');
        attachGraphQLFetchInterceptor(appconfig());
      } catch (e) {
        console.warn('GraphQL fetch interceptor failed:', e?.message || e);
      }
    } catch (_) {}
  }
} catch (_) {}

// Utility: clear terminal mappings and force re-registration next time
export const attachResetTerminalMapping = () => {
  try {
    window.resetTerminalMapping = () => {
      try {
        const keys = [
          'pmpos_terminals_by_user',
          'pmpos_current_terminal',
          'pmpos_last_user',
          'pmpos_last_terminal_user'
        ];
        keys.forEach(k => localStorage.removeItem(k));
        console.log('🧹 Cleared terminal mapping from localStorage. Next operation will re-register terminal.');
        return true;
      } catch (e) {
        console.warn('Failed clearing terminal mapping:', e?.message || e);
        return false;
      }
    };
    console.log('🔧 resetTerminalMapping() attached. Call to clear stored terminal IDs and force registration.');
  } catch (_) {}
};

// Attach reset helper in dev
try {
  if (typeof window !== 'undefined' && process && process.env && process.env.NODE_ENV !== 'production') {
    attachResetTerminalMapping();
  }
} catch (_) {}

// Make available globally for browser console
if (typeof window !== 'undefined') {
    window.debugSambaPOS = debugSambaPOS;
    window.debugAuth = async () => {
        const config = appconfig();
        return fetch(config.GQLurl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `mutation { authenticate(username: "${config.userName}", password: "${config.password}") { token } }`
            })
        }).then(r => r.json()).then(console.log);
    };
}
