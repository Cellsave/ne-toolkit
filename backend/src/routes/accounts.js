/**
 * Account Management Routes
 * Network Engineers Toolkit Backend
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../database/connection');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/accounts/info
 * Get current account information
 */
router.get('/info', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, status, max_users, created_at, updated_at
       FROM accounts
       WHERE id = $1`,
      [req.user.accountId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Get user count
    const userCountResult = await db.query(
      'SELECT COUNT(*) as user_count FROM users WHERE account_id = $1',
      [req.user.accountId]
    );

    const account = result.rows[0];
    res.json({
      id: account.id,
      name: account.name,
      status: account.status,
      maxUsers: account.max_users,
      currentUsers: parseInt(userCountResult.rows[0].user_count),
      createdAt: account.created_at,
      updatedAt: account.updated_at
    });

  } catch (error) {
    console.error('Get account info error:', error);
    res.status(500).json({ error: 'Failed to get account information' });
  }
});

/**
 * PUT /api/accounts/info
 * Update account information (admin only)
 */
router.put('/info',
  authenticateToken,
  requireRole('admin'),
  [
    body('name').optional().trim().isLength({ min: 3, max: 100 })
      .withMessage('Account name must be between 3 and 100 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      const result = await db.query(
        `UPDATE accounts 
         SET name = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, name, status, max_users`,
        [name, req.user.accountId]
      );

      const account = result.rows[0];
      res.json({
        message: 'Account updated successfully',
        account: {
          id: account.id,
          name: account.name,
          status: account.status,
          maxUsers: account.max_users
        }
      });

    } catch (error) {
      console.error('Update account error:', error);
      res.status(500).json({ error: 'Failed to update account' });
    }
  }
);

/**
 * GET /api/accounts/users
 * List all users in the account
 */
router.get('/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, email, first_name, last_name, role, status, 
              created_at, last_login
       FROM users
       WHERE account_id = $1
       ORDER BY created_at DESC`,
      [req.user.accountId]
    );

    const users = result.rows.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      status: user.status,
      createdAt: user.created_at,
      lastLogin: user.last_login
    }));

    res.json({ users });

  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

/**
 * POST /api/accounts/users
 * Add a new user to the account (admin only)
 */
router.post('/users',
  authenticateToken,
  requireRole('admin'),
  [
    body('email').isEmail().normalizeEmail()
      .withMessage('Valid email is required'),
    body('password').isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('firstName').trim().notEmpty()
      .withMessage('First name is required'),
    body('lastName').trim().notEmpty()
      .withMessage('Last name is required'),
    body('role').isIn(['admin', 'user'])
      .withMessage('Role must be admin or user')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, firstName, lastName, role } = req.body;

      // Check account user limit
      const accountResult = await db.query(
        'SELECT max_users FROM accounts WHERE id = $1',
        [req.user.accountId]
      );

      const userCountResult = await db.query(
        'SELECT COUNT(*) as count FROM users WHERE account_id = $1',
        [req.user.accountId]
      );

      const maxUsers = accountResult.rows[0].max_users;
      const currentUsers = parseInt(userCountResult.rows[0].count);

      if (currentUsers >= maxUsers) {
        return res.status(403).json({ 
          error: 'User limit reached for this account',
          maxUsers,
          currentUsers
        });
      }

      // Check if email already exists
      const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({ error: 'Email already in use' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const result = await db.query(
        `INSERT INTO users (account_id, email, password_hash, first_name, last_name, role, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')
         RETURNING id, email, first_name, last_name, role, status, created_at`,
        [req.user.accountId, email, hashedPassword, firstName, lastName, role]
      );

      const user = result.rows[0];
      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          status: user.status,
          createdAt: user.created_at
        }
      });

    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
);

/**
 * PUT /api/accounts/users/:userId
 * Update a user (admin only)
 */
router.put('/users/:userId',
  authenticateToken,
  requireRole('admin'),
  [
    body('firstName').optional().trim().notEmpty()
      .withMessage('First name cannot be empty'),
    body('lastName').optional().trim().notEmpty()
      .withMessage('Last name cannot be empty'),
    body('role').optional().isIn(['admin', 'user'])
      .withMessage('Role must be admin or user'),
    body('status').optional().isIn(['active', 'inactive'])
      .withMessage('Status must be active or inactive')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId } = req.params;
      const { firstName, lastName, role, status } = req.body;

      // Verify user belongs to the same account
      const userCheck = await db.query(
        'SELECT account_id FROM users WHERE id = $1',
        [userId]
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (userCheck.rows[0].account_id !== req.user.accountId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Build update query
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
      if (role) {
        updates.push(`role = $${paramCount++}`);
        values.push(role);
      }
      if (status) {
        updates.push(`status = $${paramCount++}`);
        values.push(status);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      updates.push(`updated_at = NOW()`);
      values.push(userId);

      const result = await db.query(
        `UPDATE users SET ${updates.join(', ')}
         WHERE id = $${paramCount}
         RETURNING id, email, first_name, last_name, role, status`,
        values
      );

      const user = result.rows[0];
      res.json({
        message: 'User updated successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          status: user.status
        }
      });

    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
);

/**
 * DELETE /api/accounts/users/:userId
 * Delete a user (admin only)
 */
router.delete('/users/:userId',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Verify user belongs to the same account
      const userCheck = await db.query(
        'SELECT account_id FROM users WHERE id = $1',
        [userId]
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (userCheck.rows[0].account_id !== req.user.accountId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Prevent deleting yourself
      if (userId === req.user.userId.toString()) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      // Delete user
      await db.query('DELETE FROM users WHERE id = $1', [userId]);

      res.json({ message: 'User deleted successfully' });

    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }
);

/**
 * PUT /api/accounts/users/:userId/password
 * Reset user password (admin only)
 */
router.put('/users/:userId/password',
  authenticateToken,
  requireRole('admin'),
  [
    body('newPassword').isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId } = req.params;
      const { newPassword } = req.body;

      // Verify user belongs to the same account
      const userCheck = await db.query(
        'SELECT account_id FROM users WHERE id = $1',
        [userId]
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (userCheck.rows[0].account_id !== req.user.accountId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await db.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, userId]
      );

      res.json({ message: 'Password reset successfully' });

    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }
);

module.exports = router;
