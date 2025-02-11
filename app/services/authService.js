import { appconfig } from '../config';

export const authService = {
  login: async (username, password) => {
    const config = appconfig();
    try {
      const response = await fetch(config.authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'password',
          username: username || config.userName,
          password: password || config.password,
          client_id: config.clientId
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('access_token', data.access_token);
        return { token: data.access_token, user: username };
      } else {
        console.error('Auth Error:', data);
        throw new Error(data.error_description || 'Authentication failed');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },
  isAuthenticated: () => !!localStorage.getItem('access_token'),
  logout: () => localStorage.removeItem('access_token')
};