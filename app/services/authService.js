import { appconfig } from '../config';

export const authService = {
    login: async (username, password) => {
        const config = appconfig();
        try {
            const response = await fetch(`${config.GQLserv}/Token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: new URLSearchParams({
                    grant_type: 'password',
                    username: config.userName,    // Using config value
                    password: config.password,    // Using config value
                    client_id: 'graphiql'
                }).toString()
            });

            if (!response.ok) {
                const error = await response.text();
                console.error('Auth response:', error);
                throw new Error('Authentication failed');
            }

            const data = await response.json();
            localStorage.setItem('access_token', data.access_token);
            return data;
        } catch (error) {
            console.error('Login error details:', error);
            throw error;
        }
    },

    isAuthenticated: () => {
        const token = localStorage.getItem('access_token');
        return !!token;
    },

    logout: () => {
        localStorage.removeItem('access_token');
    }
};