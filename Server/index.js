// CyberLock server entry point. Run with `npm run dev` (auto-reload) or `npm start`.
import { config, validateConfig } from './config.js';
import { createGameServer } from './app.js';

const problems = validateConfig();
for (const problem of problems) {
  console.warn(`[CONFIG] ${problem}`);
}
if (config.isProduction && !config.auth.jwtSecret) {
  console.error('[CONFIG] Refusing to start without JWT_SECRET in production.');
  process.exit(1);
}

const { server } = createGameServer({ config });

server.listen(config.port, '0.0.0.0', () => {
  console.log(`[SERVER] CyberLock listening on http://localhost:${config.port}`);
  console.log(`[SERVER] Sign-in: ${config.auth.googleClientId ? 'Google' : 'Google not configured'}${config.auth.guestLoginEnabled ? ' + guest' : ''}`);
});

const shutdown = (signal) => {
  console.log(`[SERVER] ${signal} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
