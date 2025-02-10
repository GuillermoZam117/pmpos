export function appconfig() {
    // create Object to hold config info
    var config = {};

    // Fixed configuration for local development
    var webProto = 'http:';
    var webHost = 'localhost';
    var webPort = '8080';

    // Message Server
    var msgsrv = webHost;

    // GraphQL server
    var GQLhost = 'localhost';
    var GQLport = '9000';
    var GQLpath = '/api/graphql/';
    var GQLserv = webProto + '//' + GQLhost + ':' + GQLport;
    var GQLurl = GQLserv + GQLpath;

    // SIGNALR server
    var SIGNALRhost = 'localhost';
    var SIGNALRport = '9000';
    var SIGNALRpath = '/signalr';
    var SIGNALRhubs = '/signalr/hubs/';
    var SIGNALRserv = webProto + '//' + SIGNALRhost + ':' + SIGNALRport;
    var SIGNALRurl = SIGNALRserv + SIGNALRpath;
    var SIGNALRhub = SIGNALRserv + SIGNALRhubs;

    // Terminal settings for development
    var terminalName = 'DESARROLLO';
    var userName = 'admin';
    var departmentName = 'MESAS';
    var ticketTypeName = 'COMEDOR';
    var menuName = 'MENU';
    var entityScreenName = 'MESAS';

    // Assign configuration
    config.GQLserv = GQLserv;
    config.GQLurl = GQLurl;
    config.SIGNALRserv = SIGNALRserv;
    config.SIGNALRurl = SIGNALRurl;
    config.terminalName = terminalName;
    config.userName = userName;
    config.departmentName = departmentName;
    config.ticketTypeName = ticketTypeName;
    config.menuName = menuName;
    config.entityScreenName = entityScreenName;

    return config;
}