// Session tokens. After Google (or guest) sign-in the server issues its own signed JWT, which the
// client sends with API calls and when opening its socket. No database is needed.
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const MAX_NAME_LENGTH = 24;

export function sanitizeDisplayName(rawName, fallback = 'Operative') {
  const cleaned = String(rawName ?? '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH)
    .trim();
  return cleaned || fallback;
}

export function createGuestUser(rawName) {
  return {
    id: `guest:${crypto.randomUUID()}`,
    name: sanitizeDisplayName(rawName, 'Guest'),
    provider: 'guest'
  };
}

export function createSessionToken(user, { secret = config.auth.jwtSecret, expiresIn = config.auth.sessionTtl } = {}) {
  if (!secret) throw new Error('JWT secret is not configured');
  return jwt.sign(
    {
      name: user.name,
      provider: user.provider,
      ...(user.picture ? { picture: user.picture } : {})
    },
    secret,
    { subject: user.id, expiresIn }
  );
}

// Returns the user encoded in a valid token, or null.
export function verifySessionToken(token, { secret = config.auth.jwtSecret } = {}) {
  if (!token || typeof token !== 'string' || !secret) return null;
  try {
    const payload = jwt.verify(token, secret);
    if (!payload?.sub) return null;
    return {
      id: payload.sub,
      name: sanitizeDisplayName(payload.name),
      provider: payload.provider || 'unknown',
      ...(payload.picture ? { picture: payload.picture } : {})
    };
  } catch {
    return null;
  }
}

export function readBearerToken(req) {
  const header = req.headers?.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

export function requireUser(req, res, next) {
  const user = verifySessionToken(readBearerToken(req));
  if (!user) {
    return res.status(401).json({ message: 'Please sign in again.' });
  }
  req.user = user;
  next();
}
