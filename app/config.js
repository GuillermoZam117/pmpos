import { SALES_MODES, DEFAULT_SALES_MODE, resolveSalesMode } from './config/salesModes';

// Dynamic server discovery utilities
const discoverSambaPOSServer = async () => {
    // Configurable ports from environment, with fallbacks
    const portsList = process.env.SAMBAPOS_DISCOVERY_PORTS || '9000,8080,3000';
    const commonPorts = portsList.split(',').map(p => parseInt(p.trim()));
    const targets = await getServerTargets();

    // Try each target (server names and IPs) with each port
    for (const target of targets) {
        for (const port of commonPorts) {
            try {
                const url = `http://${target}:${port}`;
                console.log(`🔍 Testing SambaPOS at ${url}`);

                const response = await fetch(`${url}/api/health`, {
                    method: 'HEAD',
                    signal: AbortSignal.timeout(3000)
                });

                if (response.ok) {
                    console.log(`✅ Found SambaPOS server at ${url}`);
                    return url;
                }
            } catch (e) {
                console.log(`❌ Failed to connect to ${target}:${port} - ${e.message}`);
            }
        }
    }
    console.warn('⚠️ No SambaPOS server found in network');
    return null;
};

const getServerTargets = () => {
    return new Promise((resolve) => {
        const targets = [];

        // 1. Environment/config specified server name or IP (highest priority)
        const configuredHost = process.env.SAMBAPOS_SERVER_NAME || process.env.API_HOST;
        if (configuredHost) {
            targets.push(configuredHost);
        }

        // 2. Additional configured server names from environment
        const additionalServers = process.env.SAMBAPOS_ADDITIONAL_SERVERS;
        if (additionalServers) {
            additionalServers.split(',').forEach(server => {
                targets.push(server.trim());
            });
        }

        // 3. Current machine IP (if not localhost)
        if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
            targets.push(window.location.hostname);
        }

        // 4. Network gateway (often the router/main server)
        const currentIP = typeof window !== 'undefined' ? window.location.hostname : null;
        if (currentIP && /^\d+\.\d+\.\d+\.\d+$/.test(currentIP)) {
            // Extract network and try .1 (gateway)
            const networkBase = currentIP.split('.').slice(0, 3).join('.');
            targets.push(`${networkBase}.1`);
        }

        resolve([...new Set(targets)]); // Remove duplicates
    });
};

