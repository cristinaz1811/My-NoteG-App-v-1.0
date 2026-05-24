const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const exerciseRoutes = require('./routes/exercises');
const notificationRoutes = require('./routes/notifications');
const { registerClient, removeClient, initRedisSubscriber } = require('./utils/notificationService');
const plagiarismRoutes = require('./routes/plagiarism');
const exportRoutes = require('./routes/export');
const analyticsRoutes = require('./routes/analytics');
const calendarRoutes = require('./routes/calendar');
const { DISTRIBUTED_MODE, closeRedis } = require('./utils/redisClient');

// Fail fast if critical environment variables are missing
const REQUIRED_ENV = ['JWT_SECRET', 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
    console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
    console.error('Copy backend/.env.example to backend/.env and fill in the values.');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server (needed for WebSocket upgrade)
const server = http.createServer(app);

// WebSocket server attached to the same HTTP server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
    let userId = null;

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);

            // Client must authenticate with a JWT token
            if (msg.type === 'auth') {
                const decoded = jwt.verify(msg.token, process.env.JWT_SECRET);
                userId = decoded.id;
                registerClient(userId, ws);
                ws.send(JSON.stringify({ type: 'auth_success', userId }));
            }
        } catch (err) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message or token' }));
        }
    });

    ws.on('close', () => {
        if (userId) {
            removeClient(userId, ws);
        }
    });

    ws.on('error', (err) => {
        console.error('[WS] Error:', err.message);
        if (userId) {
            removeClient(userId, ws);
        }
    });

    // Send a welcome message prompting authentication
    ws.send(JSON.stringify({ type: 'welcome', message: 'Please authenticate with { type: "auth", token: "..." }' }));
});

// Middleware
// Allowed origins: production URLs come from FRONTEND_URL (comma-separated),
// local dev origins are always permitted.
const allowedOrigins = [
    ...(process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(',').map((origin) => origin.trim())
        : []),
    'http://localhost:3000',
    'http://localhost:3001',
];
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded avatars
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/plagiarism', plagiarismRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/calendar', calendarRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running', websocket: true });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(`[ERROR] ${req.method} ${req.originalUrl} -`, err.stack || err.message);
    res.status(err.status || 500).json({ error: 'Something went wrong!' });
});

// Start server (using http server instead of express directly)
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);
    console.log(`Distributed mode: ${DISTRIBUTED_MODE ? 'ON' : 'OFF'}`);

    // In distributed mode, subscribe to Redis for cross-instance notifications
    if (DISTRIBUTED_MODE) {
        initRedisSubscriber();
    }
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
        await closeRedis();
        process.exit(0);
    });
    // Force exit after 10 seconds
    setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = { app, server };
