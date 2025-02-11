export function appconfig() {
    return {
        // SambaPOS API Configuration
        GQLserv: process.env.SAMBAPOS_API_URL || 'http://localhost:9000',
        GQLurl: process.env.SAMBAPOS_GRAPHQL_URL || 'http://localhost:9000/api/graphql',
        SIGNALRserv: process.env.SAMBAPOS_SIGNALR_URL || 'http://localhost:9000',
        SIGNALRurl: process.env.SAMBAPOS_SIGNALR_HUB || 'http://localhost:9000/signalr',
        
        // Terminal Configuration
        terminalName: process.env.TERMINAL_NAME || 'SERVIDOR',
        userName: process.env.USER_NAME || 'graphiql',
        password: process.env.PASSWORD || 'graphiql',
        
        // Business Configuration
        departmentName: 'MESAS',
        ticketTypeName: 'COMEDOR',
        menuName: 'MENU',
        entityScreenName: 'MESAS',
        
        // Application Settings
        autoConnectPrinter: true,
        defaultPrinter: 'POS58',
        tableView: true,
        showOrderTags: true,
        allowSplitBill: true,
        allowMergeTickets: true,
        
        // Timeouts
        connectionTimeout: 30000,
        refreshInterval: 5000
    };
}