export const appconfig = () => {
    const hasWindow = typeof window !== 'undefined';
    const defaultHost = hasWindow && window.location && window.location.hostname
        ? window.location.hostname
        : 'localhost';

    // Read overrides from query string and persist to localStorage for convenience
    let queryMode = null;

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
            const entityTypeParam = params.get('entityType'); // Entity type override
            const entityScreenParam = params.get('entityScreen'); // Entity screen override
            const discoverParam = params.get('discover'); // auto-discover SambaPOS server
            const rskeyParam = params.get('rskey'); // read-service apikey override
            const activeOnlyParam = params.get('activeOnly'); // force active-only tables
            const modeParam = params.get('mode'); // sales mode preset
            queryMode = modeParam;

            if (apiParam) localStorage.setItem('SAMBAPOS_API_URL', apiParam);
            if (ipParam) localStorage.setItem('SAMBAPOS_API_HOST', ipParam);
            if (portParam) localStorage.setItem('SAMBAPOS_API_PORT', portParam);
            if (userParam) localStorage.setItem('SAMBAPOS_USERNAME', userParam);
            if (passParam) localStorage.setItem('SAMBAPOS_PASSWORD', passParam);
            if (clientParam) localStorage.setItem('SAMBAPOS_CLIENT_ID', clientParam);
            if (deptParam) localStorage.setItem('SAMBAPOS_DEPARTMENT', deptParam);
            if (ttParam) localStorage.setItem('SAMBAPOS_TICKET_TYPE', ttParam);
            if (entityTypeParam) localStorage.setItem('SAMBAPOS_ENTITY_TYPE', entityTypeParam);
            if (entityScreenParam) localStorage.setItem('SAMBAPOS_ENTITY_SCREEN', entityScreenParam);
            if (rskeyParam) localStorage.setItem('READ_SERVICE_APIKEY', rskeyParam);
            if (activeOnlyParam) localStorage.setItem('READ_SERVICE_ACTIVE_ONLY', activeOnlyParam);
            if (modeParam) localStorage.setItem('SAMBAPOS_SALES_MODE', modeParam);

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
        } catch { }
    }

    const storedApiRaw = hasWindow ? localStorage.getItem('SAMBAPOS_API_URL') : null;
    const storedAuto = hasWindow ? localStorage.getItem('pmpos_api_url_auto') : null;
    const storedHost = hasWindow ? localStorage.getItem('SAMBAPOS_API_HOST') : null;
    const storedPort = hasWindow ? localStorage.getItem('SAMBAPOS_API_PORT') : null;
    const storedUser = hasWindow ? localStorage.getItem('SAMBAPOS_USERNAME') : null;
    const storedPass = hasWindow ? localStorage.getItem('SAMBAPOS_PASSWORD') : null;
    const storedClient = hasWindow ? localStorage.getItem('SAMBAPOS_CLIENT_ID') : null;
    const storedMode = hasWindow ? localStorage.getItem('SAMBAPOS_SALES_MODE') : null;

    const envApi = process.env.SAMBAPOS_API_URL;
    const envHost = process.env.API_HOST;
    const envPort = process.env.SAMBAPOS_API_PORT;

    // Dinámico: prioriza query/localStorage, luego host actual+puerto inferido, y último el .env
    const currentPort = hasWindow && window.location && window.location.port ? window.location.port : null;
    const inferredPort = currentPort && currentPort !== '8081' ? currentPort : '9000';
    const targetHost = storedHost || envHost || defaultHost;
    const targetPort = storedPort || envPort || inferredPort;
    const constructedApi = `http://${targetHost}:${targetPort}`;
    // Si el stored api host no coincide con el host actual y no hay override, ignorar cache viejo
    let storedApi = storedApiRaw;
    if (hasWindow && storedApi) {
        try {
            const storedHostFromUrl = new URL(storedApi).hostname;
            if (storedHostFromUrl && storedHostFromUrl !== defaultHost && !storedHost) {
                storedApi = null;
            }
        } catch { storedApi = storedApiRaw; }
    }

    let API_URL = storedApi || storedAuto || envApi || constructedApi;

    // Prefer dev-server proxy when running on webpack-dev-server (port 8081)
    const isDevServer = hasWindow && /:8081$/.test(window.location.host);
    if (isDevServer && !storedApi && !envApi) {
        API_URL = window.location.origin; // e.g., http://HOST:8081
    }

    // Auto-discover server if no specific configuration was found
    const shouldAutoDiscover = hasWindow && !storedApi && !envApi && !localStorage.getItem('SAMBAPOS_DISCOVERED') && !isDevServer;
    if (shouldAutoDiscover) {
        setTimeout(() => {
            discoverSambaPOSServer().then(discoveredUrl => {
                if (discoveredUrl && discoveredUrl !== constructedApi) {
                    localStorage.setItem('SAMBAPOS_API_URL', discoveredUrl);
                    localStorage.setItem('SAMBAPOS_DISCOVERED', 'true');
                    console.log('SambaPOS auto-discovered at:', discoveredUrl);
                    window.location.reload(); // Reload to use discovered config
                }
            }).catch(err => {
                console.warn('Auto-discovery failed:', err);
            });
        }, 1000); // Small delay to ensure page is fully loaded
    }

    // All configuration values from environment variables (no hardcoded defaults)
    let userSource = 'env';
    let passSource = 'env';
    let clientSource = 'env';

    const USERNAME = (() => {
        if (storedUser) { userSource = 'localStorage'; return storedUser; }
        if (process.env.SAMBAPOS_USERNAME || process.env.SAMBAPOS_USER || process.env.USER_NAME) {
            userSource = 'env';
            return process.env.SAMBAPOS_USERNAME || process.env.SAMBAPOS_USER || process.env.USER_NAME;
        }
        return null;
    })();

    const PASSWORD = (() => {
        if (storedPass) { passSource = 'localStorage'; return storedPass; }
        if (process.env.SAMBAPOS_PASSWORD || process.env.PASSWORD) {
            passSource = 'env';
            return process.env.SAMBAPOS_PASSWORD || process.env.PASSWORD;
        }
        return null;
    })();
    const TERMINAL = process.env.SAMBAPOS_TERMINAL;
    const storedDept = hasWindow ? localStorage.getItem('SAMBAPOS_DEPARTMENT') : null;
    const storedTT = hasWindow ? localStorage.getItem('SAMBAPOS_TICKET_TYPE') : null;
    const storedEntityType = hasWindow ? localStorage.getItem('SAMBAPOS_ENTITY_TYPE') : null;
    const storedEntityScreen = hasWindow ? localStorage.getItem('SAMBAPOS_ENTITY_SCREEN') : null;
    const storedMenu = hasWindow ? localStorage.getItem('SAMBAPOS_MENU') : null;

    let modeSource = 'default';
    let currentModeKey = DEFAULT_SALES_MODE;
    if (queryMode) {
        currentModeKey = queryMode;
        modeSource = 'query';
    } else if (storedMode) {
        currentModeKey = storedMode;
        modeSource = 'localStorage';
    } else if (process.env.SAMBAPOS_DEFAULT_MODE) {
        currentModeKey = process.env.SAMBAPOS_DEFAULT_MODE;
        modeSource = 'env';
    }
    const modePreset = resolveSalesMode(currentModeKey);

    const DEPARTMENT = storedDept || modePreset.departmentName || process.env.SAMBAPOS_DEPARTMENT;
    const TICKET_TYPE = storedTT || modePreset.ticketTypeName || process.env.SAMBAPOS_TICKET_TYPE;
    const ENTITY_SCREEN = storedEntityScreen || modePreset.entityScreenName || process.env.SAMBAPOS_ENTITY_SCREEN;
    const ENTITY_TYPE = storedEntityType || modePreset.entityTypeName || process.env.SAMBAPOS_ENTITY_TYPE;
    const MENU_NAME = storedMenu || modePreset.menuName || process.env.SAMBAPOS_MENU;

    const CLIENT_ID = (() => {
        if (storedClient) { clientSource = 'localStorage'; return storedClient; }
        if (process.env.SAMBAPOS_CLIENT_ID) { clientSource = 'env'; return process.env.SAMBAPOS_CLIENT_ID; }
        return null;
    })();

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
        menuName: MENU_NAME || 'MENU',
        entityScreenName: ENTITY_SCREEN,
        entityTypeName: ENTITY_TYPE,
        salesMode: {
            key: currentModeKey,
            label: modePreset.label,
            description: modePreset.description,
            departmentName: modePreset.departmentName,
            ticketTypeName: modePreset.ticketTypeName,
            entityTypeName: modePreset.entityTypeName,
            entityScreenName: modePreset.entityScreenName,
            menuName: modePreset.menuName
        },

        // Application Settings (configurable)
        autoConnectPrinter: process.env.SAMBAPOS_AUTO_CONNECT_PRINTER !== 'false',
        defaultPrinter: process.env.SAMBAPOS_DEFAULT_PRINTER,
        tableView: process.env.SAMBAPOS_TABLE_VIEW !== 'false',
        showOrderTags: process.env.SAMBAPOS_SHOW_ORDER_TAGS !== 'false',
        allowSplitBill: process.env.SAMBAPOS_ALLOW_SPLIT_BILL !== 'false',
        allowMergeTickets: process.env.SAMBAPOS_ALLOW_MERGE_TICKETS !== 'false',

        // Timeouts (configurable)
        connectionTimeout: parseInt(process.env.SAMBAPOS_CONNECTION_TIMEOUT || '30000'),
        refreshInterval: parseInt(process.env.SAMBAPOS_REFRESH_INTERVAL || '5000'),

        // Read Service Configuration
        readService: {
            url: process.env.READ_SERVICE_URL || hasWindow ? localStorage.getItem('READ_SERVICE_URL') || 'http://localhost:4005' : 'http://localhost:4005',
            apiKey: process.env.READ_SERVICE_APIKEY || hasWindow ? localStorage.getItem('READ_SERVICE_APIKEY') || 'test-key-123' : 'test-key-123',
            enabled: (process.env.REACT_APP_USE_SQL_READS || 'true').toLowerCase() === 'true'
        },

        // Auth Configuration
        auth: {
            clientId: CLIENT_ID,
            grantType: 'password',
            tokenEndpoint: '/Token',
            refreshEndpoint: '/Token/refresh',
            tokenValidity: parseInt(process.env.SAMBAPOS_TOKEN_VALIDITY || '31536000000'), // 365 days
            refreshThreshold: parseInt(process.env.SAMBAPOS_REFRESH_THRESHOLD || '604800000'), // 7 days
            baseUrl: API_URL
        },

        // Meta para depuración de origen de config
        _source: {
            user: userSource,
            pass: passSource,
            client: clientSource,
            api: storedApi ? 'localStorage' : envApi ? 'env' : 'auto',
            mode: modeSource
        }
    };
};

export const TOKEN_CONFIG = {
    STORAGE_KEY: process.env.SAMBAPOS_TOKEN_STORAGE_KEY || 'sambapos_token_encrypted',
    EXPIRY_KEY: process.env.SAMBAPOS_TOKEN_EXPIRY_KEY || 'sambapos_token_expiry',
    REQUEST_TIMEOUT: parseInt(process.env.SAMBAPOS_REQUEST_TIMEOUT || '20000'),
    REFRESH_THRESHOLD: parseInt(process.env.SAMBAPOS_REFRESH_THRESHOLD || '604800000'), // 7 days
    TOKEN_VALIDITY: parseInt(process.env.SAMBAPOS_TOKEN_VALIDITY || '31536000000')   // 365 days
};

// Export discovery utilities for use in components
export const dynamicConfig = {
    discoverSambaPOSServer,

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
