const config = {
    development: {
        apiUrl: 'http://localhost:9000',
        wsUrl: 'ws://localhost:9000'
    },
    production: {
        apiUrl: process.env.API_URL || 'http://localhost:9000',
        wsUrl: process.env.WS_URL || 'ws://localhost:9000'
    }
};

export const appconfig = () => {
    const env = process.env.NODE_ENV || 'development';
    return config[env];
};