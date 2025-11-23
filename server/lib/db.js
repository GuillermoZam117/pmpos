const sql = require('mssql');
const Debug = require('debug');
const { getConnectionString } = require('./sqlConfig');
const debug = Debug('pmpos:read-service:db');

let pool = null;
let currentConn = null;

async function connectPool(connString) {
    debug('🔌 Opening SQL connection...');
    const newPool = await sql.connect(connString);
    currentConn = connString;
    return newPool;
}

async function getPool() {
    const conn = getConnectionString();
    if (!conn) {
        throw new Error('DB connection string not configured. Define DB_CONN or use /internal-api/sql-config.');
    }
    if (!pool) {
        pool = await connectPool(conn);
        return pool;
    }
    if (currentConn !== conn) {
        await resetPool();
        pool = await connectPool(conn);
    }
    return pool;
}

async function resetPool() {
    if (pool) {
        try {
            await pool.close();
        } catch (err) {
            debug('⚠️ Error closing SQL pool', err?.message);
        }
    }
    pool = null;
    currentConn = null;
}

async function query(text, params = {}) {
    const p = await getPool();
    const request = p.request();
    Object.keys(params).forEach(k => {
        request.input(k, params[k]);
    });
    const res = await request.query(text);
    return res.recordset || [];
}

module.exports = { query, resetPool };
