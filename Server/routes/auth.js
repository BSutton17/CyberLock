import express from 'express';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../config/auth.js';
import { query, queryOne, execute } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// REGISTER - Create new user with username and password
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await queryOne(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await execute(
      'INSERT INTO users (username, email, password_hash, auth_type) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, 'local']
    );

    const newUser = await queryOne(
      'SELECT id, username, email FROM users WHERE id = ?',
      [result.id]
    );

    const accessToken = generateAccessToken(newUser.id, newUser.email, newUser.username);
    const refreshToken = generateRefreshToken(newUser.id);

    // Save refresh token to database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await execute(
      'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES (?, ?, ?)',
      [newUser.id, refreshToken, expiresAt]
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: newUser,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// LOGIN - Authenticate user with username and password
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Find user
    const user = await queryOne(
      'SELECT id, username, email, password_hash FROM users WHERE username = ?',
      [username]
    );

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email, user.username);
    const refreshToken = generateRefreshToken(user.id);

    // Save refresh token to database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await execute(
      'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES (?, ?, ?)',
      [user.id, refreshToken, expiresAt]
    );

    res.json({
      message: 'Login successful',
      user: { id: user.id, username: user.username, email: user.email },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// REFRESH TOKEN - Get new access token using refresh token
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      return res.status(403).json({ message: 'Invalid or expired refresh token' });
    }

    // Check if refresh token exists in database
    const session = await queryOne(
      'SELECT id FROM sessions WHERE refresh_token = ? AND expires_at > datetime("now")',
      [refreshToken]
    );

    if (!session) {
      return res.status(403).json({ message: 'Refresh token not found or expired' });
    }

    // Get user info
    const user = await queryOne(
      'SELECT id, username, email FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user.id, user.email, user.username);

    res.json({
      accessToken: newAccessToken,
      refreshToken, // Return same refresh token
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// LOGOUT - Invalidate refresh token
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    // Delete refresh token from database
    await execute(
      'DELETE FROM sessions WHERE refresh_token = ? AND user_id = ?',
      [refreshToken, req.user.userId]
    );

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET PROFILE - Get current user profile (requires authentication)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await queryOne(
      'SELECT id, username, email, auth_type, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
