import { verifyAccessToken, generateAccessToken, verifyRefreshToken } from '../config/auth.js';
import { queryOne } from '../config/database.js';

// Middleware to verify JWT token
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
};

// Middleware for optional authentication (continue if no token)
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const decoded = verifyAccessToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }

  next();
};

// Middleware to handle expired tokens and refresh them
export const refreshTokenMiddleware = async (req, res, next) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token required' });
  }

  const decoded = verifyRefreshToken(refreshToken);

  if (!decoded) {
    return res.status(403).json({ message: 'Invalid or expired refresh token' });
  }

  try {
    const user = await queryOne(
      'SELECT id, username, email FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newAccessToken = generateAccessToken(user.id, user.email, user.username);
    res.json({
      accessToken: newAccessToken,
      refreshToken: refreshToken, // Return same refresh token
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
