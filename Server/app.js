// Builds the HTTP + Socket.IO server. Kept separate from index.js so tests can start it on a
// random port with their own settings.
import express from 'express';
import http from 'node:http';
import cors from 'cors';
import { Server } from 'socket.io';
import { config as defaultConfig } from './config.js';
import { createAuthRouter } from './routes/auth.js';
import { verifySessionToken } from './auth/session.js';
import { createNarratorFromConfig } from './narrator/index.js';
import { createGameState, registerGameSockets } from './sockets/gameSockets.js';

export function createGameServer({
  config = defaultConfig,
  narrator = null,
  verifyGoogleToken,
  logger = console
} = {}) {
  const app = express();
  const allowAnyOrigin = !config.isProduction && config.allowedOrigins.length === 0;
  const corsOrigin = allowAnyOrigin ? true : config.allowedOrigins;

  app.disable('x-powered-by');
  app.use(cors({ origin: corsOrigin, methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
  app.use(express.json({ limit: '100kb' }));

  const gameNarrator = narrator || createNarratorFromConfig(config.ai, { logger });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', narrator: gameNarrator.providerName, uptimeSeconds: Math.round(process.uptime()) });
  });
  app.use('/api/auth', createAuthRouter(verifyGoogleToken ? { verifyGoogleToken } : undefined));
  app.get('/', (req, res) => {
    res.json({ name: 'CyberLock server', status: 'ok', health: '/api/health' });
  });
  app.use((req, res) => {
    res.status(404).json({ message: 'Not found' });
  });

  const server = http.createServer(app);
  // Clients re-send join_room whenever their socket reconnects, so no server-side recovery is needed.
  const io = new Server(server, {
    cors: { origin: corsOrigin, methods: ['GET', 'POST'] }
  });

  // Every socket must carry a valid session token from /api/auth.
  io.use((socket, next) => {
    const user = verifySessionToken(socket.handshake.auth?.token);
    if (!user) {
      const error = new Error('unauthorized');
      error.data = { message: 'Please sign in again.' };
      return next(error);
    }
    socket.data.user = user;
    next();
  });

  const state = createGameState();
  const sockets = registerGameSockets({ io, state, narrator: gameNarrator, timing: config.timing, logger });

  const close = () =>
    new Promise(resolve => {
      io.close(() => resolve());
    });

  return { app, server, io, state, narrator: gameNarrator, sockets, close };
}
