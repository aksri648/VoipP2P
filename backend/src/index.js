require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const { initializeFirebase } = require('./services/firebaseService');
const setupSocketHandlers = require('./services/socketService');
const apiRoutes = require('./routes/api');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      firebase: process.env.FIREBASE_SERVICE_ACCOUNT ? 'configured' : 'not_configured'
    }
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'VoIP P2P Signaling Server',
    version: '1.0.0',
    description: 'P2P VoIP signaling server with single-ID connection'
  });
});

setupSocketHandlers(io);

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`[Server] Running on ${HOST}:${PORT}`);
  console.log(`[Server] Health check: http://${HOST}:${PORT}/health`);

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      initializeFirebase();
      console.log('[Server] Firebase initialized');
    } catch (error) {
      console.error('[Server] Firebase initialization error:', error.message);
    }
  } else {
    console.log('[Server] Firebase not configured — FCM push disabled');
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Server] Uncaught Exception:', error);
  process.exit(1);
});

module.exports = { app, server, io };
