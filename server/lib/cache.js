const NodeCache = require('node-cache');
const cache = new NodeCache();

function get(key) { return cache.get(key); }
function set(key, val, ttlMs = 2000) { cache.set(key, val, Math.ceil(ttlMs / 1000)); }

module.exports = { get, set };
