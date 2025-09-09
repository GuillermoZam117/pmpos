const Debug = require('debug')('pmpos:read-service:auth');

module.exports = function (req, res, next) {
    const requestId = req.requestId || 'unknown';
    // Whitelist paths that do not require internal key (SambaPOS compatibility)
    const WHITELIST = new Set(['/health', '/validate-admin', '/users', '/users/admins']);
    if (WHITELIST.has(req.path)) {
        return next();
    }

    // Only enforce when INTERNAL_API_KEY is set
    const expected = process.env.INTERNAL_API_KEY || null;
    if (!expected) {
        return next();
    }

    const key = req.header('x-internal-api-key') || req.header('X-INTERNAL-API-KEY');
    if (!key || key !== expected) {
        const mask = (v) => (v ? `${'*'.repeat(Math.max(0, String(v).length - 4))}${String(v).slice(-4)}` : 'none');
        Debug(`🔐 [${requestId}] Unauthorized: got=${mask(key)} expected=${mask(expected)} for ${req.method} ${req.url}`);
        return res.status(401).json({ error: 'Unauthorized' });
    }

    Debug(`🔓 [${requestId}] Authorized for ${req.method} ${req.url}`);
    next();
};
