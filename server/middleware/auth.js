const Debug = require('debug')('pmpos:read-service:auth');

module.exports = function (req, res, next) {
    const key = req.header('x-internal-api-key') || req.header('X-INTERNAL-API-KEY');
    const expected = process.env.INTERNAL_API_KEY || 'local-test-key';
    const requestId = req.requestId || 'unknown';
    
    if (!key || key !== expected) {
        // Mask values for safety, but log length to aid debugging
        const mask = (v) => (v ? `${'*'.repeat(Math.max(0, String(v).length - 4))}${String(v).slice(-4)}` : 'none');
        Debug(`🔐 [${requestId}] Unauthorized: got=${mask(key)} expected=${mask(expected)} for ${req.method} ${req.url}`);
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    Debug(`🔓 [${requestId}] Authorized for ${req.method} ${req.url}`);
    next();
};
