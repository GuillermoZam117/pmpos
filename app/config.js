// Dynamic IP discovery utilities
const discoverSambaPOSServer = async () => {
    const commonPorts = [9000, 8080, 3000];
    const localNetwork = await getLocalNetworkIPs();
    
    for (const ip of localNetwork) {
        for (const port of commonPorts) {
            try {
                const response = await fetch(`http://${ip}:${port}/api/health`, { 
                    method: 'HEAD', 
                    timeout: 2000 
                });
                if (response.ok) {
                    return `http://${ip}:${port}`;
                }
            } catch (e) {
                // Continue searching
            }
        }
    }
    return null;
};

const getLocalNetworkIPs = () => {
    return new Promise((resolve) => {
        const ips = ['192.168.1.125', '192.168.1.111', '192.168.0.1', '10.0.0.1'];
        // Add current host IP if different
        if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
            ips.unshift(window.location.hostname);
        }
        resolve(ips);
    });
};

export const appconfig = () => {
    const hasWindow = typeof window !== 'undefined';
    const defaultHost = hasWindow && window.location && window.location.hostname
        ? window.location.hostname
        : 'localhost';

    // Read overrides from query string and persist to localStorage for convenience
    if (hasWindow) {
        try {
            const params = new URLSearchParams(window.location.search);
            const apiParam = params.get('api'); // full URL, e.g. http://192.168.1.10:9000
            const ipParam = params.get('ip');   // just IP, e.g. 192.168.1.125
            const portParam = params.get('port'); // just port, e.g. 9000
            const userParam = params.get('user'); // SambaPOS username
            const passParam = params.get('pass'); // SambaPOS password
            const clientParam = params.get('client'); // SambaPOS client_id (Application)
            const deptParam = params.get('dept'); // Department name
            const ttParam = params.get('tt');     // Ticket Type name
            const discoverParam = params.get('discover'); // auto-discover SambaPOS server
            
            if (apiParam) localStorage.setItem('SAMBAPOS_API_URL', apiParam);
            if (ipParam) localStorage.setItem('SAMBAPOS_API_HOST', ipParam);
            if (portParam) localStorage.setItem('SAMBAPOS_API_PORT', portParam);
            if (userParam) localStorage.setItem('SAMBAPOS_USERNAME', userParam);
            if (passParam) localStorage.setItem('SAMBAPOS_PASSWORD', passParam);
            if (clientParam) localStorage.setItem('SAMBAPOS_CLIENT_ID', clientParam);
            if (deptParam) localStorage.setItem('SAMBAPOS_DEPARTMENT', deptParam);
            if (ttParam) localStorage.setItem('SAMBAPOS_TICKET_TYPE', ttParam);
            
            // Auto-discover SambaPOS server if requested
            if (discoverParam === 'true') {
                discoverSambaPOSServer().then(discoveredUrl => {
                    if (discoveredUrl) {
                        localStorage.setItem('SAMBAPOS_API_URL', discoveredUrl);
                        localStorage.setItem('SAMBAPOS_DISCOVERED', 'true');
                        window.location.reload(); // Reload to use discovered config
                    }
                });
            }
        } catch {}
    }

    const storedApi = hasWindow ? localStorage.getItem('SAMBAPOS_API_URL') : null;
    const storedHost = hasWindow ? localStorage.getItem('SAMBAPOS_API_HOST') : null;
    const storedPort = hasWindow ? localStorage.getItem('SAMBAPOS_API_PORT') : null;
    const storedUser = hasWindow ? localStorage.getItem('SAMBAPOS_USERNAME') : null;
    const storedPass = hasWindow ? localStorage.getItem('SAMBAPOS_PASSWORD') : null;
    const storedClient = hasWindow ? localStorage.getItem('SAMBAPOS_CLIENT_ID') : null;
    
    const envApi = process.env.SAMBAPOS_API_URL;
    const envHost = process.env.API_HOST;
    const envPort = process.env.SAMBAPOS_API_PORT;

    // Priority: stored full URL > environment URL > constructed from host:port > default
    const targetHost = storedHost || envHost || defaultHost;
    const targetPort = storedPort || envPort || '9000';
    const constructedApi = `http://${targetHost}:${targetPort}`;
    let API_URL = storedApi || envApi || constructedApi;

    // Prefer dev-server proxy when running on webpack-dev-server (port 8081)
    const isDevServer = hasWindow && /:8081$/.test(window.location.host);
    if (isDevServer && !storedApi && !envApi) {
        API_URL = window.location.origin; // e.g., http://HOST:8081
    }
    // Using EXACT values that worked in your manual GraphQL testing
    const USERNAME = storedUser || process.env.SAMBAPOS_USERNAME || process.env.SAMBAPOS_USER || 'graphiql';
    const PASSWORD = storedPass || process.env.SAMBAPOS_PASSWORD || 'graphiql';
    const TERMINAL = process.env.SAMBAPOS_TERMINAL || 'SERVIDOR';  // ✅ Matches your working config
    const storedDept = hasWindow ? localStorage.getItem('SAMBAPOS_DEPARTMENT') : null;
    const storedTT = hasWindow ? localStorage.getItem('SAMBAPOS_TICKET_TYPE') : null;
    const DEPARTMENT = storedDept || process.env.SAMBAPOS_DEPARTMENT || 'MESAS';    // ✅ Matches your working config
    const TICKET_TYPE = storedTT || process.env.SAMBAPOS_TICKET_TYPE || 'COMEDOR';  // ✅ Matches your working config
    const ENTITY_SCREEN = process.env.SAMBAPOS_ENTITY_SCREEN || 'MESAS';
    // EntityType in your schema is case-sensitive and should be 'Mesas'
    const ENTITY_TYPE = process.env.SAMBAPOS_ENTITY_TYPE || 'Mesas';
    const CLIENT_ID = storedClient || process.env.SAMBAPOS_CLIENT_ID || 'pmpos';
    
    return {
        // SambaPOS API Configuration
        GQLserv: API_URL,
        GQLurl: isDevServer ? `/api/graphql` : `${API_URL}/api/graphql`,
        graphqlUrl: isDevServer ? `/api/graphql` : `${API_URL}/api/graphql`,
        SIGNALRserv: process.env.SAMBAPOS_SIGNALR_URL || API_URL,
        SIGNALRurl: isDevServer ? `/signalr` : `${API_URL}/signalr`,
        authUrl: isDevServer ? `/Token` : `${API_URL}/Token`,
        
        // Terminal Configuration
        terminalName: TERMINAL,
        userName: USERNAME,
        password: PASSWORD,
        
        // Business Configuration
        departmentName: DEPARTMENT,
        ticketTypeName: TICKET_TYPE,
        menuName: process.env.SAMBAPOS_MENU || 'MENU',
        entityScreenName: ENTITY_SCREEN,
        entityTypeName: ENTITY_TYPE,
        
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
            clientId: CLIENT_ID,
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

// Export discovery utilities for use in components
export const dynamicConfig = {
    discoverSambaPOSServer,
    getLocalNetworkIPs,
    
    // Utility to set a new server IP and reload config
    setServerIP: (ip, port = '9000') => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('SAMBAPOS_API_HOST', ip);
            localStorage.setItem('SAMBAPOS_API_PORT', port);
            localStorage.setItem('SAMBAPOS_API_URL', `http://${ip}:${port}`);
            return true;
        }
        return false;
    },
    
    // Get current configured server info
    getCurrentServer: () => {
        if (typeof window === 'undefined') return null;
        const config = appconfig();
        return {
            url: config.GQLserv,
            host: localStorage.getItem('SAMBAPOS_API_HOST'),
            port: localStorage.getItem('SAMBAPOS_API_PORT'),
            discovered: localStorage.getItem('SAMBAPOS_DISCOVERED') === 'true'
        };
    }
};
