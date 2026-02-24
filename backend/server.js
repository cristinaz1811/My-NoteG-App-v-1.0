const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const exerciseRoutes = require('./routes/exercises');
const notificationRoutes = require('./routes/notifications');
const { registerClient, removeClient } = require('./utils/notificationService');
const plagiarismRoutes = require('./routes/plagiarism');
const exportRoutes = require('./routes/export');
const analyticsRoutes = require('./routes/analytics');

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
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/plagiarism', plagiarismRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running', websocket: true });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server (using http server instead of express directly)
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);
});

module.exports = { app, server };
