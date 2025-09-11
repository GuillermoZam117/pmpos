require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const Debug = require('debug');
const auth = require('./middleware/auth');
const requestLogger = require('./middleware/requestLogger');
const cache = require('./lib/cache');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const debug = Debug('pmpos:read-service');
const app = express();

// Global process handlers to surface unexpected errors during local debugging
process.on('uncaughtException', (err) => {
    debug('uncaughtException', err && err.stack ? err.stack : String(err));
    // keep process alive for debugging; in prod a restart supervisor should handle it
});
process.on('unhandledRejection', (reason) => {
    debug('unhandledRejection', reason && reason.stack ? reason.stack : String(reason));
});

app.use(helmet());
app.use(cors());
app.use(express.json());

// Enhanced request/response logging middleware
app.use(requestLogger);

// Swagger configuration
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'PMPOS Read Service API',
            version: '1.0.0',
            description: 'SQL Server direct read API for SambaPOS data with GraphQL fallback'
        },
        servers: [
            {
                url: 'http://localhost:4005',
                description: 'Development server'
            }
        ],
        components: {
            securitySchemes: {
                ApiKeyAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'X-INTERNAL-API-KEY'
                }
            }
        },
        security: [
            {
                ApiKeyAuth: []
            }
        ]
    },
    apis: ['./index.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// auth middleware for internal API
app.use('/internal-api', auth);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Public health check
 *     description: Simple health check endpoint (no auth required)
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
app.get('/health', async (req, res) => {
    res.json({ status: 'ok' });
});

/**
 * @swagger
 * /internal-api/health:
 *   get:
 *     summary: Internal health check with DB connection test
 *     description: Checks service health and database connectivity
 *     tags: [Health]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Service and DB are healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 db:
 *                   type: string
 *                   example: connected
 *       401:
 *         description: Unauthorized - missing or invalid API key
 *       500:
 *         description: Service error or DB unavailable
 */
app.get('/internal-api/health', async (req, res) => {
    try {
        const db = require('./lib/db');
        await db.query('SELECT 1 AS ok');
        res.json({ status: 'ok', db: 'connected' });
    } catch (err) {
        debug('Health DB check failed', err && err.message);
        res.status(500).json({ status: 'error', db: 'unavailable', error: err && err.message });
    }
});

/**
 * @swagger
 * /internal-api/validate-admin:
 *   post:
 *     summary: Validate if a PIN or user is ADMIN via SQL
 *     description: Checks Users and UserRoles in SQL Server to determine admin privileges without touching token logic.
 *     tags: [Auth]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pin:
 *                 type: string
 *                 example: "1234"
 *               name:
 *                 type: string
 *                 example: "GUILLERMO ZAMBRANO"
 *     responses:
 *       200:
 *         description: Admin validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 isAdmin:
 *                   type: boolean
 *                 name:
 *                   type: string
 *                 roleName:
 *                   type: string
 *                 roleId:
 *                   type: integer
 *       401:
 *         description: Unauthorized - missing or invalid API key
 *       500:
 *         description: Server error
 */
app.post('/internal-api/validate-admin', async (req, res) => {
    const requestId = req.requestId || Math.random().toString(36).slice(2, 10);
    try {
        const { pin, name } = req.body || {};
        if (!pin && !name) return res.status(400).json({ ok: false, error: 'pin or name required' });

        const db = require('./lib/db');
        // Normalize and query by PIN or NAME (db.query expects an object map of parameters)
        let where = '';
        let params = {};
        if (pin) { where = 'u.PinCode = @pin'; params = { pin: String(pin) }; }
        else { where = 'UPPER(LTRIM(RTRIM(u.Name))) = UPPER(LTRIM(RTRIM(@name)))'; params = { name: String(name) }; }

        const sql = `
            SELECT TOP 1
                u.Id            AS userId,
                u.Name          AS userName,
                u.PinCode       AS pinCode,
                ur.Id           AS roleId,
                ur.Name         AS roleName,
                ISNULL(ur.IsAdmin, 0) AS isAdmin
            FROM Users u
            LEFT JOIN UserRoles ur ON ur.Id = u.UserRole_Id
            WHERE ${where}
        `;

        const rows = await db.query(sql, params);
        if (!rows || rows.length === 0) {
            return res.json({ ok: true, isAdmin: false, name: null, roleName: null, roleId: null });
        }

        const r = rows[0];
        const roleName = (r.roleName || '').toString();
        const roleUp = roleName.toUpperCase();
        const isAdmin = (r.isAdmin === true || r.isAdmin === 1) || roleUp === 'ADMIN' || roleUp.startsWith('ADMIN');
        return res.json({ ok: true, isAdmin, name: r.userName, roleName, roleId: r.roleId });
    } catch (err) {
        debug(`❌ [${requestId}] validate-admin error: ${err.message}`);
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * @swagger
 * /internal-api/users/admins:
 *   get:
 *     summary: List admin users (by SQL)
 *     description: Returns users whose role is marked as admin (UserRoles.IsAdmin=1) or role name starts with 'ADMIN'.
 *     tags: [Auth]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Array of admin users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   userId:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   roleId:
 *                     type: integer
 *                   roleName:
 *                     type: string
 *                   isAdmin:
 *                     type: boolean
 *       401:
 *         description: Unauthorized - missing or invalid API key
 *       500:
 *         description: Server error
 */
app.get('/internal-api/users/admins', async (req, res) => {
    const requestId = req.requestId || Math.random().toString(36).slice(2, 10);
    try {
        const db = require('./lib/db');
        const sql = `
            SELECT 
                u.Id            AS userId,
                u.Name          AS name,
                ur.Id           AS roleId,
                ur.Name         AS roleName,
                CASE WHEN ISNULL(ur.IsAdmin, 0)=1 OR UPPER(ur.Name) LIKE 'ADMIN%' THEN 1 ELSE 0 END AS isAdmin
            FROM Users u
            LEFT JOIN UserRoles ur ON ur.Id = u.UserRole_Id
            WHERE ISNULL(ur.IsAdmin, 0) = 1 OR UPPER(ur.Name) LIKE 'ADMIN%'
            ORDER BY name ASC
        `;
        const rows = await db.query(sql);
        const list = (rows || []).map(r => ({
            userId: r.userId,
            name: r.name,
            roleId: r.roleId,
            roleName: r.roleName,
            isAdmin: !!(r.isAdmin === 1 || r.isAdmin === true)
        }));
        res.json(list);
    } catch (err) {
        debug(`❌ [${requestId}] users/admins error: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /internal-api/users:
 *   get:
 *     summary: List all users with role info
 *     description: Returns all Users with their UserRoles and computed admin flag (IsAdmin=1 or role name starts with 'ADMIN').
 *     tags: [Auth]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Array of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   userId:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   roleId:
 *                     type: integer
 *                   roleName:
 *                     type: string
 *                   isAdmin:
 *                     type: boolean
 *       401:
 *         description: Unauthorized - missing or invalid API key
 *       500:
 *         description: Server error
 */
app.get('/internal-api/users', async (req, res) => {
    const requestId = req.requestId || Math.random().toString(36).slice(2, 10);
    try {
        const db = require('./lib/db');
        const sql = `
            SELECT 
                u.Id            AS userId,
                u.Name          AS name,
                u.PinCode       AS pinCode,
                ur.Id           AS roleId,
                ur.Name         AS roleName,
                ISNULL(ur.IsAdmin, 0) AS isAdmin
            FROM Users u
            LEFT JOIN UserRoles ur ON ur.Id = u.UserRole_Id
            ORDER BY name ASC
        `;
        const rows = await db.query(sql);
        const list = (rows || []).map(r => ({
            userId: r.userId,
            name: r.name,
            roleId: r.roleId,
            roleName: r.roleName,
            isAdmin: !!(r.isAdmin === 1 || r.isAdmin === true || String(r.roleName || '').toUpperCase().startsWith('ADMIN'))
        }));
        res.json(list);
    } catch (err) {
        debug(`❌ [${requestId}] users list error: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /internal-api/active-tickets:
 *   get:
 *     summary: Get all active (open) tickets
 *     description: Returns all tickets that are not closed, with table and status information. Cached for performance.
 *     tags: [Tickets]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of active tickets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   TicketId:
 *                     type: integer
 *                     example: 27221
 *                   TicketUid:
 *                     type: string
 *                     example: "vlmpB6en90ij-ka-l3cDPQ"
 *                   TicketNumber:
 *                     type: string
 *                     example: "27274"
 *                   TotalAmount:
 *                     type: number
 *                     example: 20
 *                   RemainingAmount:
 *                     type: number
 *                     example: 20
 *                   MesaId:
 *                     type: integer
 *                     nullable: true
 *                     example: 43
 *                   MesaNombre:
 *                     type: string
 *                     nullable: true
 *                     example: "17"
 *                   TicketStates:
 *                     type: string
 *                     example: '[{"S":"No Pagado","SN":"Estado"}]'
 *                   IsClosed:
 *                     type: boolean
 *                     example: false
 *                   LastUpdateTime:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Database error
 */
// Global promise for active-tickets to deduplicate concurrent requests
let activeTicketsPromise = null;

app.get('/internal-api/active-tickets', async (req, res) => {
    const requestId = req.requestId || 'unknown';
    try {
        // Check cache first
        const cached = cache.get('active-tickets');
        if (cached) {
            debug(`📦 [${requestId}] Cache hit: returning ${cached.length} active tickets`);
            return res.json(cached);
        }

        // If there's already a request in flight, wait for it
        if (activeTicketsPromise) {
            debug(`⏳ [${requestId}] Request already in progress, waiting for result...`);
            const result = await activeTicketsPromise;
            return res.json(result);
        }

        debug(`🔍 [${requestId}] Cache miss: querying database for active tickets`);

        // Create the promise and store it to deduplicate concurrent requests
        activeTicketsPromise = (async () => {
            try {
                const db = require('./lib/db');
                // Include UID and status fields (TicketUid, TicketStates) and mesa id for client mapping
                const rows = await db.query(`
            SELECT 
                TicketId, TicketUid, TicketNumber, 
                OpenedAt, ClosedAt, IsClosed, LastUpdateTime,
                TotalAmount, TotalAmountPreTax, RemainingAmount,
                DepartmentId, TerminalId,
                TicketTags, TicketStates,
                -- Cliente info (for delivery)
                ClienteId, ClienteNombre, ClienteTelefono, 
                ClienteDireccion, ClienteCiudad, ClienteRFC,
                -- Mesa info (for dine-in)
                MesaId, MesaNombre,
                -- Payment info
                PredominantPaymentTypeId, PredominantPaymentTypeName, CobradoPor,
                -- Financial details
                Propina, Descuentos, Cortesias, TotalOrderTags,
                VoidCount, VoidAmount,
                -- Calculate time metrics
                DATEDIFF(MINUTE, OpenedAt, GETDATE()) as MinutesOpen,
                CASE 
                    WHEN RemainingAmount = 0 THEN 'PAID'
                    WHEN TicketStates LIKE '%\"Bloqueado\"%' THEN 'BLOCKED'
                    WHEN TicketStates LIKE '%\"No Pagado\"%' THEN 'PENDING'
                    ELSE 'UNKNOWN'
                END as PaymentStatus,
                -- Service type detection
                CASE 
                    WHEN MesaId IS NOT NULL THEN 'DINE_IN'
                    WHEN ClienteId IS NOT NULL THEN 'DELIVERY'
                    ELSE 'TAKEAWAY'
                END as ServiceType
            FROM dbo.VistaTicketsEnriquecida 
            WHERE IsClosed = 0 
            ORDER BY LastUpdateTime DESC
        `);
                debug(`✅ [${requestId}] Query complete: found ${rows.length} active tickets`);
                cache.set('active-tickets', rows, parseInt(process.env.CACHE_TTL_MS || '5000', 10));
                return rows;
            } catch (error) {
                debug(`❌ [${requestId}] Database query failed: ${error.message}`);
                throw error;
            } finally {
                // Clear the promise so new requests can start
                activeTicketsPromise = null;
            }
        })();

        // Wait for the result and return it
        const result = await activeTicketsPromise;
        res.json(result);

    } catch (err) {
        debug(`❌ [${requestId}] Error active-tickets: ${err.message}`);
        // Clear the promise on error
        activeTicketsPromise = null;
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /internal-api/tickets:
 *   get:
 *     summary: List tickets with optional filters
 *     description: Returns tickets filtered by closure status, entity (mesa) or customer, and time window.
 *     tags: [Tickets]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: isClosed
 *         schema:
 *           type: boolean
 *         description: Filter by closed status (default false)
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: integer
 *         description: Filter by mesa/entity id (open ticket bound to that entity)
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: integer
 *         description: Filter by customer entity id
 *       - in: query
 *         name: sinceMinutes
 *         schema:
 *           type: integer
 *         description: Only tickets updated within the last N minutes
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Max rows to return (default 200)
 *     responses:
 *       200:
 *         description: Filtered list of tickets
 */
app.get('/internal-api/tickets', async (req, res) => {
    try {
        const db = require('./lib/db');
        const isClosed = String(req.query.isClosed || 'false').toLowerCase() === 'true';
        const entityId = req.query.entityId ? parseInt(req.query.entityId, 10) : null;
        const customerId = req.query.customerId ? parseInt(req.query.customerId, 10) : null;
        const sinceMinutes = req.query.sinceMinutes ? parseInt(req.query.sinceMinutes, 10) : null;
        const limit = req.query.limit ? Math.min(parseInt(req.query.limit, 10) || 200, 1000) : 200;

        const cacheKey = `tickets:${isClosed}:${entityId || ''}:${customerId || ''}:${sinceMinutes || ''}:${limit}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        let where = '1=1';
        const params = {};
        if (typeof isClosed === 'boolean') {
            where += ' AND IsClosed = @isClosed';
            params.isClosed = isClosed ? 1 : 0;
        }
        if (entityId) {
            where += ' AND MesaId = @entityId';
            params.entityId = entityId;
        }
        if (customerId) {
            where += ' AND ClienteId = @customerId';
            params.customerId = customerId;
        }
        if (sinceMinutes) {
            where += ' AND LastUpdateTime >= DATEADD(MINUTE, -@sinceMinutes, GETDATE())';
            params.sinceMinutes = sinceMinutes;
        }

        const rows = await db.query(`
            SELECT TOP (${limit})
                TicketId, TicketUid, TicketNumber,
                OpenedAt, ClosedAt, IsClosed, LastUpdateTime,
                TotalAmount, TotalAmountPreTax, RemainingAmount,
                DepartmentId, TerminalId,
                TicketTags, TicketStates,
                ClienteId, ClienteNombre, ClienteTelefono,
                MesaId, MesaNombre,
                PredominantPaymentTypeId, PredominantPaymentTypeName, CobradoPor
            FROM dbo.VistaTicketsEnriquecida
            WHERE ${where}
            ORDER BY LastUpdateTime DESC
        `, params);

        cache.set(cacheKey, rows, parseInt(process.env.CACHE_TTL_MS || '2000', 10));
        res.json(rows);
    } catch (err) {
        debug('Error list tickets', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /internal-api/tickets/number/{number}:
 *   get:
 *     summary: Get a ticket by ticket number
 *     tags: [Tickets]
 */
app.get('/internal-api/tickets/number/:number', async (req, res) => {
    try {
        const number = String(req.params.number);
        const db = require('./lib/db');
        const rows = await db.query(`
            SELECT TOP (1) * FROM dbo.VistaTicketsEnriquecida WHERE TicketNumber = @number ORDER BY LastUpdateTime DESC
        `, { number });
        res.json(rows[0] || null);
    } catch (err) {
        debug('Error ticket by number', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /internal-api/tickets/uid/{uid}:
 *   get:
 *     summary: Get a ticket by UID
 *     tags: [Tickets]
 */
app.get('/internal-api/tickets/uid/:uid', async (req, res) => {
    try {
        const uid = String(req.params.uid);
        const db = require('./lib/db');
        const rows = await db.query(`
            SELECT TOP (1) * FROM dbo.VistaTicketsEnriquecida WHERE TicketUid = @uid ORDER BY LastUpdateTime DESC
        `, { uid });
        res.json(rows[0] || null);
    } catch (err) {
        debug('Error ticket by uid', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /internal-api/tickets/by-entity/{entityId}/current:
 *   get:
 *     summary: Get current open ticket for a mesa/entity
 *     tags: [Tickets]
 */
app.get('/internal-api/tickets/by-entity/:entityId/current', async (req, res) => {
    try {
        const entityId = parseInt(req.params.entityId, 10);
        if (!entityId) return res.status(400).json({ error: 'Invalid entity id' });
        const db = require('./lib/db');
        const rows = await db.query(`
            SELECT TOP (1) * FROM dbo.VistaTicketsEnriquecida WHERE MesaId = @entityId AND IsClosed = 0 ORDER BY LastUpdateTime DESC
        `, { entityId });
        res.json(rows[0] || null);
    } catch (err) {
        debug('Error current ticket by entity', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /internal-api/tickets/{id}/details:
 *   get:
 *     summary: Get detailed ticket information
 *     description: Returns complete ticket details including header info and all orders
 *     tags: [Tickets]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Ticket ID
 *         example: 27221
 *     responses:
 *       200:
 *         description: Detailed ticket information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 header:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     TicketId:
 *                       type: integer
 *                     TicketUid:
 *                       type: string
 *                     TicketNumber:
 *                       type: string
 *                     TotalAmount:
 *                       type: number
 *                     RemainingAmount:
 *                       type: number
 *                     MesaId:
 *                       type: integer
 *                       nullable: true
 *                     MesaNombre:
 *                       type: string
 *                       nullable: true
 *                     TicketStates:
 *                       type: string
 *                     IsClosed:
 *                       type: boolean
 *                 orders:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       OrderId:
 *                         type: integer
 *                       TicketUid:
 *                         type: string
 *                       MenuItemId:
 *                         type: integer
 *                       MenuItemName:
 *                         type: string
 *                       PortionName:
 *                         type: string
 *                       Quantity:
 *                         type: number
 *                       Price:
 *                         type: number
 *                       PriceTag:
 *                         type: string
 *                       OrderTags:
 *                         type: string
 *                       OrderStates:
 *                         type: string
 *                       IsVoid:
 *                         type: boolean
 *                       CreatedDateTime:
 *                         type: string
 *                         format: date-time
 *                       LastUpdateDateTime:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Invalid ticket ID
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Database error
 */
app.get('/internal-api/tickets/:id/details', async (req, res) => {
    const requestId = req.requestId || 'unknown';
    try {
        const ticketId = parseInt(req.params.id, 10);
        if (!ticketId) {
            debug(`⚠️ [${requestId}] Invalid ticket ID: ${req.params.id}`);
            return res.status(400).json({ error: 'Invalid ticket id' });
        }

        debug(`🎫 [${requestId}] Fetching details for ticket ${ticketId}`);
        const db = require('./lib/db');
        // Header: complete ticket information for delivery/pickup apps
        const header = await db.query(`
            SELECT 
                TicketId, TicketUid, TicketNumber,
                OpenedAt, ClosedAt, IsClosed, LastUpdateTime,
                TotalAmount, TotalAmountPreTax, RemainingAmount,
                DepartmentId, TerminalId,
                TicketTags, TicketStates,
                -- Cliente completo (delivery)
                ClienteId, ClienteNombre, ClienteTelefono,
                ClienteDireccion, ClienteCiudad, ClienteRFC,
                -- Mesa (dine-in)
                MesaId, MesaNombre,
                -- Payment details
                PredominantPaymentTypeId, PredominantPaymentTypeName, CobradoPor,
                Propina, Descuentos, Cortesias, TotalOrderTags,
                VoidCount, VoidAmount,
                -- Time metrics
                DATEDIFF(MINUTE, OpenedAt, GETDATE()) as MinutesOpen,
                -- Service type
                CASE 
                    WHEN MesaId IS NOT NULL THEN 'DINE_IN'
                    WHEN ClienteId IS NOT NULL THEN 'DELIVERY'
                    ELSE 'TAKEAWAY'
                END as ServiceType,
                -- Status / PaymentStatus
                CASE 
                    WHEN TicketStates LIKE '%Cuenta%' THEN 'BLOCKED' -- Cuenta solicitada bloquea el ticket para mesero
                    WHEN RemainingAmount = 0 OR TicketStates LIKE '%"Pagado"%' THEN 'PAID'
                    WHEN TicketStates LIKE '%"Bloqueado"%' THEN 'BLOCKED'
                    WHEN TicketStates LIKE '%"No Pagado"%' THEN 'PENDING'
                    ELSE 'UNKNOWN'
                END as PaymentStatus
            FROM dbo.VistaTicketsEnriquecida 
            WHERE TicketId = @id
        `, { id: ticketId });

        // Orders from VistaDetalleOrdenes (safe column selection)
        const orders = await db.query(`
            SELECT
                o.OrderId,
                o.TicketId,
                o.MenuItemId,
                'Item-' + CAST(o.MenuItemId AS NVARCHAR(10)) AS MenuItemName,  -- Safe fallback
                ISNULL(o.PortionName, 'Normal') AS PortionName,
                o.Quantity,
                o.Price,
                NULL AS PriceTag,
                NULL AS OrderTags,
                NULL AS OrderStates,
                CAST(0 AS bit) AS IsVoid,
                o.CreatedDateTime,
                o.CreatedDateTime AS LastUpdateDateTime,
                'PENDING' as PreparationStatus,
                NULL as SpecialInstructions,
                (o.Price * o.Quantity) as LineTotal
            FROM dbo.VistaDetalleOrdenes o
            WHERE o.TicketId = @id
            ORDER BY o.CreatedDateTime ASC
        `, { id: ticketId });

        // Get payments for this ticket (for detailed payment info)
        const payments = await db.query(`
            SELECT 
                p.Id as PaymentId,
                pt.Name as PaymentTypeName,
                p.Amount as PaymentAmount,
                p.Date as PaymentDate,
                u.Name as ProcessedBy
            FROM dbo.Payments p
            LEFT JOIN dbo.PaymentTypes pt ON pt.Id = p.PaymentTypeId
            LEFT JOIN dbo.Users u ON u.Id = p.UserId
            WHERE p.TicketId = @id
            ORDER BY p.Date ASC
        `, { id: ticketId });

        const summary = {
            totalOrders: orders.length,
            totalVoids: orders.filter(o => o.IsVoid).length,
            totalPayments: payments.reduce((sum, p) => sum + p.PaymentAmount, 0),
            itemsReady: orders.filter(o => o.PreparationStatus === 'READY').length,
            itemsPending: orders.filter(o => o.PreparationStatus === 'PENDING').length
        };

        debug(`✅ [${requestId}] Ticket ${ticketId} details: ${summary.totalOrders} orders, ${payments.length} payments`);

        res.json({
            header: header[0] || null,
            orders,
            payments,
            summary
        });
    } catch (err) {
        debug(`❌ [${requestId}] Error ticket details for ${req.params.id}: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /internal-api/tables:
 *   get:
 *     summary: Get all tables/entities with current status
 *     description: Returns all table entities with their current ticket status, ideal for table management and delivery systems
 *     tags: [Tables]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of table entities with status
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   EntityId:
 *                     type: integer
 *                     example: 43
 *                   EntityName:
 *                     type: string
 *                     example: "17"
 *                   EntityType:
 *                     type: string
 *                     example: "Mesas"
 *                   Status:
 *                     type: string
 *                     enum: [LIBRE, OCUPADO, CUENTA, BLOQUEADO]
 *                     example: "OCUPADO"
 *                   Color:
 *                     type: string
 *                     example: "#FFFF00"
 *                   CurrentTicketId:
 *                     type: integer
 *                     nullable: true
 *                     example: 27221
 *                   CurrentTicketNumber:
 *                     type: string
 *                     nullable: true
 *                     example: "27274"
 *                   CurrentTicketAmount:
 *                     type: number
 *                     nullable: true
 *                     example: 20
 *                   TimeElapsed:
 *                     type: integer
 *                     nullable: true
 *                     description: Minutes since ticket creation
 *                     example: 45
 *                   CustomData:
 *                     type: string
 *                     nullable: true
 *                     description: Additional entity metadata
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Database error
 */
// Global promises for tables to deduplicate concurrent requests
const tablesPromises = new Map();

app.get('/internal-api/tables', async (req, res) => {
    const requestId = req.requestId || 'unknown';
    try {
        const screen = req.query.screen ? String(req.query.screen) : null;
        const cacheKey = `tables:${screen || 'all'}`;

        // Check cache first
        const cached = cache.get(cacheKey);
        if (cached) {
            debug(`📦 [${requestId}] Tables cache hit: ${cacheKey}`);
            return res.json(cached);
        }

        // If there's already a request in flight for this screen, wait for it
        if (tablesPromises.has(cacheKey)) {
            debug(`⏳ [${requestId}] Tables request already in progress for ${cacheKey}, waiting...`);
            const result = await tablesPromises.get(cacheKey);
            return res.json(result);
        }

        debug(`🔍 [${requestId}] Tables cache miss: querying for ${cacheKey}`);

        // Create the promise and store it to deduplicate concurrent requests
        const tablesPromise = (async () => {
            try {
                const db = require('./lib/db');
                let rows;
                if (screen) {
                    // Filter by Entity Screen mapping if available
                    try {
                        rows = await db.query(`
                            SELECT 
                                e.Id as EntityId,
                                e.Name as EntityName,
                                et.Name as EntityType,
                                e.CustomData,
                                t.TicketId,
                                t.TicketNumber as CurrentTicketNumber,
                                t.TotalAmount as CurrentTicketAmount,
                                t.RemainingAmount as CurrentRemainingAmount,
                                t.TicketStates as CurrentTicketStates,
                                t.OpenedAt as CurrentTicketOpenedAt,
                                CASE 
                                    WHEN t.OpenedAt IS NOT NULL THEN DATEDIFF(MINUTE, t.OpenedAt, GETDATE())
                                    ELSE NULL 
                                END as TimeElapsed,
                                CASE 
                                    WHEN t.TicketId IS NULL THEN 'LIBRE'
                                    WHEN t.TicketStates LIKE '%Cuenta%' THEN 'CUENTA'
                                    WHEN t.RemainingAmount > 0 AND t.TicketStates LIKE '%"Bloqueado"%' THEN 'BLOQUEADO' 
                                    WHEN t.RemainingAmount > 0 THEN 'OCUPADO'
                                    ELSE 'CUENTA'
                                END as Status,
                                CASE 
                                    WHEN t.TicketId IS NULL THEN '#FFFFFF'
                                    WHEN t.TicketStates LIKE '%Cuenta%' THEN '#FF0000'
                                    WHEN t.RemainingAmount > 0 AND t.TicketStates LIKE '%"Bloqueado"%' THEN '#808080'
                                    WHEN t.RemainingAmount > 0 THEN '#FFFF00'
                                    ELSE '#FF0000'
                                END as Color
                            FROM dbo.EntityScreens s
                            INNER JOIN dbo.EntityScreenItems si ON si.EntityScreenId = s.Id
                            INNER JOIN dbo.Entities e ON e.Id = si.EntityId
                            INNER JOIN dbo.EntityTypes et ON et.Id = e.EntityTypeId
                            LEFT JOIN dbo.VistaTicketsEnriquecida t ON t.MesaId = e.Id AND t.IsClosed = 0
                            WHERE s.Name = @screen
                            ORDER BY CASE WHEN ISNUMERIC(e.Name)=1 THEN CAST(e.Name AS INT) ELSE 999999 END, e.Name
                        `, { screen });
                    } catch (e) {
                        debug('Warn: EntityScreen filter not available, falling back to all Mesas:', e && e.message);
                    }
                }

                if (!rows || rows.length === 0) {
                    // Get all entities (tables) with their current ticket status
                    rows = await db.query(`
                        SELECT 
                            e.Id as EntityId,
                            e.Name as EntityName,
                            et.Name as EntityType,
                            e.CustomData,
                            -- Current ticket info if exists
                            t.TicketId,
                            t.TicketNumber as CurrentTicketNumber,
                            t.TotalAmount as CurrentTicketAmount,
                            t.RemainingAmount as CurrentRemainingAmount,
                            t.TicketStates as CurrentTicketStates,
                            t.OpenedAt as CurrentTicketOpenedAt,
                            -- Calculate time elapsed
                            CASE 
                                WHEN t.OpenedAt IS NOT NULL 
                                THEN DATEDIFF(MINUTE, t.OpenedAt, GETDATE())
                                ELSE NULL 
                            END as TimeElapsed,
                            -- Determine status based on ticket state
                            CASE 
                                WHEN t.TicketId IS NULL THEN 'LIBRE'
                                WHEN t.TicketStates LIKE '%Cuenta%' THEN 'CUENTA'
                                WHEN t.RemainingAmount > 0 AND t.TicketStates LIKE '%"Bloqueado"%' THEN 'BLOQUEADO' 
                                WHEN t.RemainingAmount > 0 THEN 'OCUPADO'
                                ELSE 'CUENTA'
                            END as Status,
                            -- Color coding for UI (server hint; UI may override)
                            CASE 
                                WHEN t.TicketId IS NULL THEN '#FFFFFF'  -- LIBRE (white)
                                WHEN t.TicketStates LIKE '%Cuenta%' THEN '#FF0000'      -- CUENTA solicitada (red)
                                WHEN t.RemainingAmount > 0 AND t.TicketStates LIKE '%"Bloqueado"%' THEN '#808080'  -- BLOQUEADO (gray)
                                WHEN t.RemainingAmount > 0 THEN '#FFFF00'               -- OCUPADO (yellow)
                                ELSE '#FF0000'                                          -- CUENTA/PAGADO (red)
                            END as Color
                        FROM dbo.Entities e
                        INNER JOIN dbo.EntityTypes et ON et.Id = e.EntityTypeId
                        LEFT JOIN dbo.VistaTicketsEnriquecida t ON t.MesaId = e.Id AND t.IsClosed = 0
                        WHERE et.Name IN ('Mesas', 'MESAS', 'Mesa', 'MESA')
                        ORDER BY 
                            CASE 
                                WHEN ISNUMERIC(e.Name) = 1 THEN CAST(e.Name AS INT)
                                ELSE 999999
                            END,
                            e.Name
                    `);
                }

                debug(`✅ [${requestId}] Tables query complete: found ${rows?.length || 0} tables for ${cacheKey}`);
                cache.set(cacheKey, rows, parseInt(process.env.CACHE_TTL_MS || '5000', 10));
                return rows;
            } catch (error) {
                debug(`❌ [${requestId}] Tables query failed: ${error.message}`);
                throw error;
            } finally {
                // Clear the promise so new requests can start
                tablesPromises.delete(cacheKey);
            }
        })();

        // Store the promise to deduplicate concurrent requests
        tablesPromises.set(cacheKey, tablesPromise);

        // Wait for the result and return it
        const result = await tablesPromise;
        res.json(result);

    } catch (err) {
        debug(`❌ [${requestId}] Error tables: ${err.message}`);
        // Clear the promise on error
        const screen = req.query.screen ? String(req.query.screen) : null;
        const cacheKey = `tables:${screen || 'all'}`;
        tablesPromises.delete(cacheKey);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /internal-api/entities:
 *   get:
 *     summary: List entities by type with optional search
 *     tags: [Entities]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Entity type name (e.g., 'Mesas', 'Clientes')
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or custom data (contains)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Max rows (default 200)
 */
app.get('/internal-api/entities', async (req, res) => {
    try {
        const db = require('./lib/db');
        const type = req.query.type ? String(req.query.type) : null;
        const search = req.query.search ? String(req.query.search) : null;
        const limit = req.query.limit ? Math.min(parseInt(req.query.limit, 10) || 200, 1000) : 200;

        const cacheKey = `entities:${type || ''}:${search || ''}:${limit}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        let where = '1=1';
        const params = {};
        if (type) {
            where += ' AND (et.Name = @type OR et.Name LIKE @typeLike)';
            params.type = type;
            params.typeLike = `%${type}%`;
        }
        if (search) {
            where += ' AND (e.Name LIKE @searchLike OR e.CustomData LIKE @searchLike)';
            params.searchLike = `%${search}%`;
        }

        const rows = await db.query(`
            SELECT TOP (${limit})
                e.Id as EntityId,
                e.Name as Name,
                et.Name as EntityType,
                e.CustomData
            FROM dbo.Entities e
            INNER JOIN dbo.EntityTypes et ON et.Id = e.EntityTypeId
            WHERE ${where}
            ORDER BY e.Name ASC
        `, params);

        cache.set(cacheKey, rows, parseInt(process.env.CACHE_TTL_MS || '3000', 10));
        res.json(rows);
    } catch (err) {
        debug('Error entities', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /internal-api/entities/{id}:
 *   get:
 *     summary: Get entity details with current open ticket if any
 *     tags: [Entities]
 */
app.get('/internal-api/entities/:id', async (req, res) => {
    try {
        const db = require('./lib/db');
        const id = parseInt(req.params.id, 10);
        if (!id) return res.status(400).json({ error: 'Invalid entity id' });

        const entity = await db.query(`
            SELECT e.Id as EntityId, e.Name as Name, et.Name as EntityType, e.CustomData
            FROM dbo.Entities e
            INNER JOIN dbo.EntityTypes et ON et.Id = e.EntityTypeId
            WHERE e.Id = @id
        `, { id });

        const currentTicket = await db.query(`
            SELECT TOP (1) *
            FROM dbo.VistaTicketsEnriquecida
            WHERE MesaId = @id AND IsClosed = 0
            ORDER BY LastUpdateTime DESC
        `, { id });

        res.json({ entity: entity[0] || null, currentTicket: currentTicket[0] || null });
    } catch (err) {
        debug('Error entity detail', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /internal-api/automation-commands:
 *   get:
 *     summary: Get automation commands with their configuration
 *     description: Returns automation commands for admin actions (gift, void, etc.)
 *     tags: [Automation]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter by command name (e.g., 'Anular', 'Regalo')
 *     responses:
 *       200:
 *         description: List of automation commands
 */
app.get('/internal-api/automation-commands', async (req, res) => {
    const requestId = req.requestId || 'unknown';
    try {
        const nameFilter = req.query.name;
        const cacheKey = `automation-commands:${nameFilter || 'all'}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            debug(`📦 [${requestId}] Cache hit: returning ${cached.length} automation commands`);
            return res.json(cached);
        }

        debug(`🔍 [${requestId}] Cache miss: querying automation commands ${nameFilter ? `for ${nameFilter}` : ''}`);
        const db = require('./lib/db');

        let whereClause = '1=1';
        const params = {};

        if (nameFilter) {
            whereClause += ' AND ac.Name = @name';
            params.name = nameFilter;
        }

        const rows = await db.query(`
            SELECT 
                ac.Id,
                ac.Category,
                ac.ButtonHeader,
                ac.Color,
                ac.FontSize,
                ac.[Values],
                ac.Image,
                ac.ToggleValues,
                ac.ExecuteOnce,
                ac.ClearSelection,
                ac.SortOrder,
                ac.ConfirmationType,
                ac.Symbol,
                ac.ContentTemplate,
                ac.AutoRefresh,
                ac.TileCacheLifetime,
                ac.NavigationModule,
                ac.Name,
                ac.AskTextInput,
                ac.AskNumericInput
            FROM dbo.AutomationCommands ac
            WHERE ${whereClause}
            ORDER BY ISNULL(ac.SortOrder, 999), ac.Name
        `, params);

        debug(`✅ [${requestId}] Query complete: found ${rows.length} automation commands`);
        cache.set(cacheKey, rows, parseInt(process.env.CACHE_TTL_MS || '30000', 10));
        res.json(rows);
    } catch (err) {
        debug(`❌ [${requestId}] Error automation-commands: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /internal-api/automation-reasons:
 *   get:
 *     summary: Get automation command reasons parsed from Values field
 *     description: Returns predefined reasons from AutomationCommands Values field (pipe-separated)
 *     tags: [Automation]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: command
 *         schema:
 *           type: string
 *         description: Filter by command name (e.g., 'Anular', 'Regalo')
 *     responses:
 *       200:
 *         description: List of automation reasons
 */
app.get('/internal-api/automation-reasons', async (req, res) => {
    const requestId = req.requestId || 'unknown';
    try {
        const commandFilter = req.query.command || 'Anular'; // Default to Anular
        const cacheKey = `automation-reasons:${commandFilter}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            debug(`📦 [${requestId}] Cache hit: returning ${cached.length} automation reasons`);
            return res.json(cached);
        }

        debug(`🔍 [${requestId}] Cache miss: querying automation reasons for command ${commandFilter}`);
        const db = require('./lib/db');

        const commands = await db.query(`
            SELECT 
                ac.Id,
                ac.Name,
                ac.ButtonHeader,
                ac.Color,
                ac.[Values]
            FROM dbo.AutomationCommands ac
            WHERE ac.Name = @command AND ac.[Values] IS NOT NULL AND ac.[Values] != ''
        `, { command: commandFilter });

        const reasons = [];
        commands.forEach(cmd => {
            if (cmd.Values) {
                const valuesList = cmd.Values.split('|').filter(v => v.trim());
                valuesList.forEach((reason, index) => {
                    reasons.push({
                        id: `${cmd.Id}-${index}`,
                        commandId: cmd.Id,
                        commandName: cmd.Name,
                        buttonHeader: cmd.ButtonHeader,
                        color: cmd.Color,
                        reason: reason.trim(),
                        actionType: cmd.Name.toLowerCase().includes('anular') || cmd.Name.toLowerCase().includes('void') ? 'void' :
                            cmd.Name.toLowerCase().includes('regalo') || cmd.Name.toLowerCase().includes('gift') ? 'gift' : 'other'
                    });
                });
            }
        });

        debug(`✅ [${requestId}] Query complete: found ${reasons.length} automation reasons from ${commands.length} commands`);
        cache.set(cacheKey, reasons, parseInt(process.env.CACHE_TTL_MS || '30000', 10));
        res.json(reasons);
    } catch (err) {
        debug(`❌ [${requestId}] Error automation-reasons: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /internal-api/customers/search:
 *   get:
 *     summary: Search customers by name/phone
 *     tags: [Customers]
 */
app.get('/internal-api/customers/search', async (req, res) => {
    try {
        const term = (req.query.term || '').toString().trim();
        if (!term) return res.json([]);
        const limit = req.query.limit ? Math.min(parseInt(req.query.limit, 10) || 50, 200) : 50;

        const db = require('./lib/db');
        // VistaClientes: ClienteId, Nombre, CustomData (may contain phone/address JSON)
        const rows = await db.query(`
            SELECT TOP (${limit}) *
            FROM dbo.VistaClientes
            WHERE Nombre LIKE @like OR CustomData LIKE @like
            ORDER BY Nombre ASC
        `, { like: `%${term}%` });

        // Shorter cache on searches
        cache.set(`customers:${term}:${limit}`, rows, 5000);
        res.json(rows);
    } catch (err) {
        debug('Error customers search', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /internal-api/frontend-logs:
 *   post:
 *     summary: Receive and store frontend logs
 *     description: Endpoint for frontend to automatically upload logs for persistent storage
 *     tags: [Logging]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               logs:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     level:
 *                       type: string
 *                       enum: [info, warn, error, debug]
 *                     message:
 *                       type: string
 *                     requestId:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [api_request, api_response, graphql_request, graphql_response, graphql_error]
 *               uploadTimestamp:
 *                 type: string
 *                 format: date-time
 *               browserInfo:
 *                 type: object
 *                 properties:
 *                   userAgent:
 *                     type: string
 *                   url:
 *                     type: string
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *     responses:
 *       200:
 *         description: Logs stored successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 logsReceived:
 *                   type: integer
 *                   example: 25
 *       400:
 *         description: Invalid request format
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
app.post('/internal-api/frontend-logs', async (req, res) => {
    const requestId = req.requestId || 'unknown';
    try {
        const { logs, uploadTimestamp, browserInfo } = req.body;

        if (!logs || !Array.isArray(logs)) {
            debug(`⚠️ [${requestId}] Invalid logs format`);
            return res.status(400).json({ error: 'Invalid logs format' });
        }

        if (logs.length === 0) {
            return res.json({ status: 'ok', logsReceived: 0 });
        }

        debug(`📤 [${requestId}] Received ${logs.length} frontend logs for storage`);

        // Import file logger (Winston) for backend storage
        const fs = require('fs');
        const path = require('path');

        // Ensure logs directory exists
        const logsDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        // Group logs by date and type for file writing
        const logsByDateAndType = {};

        logs.forEach(log => {
            const logDate = log.timestamp ? log.timestamp.split('T')[0] : new Date().toISOString().split('T')[0];
            const logType = log.type?.includes('graphql') ? 'graphql' : 'api';
            const key = `${logDate}-${logType}`;

            if (!logsByDateAndType[key]) {
                logsByDateAndType[key] = [];
            }

            // Format log entry for file
            const formattedLog = {
                timestamp: log.timestamp || new Date().toISOString(),
                level: log.level || 'info',
                message: log.message || '',
                source: 'frontend',
                requestId: log.requestId,
                type: log.type,
                ...browserInfo,
                uploadedAt: uploadTimestamp,
                serverRequestId: requestId
            };

            logsByDateAndType[key].push(formattedLog);
        });

        // Write logs to files
        const promises = Object.entries(logsByDateAndType).map(async ([key, logEntries]) => {
            const [date, type] = key.split('-');
            const filename = `frontend-${type}-${date}.log`;
            const filepath = path.join(logsDir, filename);

            // Format each log entry as a line
            const logLines = logEntries.map(entry => {
                const { timestamp, level, message, ...metadata } = entry;
                const metaStr = Object.keys(metadata).length > 0 ? ` ${JSON.stringify(metadata)}` : '';
                return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`;
            }).join('\n');

            // Append to file (create if doesn't exist)
            return new Promise((resolve, reject) => {
                fs.appendFile(filepath, logLines + '\n', 'utf8', (err) => {
                    if (err) {
                        debug(`❌ [${requestId}] Failed to write logs to ${filename}: ${err.message}`);
                        reject(err);
                    } else {
                        debug(`✅ [${requestId}] Wrote ${logEntries.length} logs to ${filename}`);
                        resolve();
                    }
                });
            });
        });

        await Promise.all(promises);

        debug(`✅ [${requestId}] Successfully stored ${logs.length} frontend logs`);
        res.json({
            status: 'ok',
            logsReceived: logs.length,
            filesWritten: Object.keys(logsByDateAndType).length
        });

    } catch (err) {
        debug(`❌ [${requestId}] Error storing frontend logs: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /internal-api/order-tags/{productId}/{portion}:
 *   get:
 *     summary: Get order tags for a specific product and portion
 *     description: Retrieve available order tag groups and options for product customization
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The product ID
 *       - in: path
 *         name: portion
 *         required: true
 *         schema:
 *           type: string
 *         description: The portion name (e.g., "Normal", "Grande")
 *     responses:
 *       200:
 *         description: Order tags data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 productId:
 *                   type: integer
 *                 portion:
 *                   type: string
 *                 tagGroups:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       minSelection:
 *                         type: integer
 *                       maxSelection:
 *                         type: integer
 *                       tags:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             name:
 *                               type: string
 *                             price:
 *                               type: number
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalGroups:
 *                       type: integer
 *                     totalTags:
 *                       type: integer
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Database error
 */
app.get('/internal-api/order-tags/:productId/:portion', async (req, res) => {
    const requestId = req.requestId || 'unknown';
    try {
        const productId = parseInt(req.params.productId, 10);
        const portion = req.params.portion || 'Normal';

        if (!productId) {
            debug(`⚠️ [${requestId}] Invalid productId: ${req.params.productId}`);
            return res.status(400).json({ error: 'Invalid product ID' });
        }

        debug(`🏷️ [${requestId}] Fetching order tags for product ${productId}, portion: ${portion}`);
        const db = require('./lib/db');

        // Query order tag groups and their tags for the specific product/portion
        // Using real SambaPOS schema: OrderTagGroups, OrderTagMaps, OrderTags
        const tagGroups = await db.query(`
            SELECT DISTINCT
                otg.Id as GroupId,
                otg.SortOrder as GroupSortOrder,
                otg.MinSelectedItems as MinSelection,
                otg.MaxSelectedItems as MaxSelection,
                otg.ColumnCount,
                otg.ButtonHeight,
                otg.FontSize,
                otg.ButtonColor,
                ot.Id as TagId,
                ot.Name as TagName,
                ot.Price as TagPrice,
                ot.SortOrder as TagSortOrder,
                ot.MaxQuantity,
                ot.Color as TagColor,
                ot.Description as TagDescription
            FROM OrderTagGroups otg
            INNER JOIN OrderTags ot ON ot.OrderTagGroupId = otg.Id
            INNER JOIN OrderTagMaps otm ON otm.OrderTagGroupId = otg.Id
            WHERE (otm.MenuItemId = @productId OR otm.MenuItemId = 0)
            AND (otm.PortionName = @portion OR otm.PortionName IS NULL OR otm.PortionName = '')
            ORDER BY otg.SortOrder, ot.SortOrder
        `, {
            productId,
            portion
        }); debug(`🔍 [${requestId}] Raw query returned ${tagGroups.length} tag records`);

        // Group the results by OrderTagGroup
        const groupedData = {};
        tagGroups.forEach(row => {
            const groupId = row.GroupId;
            if (!groupedData[groupId]) {
                groupedData[groupId] = {
                    id: row.GroupId,
                    name: `Group ${row.GroupId}`, // We don't have group names in the real schema
                    sortOrder: row.GroupSortOrder || 0,
                    minSelection: row.MinSelection || 0,
                    maxSelection: row.MaxSelection || 1,
                    columnCount: row.ColumnCount || 1,
                    buttonHeight: row.ButtonHeight || 65,
                    fontSize: row.FontSize || 14,
                    buttonColor: row.ButtonColor,
                    tags: []
                };
            }

            if (row.TagId) {
                groupedData[groupId].tags.push({
                    id: row.TagId,
                    name: row.TagName,
                    price: row.TagPrice || 0,
                    sortOrder: row.TagSortOrder || 0,
                    maxQuantity: row.MaxQuantity || 1,
                    color: row.TagColor,
                    description: row.TagDescription
                });
            }
        }); const finalTagGroups = Object.values(groupedData);
        const totalTags = finalTagGroups.reduce((sum, group) => sum + group.tags.length, 0);

        debug(`✅ [${requestId}] Product ${productId} (${portion}): ${finalTagGroups.length} groups, ${totalTags} total tags`);

        res.json({
            productId,
            portion,
            tagGroups: finalTagGroups,
            summary: {
                totalGroups: finalTagGroups.length,
                totalTags
            }
        });

    } catch (err) {
        debug(`❌ [${requestId}] Error fetching order tags for product ${req.params.productId}: ${err.message}`);
        res.status(500).json({ error: err.message, details: err.message });
    }
});

/**
 * @swagger
 * /internal-api/automation-buttons/{terminalId}:
 *   post:
 *     summary: Get automation command buttons for terminal ticket
 *     description: Retrieve available automation command buttons for a specific terminal and ticket orders
 *     parameters:
 *       - in: path
 *         name: terminalId
 *         required: true
 *         schema:
 *           type: string
 *         description: The terminal ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderUids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of order UIDs
 *     responses:
 *       200:
 *         description: Automation buttons data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 terminalId:
 *                   type: string
 *                 orderUids:
 *                   type: array
 *                   items:
 *                     type: string
 *                 buttons:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       command:
 *                         type: string
 *                       color:
 *                         type: string
 *                       enabled:
 *                         type: boolean
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalButtons:
 *                       type: integer
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Database error
 */
app.post('/internal-api/automation-buttons/:terminalId', async (req, res) => {
    const requestId = req.requestId || 'unknown';
    try {
        const terminalId = req.params.terminalId;
        const { orderUids = [] } = req.body || {};

        if (!terminalId) {
            debug(`⚠️ [${requestId}] Invalid terminalId: ${req.params.terminalId}`);
            return res.status(400).json({ error: 'Invalid terminal ID' });
        }

        debug(`🔘 [${requestId}] Fetching automation buttons for terminal ${terminalId}, orders: ${orderUids.length}`);
        const db = require('./lib/db');

        // For now, return empty result to avoid breaking the app while we research the schema
        // TODO: Implement proper automation commands query when schema is available
        debug(`✅ [${requestId}] Terminal ${terminalId}: 0 automation buttons (placeholder)`);

        res.json({
            terminalId,
            orderUids,
            buttons: [],
            summary: {
                totalButtons: 0
            }
        });

    } catch (err) {
        debug(`❌ [${requestId}] Error fetching automation buttons for terminal ${req.params.terminalId}: ${err.message}`);

        res.json({
            terminalId: req.params.terminalId,
            orderUids: req.body?.orderUids || [],
            buttons: [],
            summary: {
                totalButtons: 0
            }
        });
    }
});

/**
 * @swagger
 * /internal-api/active-tickets:
 *   get:
 *     summary: Get all active (unpaid) tickets
 *     description: Retrieve all tickets that are currently open and unpaid
 *     parameters:
 *       - in: query
 *         name: forceRefresh
 *         schema:
 *           type: boolean
 *         description: Force refresh bypassing cache
 *     responses:
 *       200:
 *         description: Active tickets data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tickets:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ticketId:
 *                         type: integer
 *                       ticketNumber:
 *                         type: string
 *                       ticketUid:
 *                         type: string
 *                       totalAmount:
 *                         type: number
 *                       remainingAmount:
 *                         type: number
 *                       openedAt:
 *                         type: string
 *                         format: date-time
 *                       departmentId:
 *                         type: integer
 *                       terminalId:
 *                         type: string
 *                       ticketStates:
 *                         type: string
 *                       tableId:
 *                         type: integer
 *                       tableName:
 *                         type: string
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalTickets:
 *                       type: integer
 *                     totalAmount:
 *                       type: number
 *       500:
 *         description: Database error
 */
app.get('/internal-api/active-tickets', async (req, res) => {
    const requestId = req.requestId || 'unknown';
    try {
        const forceRefresh = req.query.forceRefresh === 'true';

        debug(`🎫 [${requestId}] Fetching active tickets (forceRefresh: ${forceRefresh})`);
        const db = require('./lib/db');

        // Query active tickets from SambaPOS database
        const tickets = await db.query(`
            SELECT 
                t.Id as TicketId,
                t.TicketNumber,
                t.TicketUid,
                t.Date as OpenedAt,
                t.LastUpdateTime,
                t.TotalAmount,
                t.RemainingAmount,
                t.DepartmentId,
                t.TerminalName as TerminalId,
                t.TicketStates,
                t.TicketTags,
                t.IsClosed,
                -- Table/Entity information
                e.Id as TableId,
                e.Name as TableName,
                et.Name as EntityType,
                -- Calculate time elapsed
                DATEDIFF(MINUTE, t.Date, GETDATE()) as TimeElapsedMinutes
            FROM Tickets t
            LEFT JOIN Entities e ON e.Id = t.Id  -- This might need adjustment based on your schema
            LEFT JOIN EntityTypes et ON et.Id = e.EntityTypeId
            WHERE t.IsClosed = 0 
            AND t.RemainingAmount > 0
            ORDER BY t.Date DESC
        `);

        debug(`🔍 [${requestId}] Raw query returned ${tickets.length} active ticket records`);

        // Process the results
        const processedTickets = tickets.map(row => ({
            ticketId: row.TicketId,
            ticketNumber: row.TicketNumber,
            ticketUid: row.TicketUid,
            totalAmount: row.TotalAmount || 0,
            remainingAmount: row.RemainingAmount || 0,
            openedAt: row.OpenedAt,
            lastUpdateTime: row.LastUpdateTime,
            departmentId: row.DepartmentId,
            terminalId: row.TerminalId,
            ticketStates: row.TicketStates,
            ticketTags: row.TicketTags,
            isClosed: row.IsClosed,
            tableId: row.TableId,
            tableName: row.TableName,
            entityType: row.EntityType,
            timeElapsedMinutes: row.TimeElapsedMinutes
        }));

        const totalAmount = processedTickets.reduce((sum, ticket) => sum + (ticket.totalAmount || 0), 0);

        debug(`✅ [${requestId}] Found ${processedTickets.length} active tickets, total: $${totalAmount}`);

        res.json({
            tickets: processedTickets,
            summary: {
                totalTickets: processedTickets.length,
                totalAmount
            }
        });

    } catch (err) {
        debug(`❌ [${requestId}] Error fetching active tickets: ${err.message}`);
        res.status(500).json({ error: err.message, details: err.message });
    }
});

/**
 * @swagger
 * /internal-api/menu-items:
 *   get:
 *     summary: Get menu items with categories and portions
 *     description: Retrieve all menu items with their categories, portions, and pricing information
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category name
 *       - in: query
 *         name: includePortions
 *         schema:
 *           type: boolean
 *         description: Include portion information
 *     responses:
 *       200:
 *         description: Menu items data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       sortOrder:
 *                         type: integer
 *                       color:
 *                         type: string
 *                       menuItems:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             name:
 *                               type: string
 *                             price:
 *                               type: number
 *                             portions:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   name:
 *                                     type: string
 *                                   price:
 *                                     type: number
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalCategories:
 *                       type: integer
 *                     totalMenuItems:
 *                       type: integer
 *       500:
 *         description: Database error
 */
app.get('/internal-api/menu-items', async (req, res) => {
    const requestId = req.requestId || 'unknown';
    try {
        const categoryFilter = req.query.category;
        const includePortions = req.query.includePortions === 'true';

        debug(`🍽️ [${requestId}] Fetching menu items (category: ${categoryFilter || 'all'}, portions: ${includePortions})`);
        const db = require('./lib/db');

        // Query menu items with categories from SambaPOS database
        let query = `
            SELECT 
                mg.Id as CategoryId,
                mg.Name as CategoryName,
                mg.SortOrder as CategorySortOrder,
                mg.Color as CategoryColor,
                mi.Id as MenuItemId,
                mi.Name as MenuItemName,
                mi.GroupCode as MenuItemGroupCode,
                -- Default price from MenuItems
                COALESCE(mip.Price, 0) as Price,
                -- Portion information if requested
                p.Name as PortionName,
                mip.Price as PortionPrice
            FROM MenuItemGroups mg
            LEFT JOIN MenuItems mi ON mi.GroupCode = mg.GroupCode
            LEFT JOIN MenuItemPrices mip ON mip.MenuItemId = mi.Id
            LEFT JOIN Portions p ON p.Id = mip.PortionId
        `;

        const params = {};
        if (categoryFilter) {
            query += ` WHERE mg.Name = @category`;
            params.category = categoryFilter;
        }

        query += ` ORDER BY mg.SortOrder, mg.Name, mi.Name, p.Name`;

        const menuData = await db.query(query, params);

        debug(`🔍 [${requestId}] Raw query returned ${menuData.length} menu item records`);

        // Group by categories and menu items
        const categoriesMap = {};

        menuData.forEach(row => {
            const categoryId = row.CategoryId;
            const menuItemId = row.MenuItemId;

            // Create category if not exists
            if (!categoriesMap[categoryId]) {
                categoriesMap[categoryId] = {
                    id: categoryId,
                    name: row.CategoryName,
                    sortOrder: row.CategorySortOrder || 0,
                    color: row.CategoryColor,
                    menuItems: {}
                };
            }

            // Create menu item if not exists
            if (menuItemId && !categoriesMap[categoryId].menuItems[menuItemId]) {
                categoriesMap[categoryId].menuItems[menuItemId] = {
                    id: menuItemId,
                    name: row.MenuItemName,
                    groupCode: row.MenuItemGroupCode,
                    price: row.Price || 0,
                    portions: []
                };
            }

            // Add portion if exists and requested
            if (includePortions && row.PortionName && menuItemId) {
                const existingPortion = categoriesMap[categoryId].menuItems[menuItemId].portions
                    .find(p => p.name === row.PortionName);

                if (!existingPortion) {
                    categoriesMap[categoryId].menuItems[menuItemId].portions.push({
                        name: row.PortionName,
                        price: row.PortionPrice || 0
                    });
                }
            }
        });

        // Convert to final format
        const categories = Object.values(categoriesMap).map(category => ({
            ...category,
            menuItems: Object.values(category.menuItems)
        }));

        const totalMenuItems = categories.reduce((sum, cat) => sum + cat.menuItems.length, 0);

        debug(`✅ [${requestId}] Found ${categories.length} categories with ${totalMenuItems} menu items`);

        res.json({
            categories,
            summary: {
                totalCategories: categories.length,
                totalMenuItems
            }
        });

    } catch (err) {
        debug(`❌ [${requestId}] Error fetching menu items: ${err.message}`);
        res.status(500).json({ error: err.message, details: err.message });
    }
});

const port = parseInt(process.env.PORT || '4005', 10);
const host = process.env.HOST || '0.0.0.0'; // Listen on all interfaces
app.listen(port, host, () => debug(`Read-service listening on ${host}:${port}`));
