const fs = require('fs');
const path = require('path');
const sql = require('mssql');

const CONFIG_PATH = path.join(__dirname, '..', 'sql-config.json');

const readConfigFile = () => {
    try {
        if (!fs.existsSync(CONFIG_PATH)) return null;
        const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const buildConnectionString = (cfg = {}) => {
    if (!cfg) return null;
    if (cfg.connectionString && cfg.connectionString.trim()) {
        return cfg.connectionString.trim();
    }
    const host = cfg.host || 'localhost';
    const port = cfg.port || '1433';
    const database = cfg.database || 'SambaPOS5';
    const user = cfg.user || '';
    const password = cfg.password || '';
    const parts = [
        `Server=${host},${port}`,
        `Database=${database}`
    ];
    if (user && password) {
        parts.push(`User Id=${user}`);
        parts.push(`Password=${password}`);
    } else {
        parts.push('Trusted_Connection=true');
    }
    parts.push('Encrypt=false');
    parts.push('TrustServerCertificate=true');
    return parts.join(';');
};

const getConnectionString = () => {
    if (process.env.DB_CONN && process.env.DB_CONN.trim()) {
        return process.env.DB_CONN.trim();
    }
    const cfg = readConfigFile();
    if (!cfg) return null;
    return buildConnectionString(cfg);
};

const getSanitizedConfig = () => {
    const cfg = readConfigFile();
    if (!cfg) return null;
    const safe = { ...cfg };
    if (safe.password) safe.password = '***';
    if (safe.connectionString) safe.connectionString = '***';
    return safe;
};

const saveConfig = (cfg = {}) => {
    const clean = {
        host: cfg.host || '',
        port: cfg.port || '',
        database: cfg.database || '',
        user: cfg.user || '',
        password: cfg.password || '',
        connectionString: cfg.connectionString || ''
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(clean, null, 2), 'utf8');
    return clean;
};

const testConnection = async (cfg = {}) => {
    const connString = buildConnectionString(cfg);
    if (!connString) {
        throw new Error('Configuración incompleta para probar la conexión');
    }
    let pool;
    try {
        pool = await sql.connect(connString);
        await pool.request().query('SELECT TOP 1 1 AS ok');
        return true;
    } finally {
        if (pool) {
            try { await pool.close(); } catch { }
        }
    }
};

module.exports = {
    CONFIG_PATH,
    getConnectionString,
    getSanitizedConfig,
    saveConfig,
    testConnection,
    buildConnectionString
};
