require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const packageRoutes = require('./routes/packageRoutes');
const driverRoutes = require('./routes/driverRoutes');
const userAuthRoutes = require('./routes/userAuthRoutes');
const locationRoutes = require('./routes/locationRoutes');
const { applyDriverLocationUpdate } = require('./services/driverLocationService');
const { getJwtSecretOrThrow, extractBearerToken, verifyAccessToken } = require('./utils/tokenVerification');
const cors = require('cors');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

getJwtSecretOrThrow();

const app = express();
const httpServer = http.createServer(app);
const DRIVER_UPDATES_ROOM = 'room:courier-driver-updates';

// Security headers
app.use(helmet());

// Enable CORS
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

const io = new Server(httpServer, {
    cors: {
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (allowedOrigins.indexOf(origin) !== -1) {
                return callback(null, true);
            }
            return callback(new Error('Not allowed by CORS'));
        },
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

io.use((socket, next) => {
    const authToken = socket.handshake.auth?.token;
    const authorizationHeader = socket.handshake.headers?.authorization;
    const token = authToken || extractBearerToken(authorizationHeader);

    if (!token) {
        return next(new Error('Authorization token missing or malformed'));
    }

    const verification = verifyAccessToken(token);
    if (!verification.ok) {
        return next(new Error('Invalid token'));
    }

    socket.userId = verification.decodedToken.id;
    socket.userRole = verification.decodedToken.role || 'sender';
    return next();
});

io.on('connection', (socket) => {
    if (socket.userRole === 'courier') {
        socket.join(DRIVER_UPDATES_ROOM);
    }

    socket.on('driver-location', (payload, ack) => {
        if (socket.userRole !== 'courier') {
            const errorPayload = { ok: false, status: 403, message: 'Forbidden: courier role required' };
            if (typeof ack === 'function') ack(errorPayload);
            return;
        }

        const updateResult = applyDriverLocationUpdate({
            actorUserId: socket.userId,
            body: payload || {},
            enforceFreshness: true,
            eventTimestamp: payload?.timestamp || payload?.lastUpdated,
            requireActiveAssignment: true,
        });

        if (!updateResult.ok) {
            const errorPayload = {
                ok: false,
                status: updateResult.status,
                message: updateResult.message,
                code: updateResult.code,
            };
            if (typeof ack === 'function') ack(errorPayload);
            return;
        }

        const canonicalPayload = {
            id: updateResult.driver.id,
            userId: updateResult.driver.userId,
            lat: updateResult.driver.lat,
            lng: updateResult.driver.lng,
            isOnline: updateResult.driver.isOnline,
            lastUpdated: updateResult.driver.lastUpdated,
        };

        io.to(DRIVER_UPDATES_ROOM).emit('driver-update', canonicalPayload);
        if (typeof ack === 'function') ack({ ok: true, status: 200, driver: canonicalPayload });
    });
});

const PORT = process.env.PORT || 4000;

// Middleware to parse JSON bodies
app.use(express.json());

app.use(session({
    secret: getJwtSecretOrThrow(),
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax'
    },
}));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api', apiLimiter);
app.use('/user/login', authLimiter);
app.use('/user/register', authLimiter);

// Routes
app.use('/api', packageRoutes);
app.use('/api', locationRoutes);
app.use('/api', driverRoutes);
app.use('/user', userAuthRoutes);

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal server error' });
});

// Start the server
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
