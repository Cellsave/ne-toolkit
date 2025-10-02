/**
 * Authentication Routes
 * Network Engineers Toolkit Backend
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../database/connection');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

/**
 * POST /api/auth/register
 * Register a new user account (creates both account and user)
 */
router.post('/register',
  [
    body('accountName').trim().isLength({ min: 3, max: 100 })
      .withMessage('Account name must be between 3 and 100 characters'),
    body('email').isEmail().normalizeEmail()
      .withMessage('Valid email is required'),
    body('password').isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('firstName').trim().notEmpty()
      .withMessage('First name is required'),
    body('lastName').trim().notEmpty()
      .withMessage('Last name is required')
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { accountName, email, password, firstName, lastName } = req.body;

      // Check if email already exists
      const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Start transaction
      const client = await db.getClient();
      try {
        await client.query('BEGIN');

        // Create account
        const accountResult = await client.query(
          `INSERT INTO accounts (name, status, max_users)
           VALUES ($1, 'active', 5)
           RETURNING id`,
          [accountName]
        );
        const accountId = accountResult.rows[0].id;

        // Create user as account admin
        const userResult = await client.query(
          `INSERT INTO users (account_id, email, password_hash, first_name, last_name, role, status)
           VALUES ($1, $2, $3, $4, $5, 'admin', 'active')
           RETURNING id, email, first_name, last_name, role`,
          [accountId, email, hashedPassword, firstName, lastName]
        );

        await client.query('COMMIT');

        const user = userResult.rows[0];

        // Generate JWT
        const token = jwt.sign(
          { userId: user.id, accountId, role: user.role },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRY }
        );

        res.status(201).json({
          message: 'Account created successfully',
          token,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            accountId
          }
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

/**
 * POST /api/auth/login
 * Login user and return JWT token
 */
router.post('/login',
  [
    body('email').isEmail().normalizeEmail()
      .withMessage('Valid email is required'),
    body('password').notEmpty()
      .withMessage('Password is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Get user with account info
      const result = await db.query(
        `SELECT u.id, u.account_id, u.email, u.password_hash, u.first_name, 
                u.last_name, u.role, u.status, a.status as account_status
         FROM users u
         JOIN accounts a ON u.account_id = a.id
         WHERE u.email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];

      // Check account and user status
      if (user.account_status !== 'active') {
        return res.status(403).json({ error: 'Account is not active' });
      }

      if (user.status !== 'active') {
        return res.status(403).json({ error: 'User account is not active' });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      await db.query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
      );

      // Generate JWT
      const token = jwt.sign(
        { userId: user.id, accountId: user.account_id, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          accountId: user.account_id
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.status, 
              u.created_at, u.last_login, a.name as account_name
       FROM users u
       JOIN accounts a ON u.account_id = a.id
       WHERE u.id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      status: user.status,
      accountName: user.account_name,
      createdAt: user.created_at,
      lastLogin: user.last_login
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

/**
 * PUT /api/auth/profile
 * Update current user profile
 */
router.put('/profile',
  authenticateToken,
  [
    body('firstName').optional().trim().notEmpty()
      .withMessage('First name cannot be empty'),
    body('lastName').optional().trim().notEmpty()
      .withMessage('Last name cannot be empty'),
    body('email').optional().isEmail().normalizeEmail()
      .withMessage('Valid email is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { firstName, lastName, email } = req.body;
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (firstName) {
        updates.push(`first_name = $${paramCount++}`);
        values.push(firstName);
      }
      if (lastName) {
        updates.push(`last_name = $${paramCount++}`);
        values.push(lastName);
      }
      if (email) {
        // Check if email is already in use
        const existing = await db.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [email, req.user.userId]
        );
        if (existing.rows.length > 0) {
          return res.status(409).json({ error: 'Email already in use' });
        }
        updates.push(`email = $${paramCount++}`);
        values.push(email);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      updates.push(`updated_at = NOW()`);
      values.push(req.user.userId);

      const result = await db.query(
        `UPDATE users SET ${updates.join(', ')} 
         WHERE id = $${paramCount}
         RETURNING id, email, first_name, last_name, role`,
        values
      );

      const user = result.rows[0];
      res.json({
        message: 'Profile updated successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

/**
 * PUT /api/auth/password
 * Change current user password
 */
router.put('/password',
  authenticateToken,
  [
    body('currentPassword').notEmpty()
      .withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;

      // Get current password hash
      const result = await db.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [req.user.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const validPassword = await bcrypt.compare(
        currentPassword,
        result.rows[0].password_hash
      );

      if (!validPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await db.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, req.user.userId]
      );

      res.json({ message: 'Password changed successfully' });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout user (client should discard token)
 */
router.post('/logout', authenticateToken, (req, res) => {
  // In a stateless JWT system, logout is handled client-side
  // Could implement token blacklisting here if needed
  res.json({ message: 'Logout successful' });
});

module.exports = router;
