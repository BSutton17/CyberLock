import express from 'express';
import { config } from '../config.js';
import { createGoogleVerifier } from '../auth/google.js';
import { createGuestUser, createSessionToken, requireUser } from '../auth/session.js';

// `verifyGoogleToken` is injectable so tests don't call Google.
export function createAuthRouter({ verifyGoogleToken = createGoogleVerifier(config.auth.googleClientId) } = {}) {
  const router = express.Router();

  // Tells the client which sign-in options to show.
  router.get('/config', (req, res) => {
    res.json({
      googleClientId: config.auth.googleClientId || null,
      guestLoginEnabled: config.auth.guestLoginEnabled
    });
  });

  router.post('/google', async (req, res) => {
    const credential = req.body?.credential;
    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({ message: 'Missing Google credential.' });
    }

    try {
      const user = await verifyGoogleToken(credential);
      return res.json({ token: createSessionToken(user), user });
    } catch (error) {
      console.warn('[AUTH] Google sign-in failed:', error.message);
      return res.status(401).json({ message: 'Google sign-in failed. Please try again.' });
    }
  });

  router.post('/guest', (req, res) => {
    if (!config.auth.guestLoginEnabled) {
      return res.status(403).json({ message: 'Guest login is disabled on this server.' });
    }

    const user = createGuestUser(req.body?.name);
    return res.json({ token: createSessionToken(user), user });
  });

  router.get('/me', requireUser, (req, res) => {
    res.json({ user: req.user });
  });

  return router;
}

export default createAuthRouter;
