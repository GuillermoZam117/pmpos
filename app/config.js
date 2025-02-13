export const appconfig = () => {
    const API_URL = process.env.SAMBAPOS_API_URL || 'http://localhost:9000';
    
    return {
        // SambaPOS API Configuration
        GQLserv: API_URL,
        GQLurl: `${API_URL}/api/graphql`,
        graphqlUrl: `${API_URL}/api/graphql`,
        SIGNALRserv: process.env.SAMBAPOS_SIGNALR_URL || API_URL,
        SIGNALRurl: `${API_URL}/signalr`,
        authUrl: `${API_URL}/Token`,
        
        // Terminal Configuration
        terminalName: process.env.TERMINAL_NAME || 'SERVIDOR',
        userName: 'graphiql',
        password: 'graphiql',
        
        // Business Configuration
        departmentName: 'MESAS',
        ticketTypeName: 'COMEDOR',
        menuName: 'MENU',
        entityScreenName: 'MESAS',
        
        // Application Settings
        autoConnectPrinter: true,
        defaultPrinter: 'CAJA',
        tableView: true,
        showOrderTags: true,
        allowSplitBill: true,
        allowMergeTickets: true,
        
        // Timeouts
        connectionTimeout: 30000,
        refreshInterval: 5000,

        // Auth Configuration
        auth: {
            clientId: 'graphiql',
            grantType: 'password',
            tokenEndpoint: '/Token',
            refreshEndpoint: '/Token/refresh',
            tokenValidity: 365 * 24 * 60 * 60 * 1000, // 365 days
            refreshThreshold: 7 * 24 * 60 * 60 * 1000, // 7 days
            baseUrl: API_URL
        }
    };
};

// Configuración para desarrollo
export const DEV_CONFIG = {
    development: true,
    apiBaseUrl: 'http://localhost:9000',
    graphqlEndpoint: '/api/graphql',
    authEndpoint: '/Token'
};

export const TOKEN_CONFIG = {
    STORAGE_KEY: 'sambapos_token_encrypted',
    EXPIRY_KEY: 'sambapos_token_expiry',
    REQUEST_TIMEOUT: 20000,
    REFRESH_THRESHOLD: 7 * 24 * 60 * 60 * 1000, // 7 days
    TOKEN_VALIDITY: 365 * 24 * 60 * 60 * 1000   // 365 days
};