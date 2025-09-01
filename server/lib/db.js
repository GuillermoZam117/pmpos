const sql = require('mssql');
const Debug = require('debug');
const debug = Debug('pmpos:read-service:db');

let pool = null;

async function getPool() {
    if (pool) return pool;
    const conn = process.env.DB_CONN;
    if (!conn) throw new Error('DB_CONN not set');
    pool = await sql.connect(conn);
    return pool;
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

module.exports = { query };
