/**
 * Authentication Middleware
 * Network Engineers Toolkit Backend
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../database/connection');
const winston = require('winston');

const authLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'auth' },
  transports: [
    new winston.transports.File({ filename: 'logs/auth.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate JWT token for authenticated user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email
  };
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'network-engineers-toolkit',
    audience: 'toolkit-admins'
  });
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'network-engineers-toolkit',
      audience: 'toolkit-admins'
    });
  } catch (error) {
    authLogger.warn('Token verification failed:', error.message);
    throw new Error('Invalid token');
  }
}

/**
 * Hash password using bcrypt
 * @param {string} password - Plain text password
 * @returns {string} Hashed password
 */
async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {boolean} Password match result
 */
async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Authenticate user credentials
 * @param {string} username - Username or email
 * @param {string} password - Plain text password
 * @returns {Object} User object if authenticated
 */
async function authenticateUser(username, password) {
  try {
    const query = `
      SELECT id, username, email, password_hash, last_login, is_active
      FROM admin_users 
      WHERE (username = $1 OR email = $1) AND is_active = true
    `;
    
    const result = await db.query(query, [username]);
    
    if (result.rows.length === 0) {
      authLogger.warn('Authentication failed: user not found', { username });
      throw new Error('Invalid credentials');
    }
    
    const user = result.rows[0];
    const passwordValid = await comparePassword(password, user.password_hash);
    
    if (!passwordValid) {
      authLogger.warn('Authentication failed: invalid password', { 
        username, 
        userId: user.id 
      });
      throw new Error('Invalid credentials');
    }
    
    // Update last login
    await db.query(
      'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    
    authLogger.info('User authenticated successfully', {
      userId: user.id,
      username: user.username
    });
    
    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
    
  } catch (error) {
    authLogger.error('Authentication error:', error.message);
    throw error;
  }
}

/**
 * Express middleware to require authentication
 */
function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyToken(token);
    
    // Add user info to request object
    req.user = decoded;
    
    authLogger.debug('Authentication successful', {
      userId: decoded.id,
      username: decoded.username
    });
    
    next();
    
  } catch (error) {
    authLogger.warn('Authentication middleware error:', error.message);
    
    return res.status(401).json({
      error: 'Access denied',
      message: 'Invalid token'
    });
  }
}

/**
 * Express middleware to require admin authentication
 */
async function requireAdmin(req, res, next) {
  try {
    // First check basic authentication
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    // Verify user still exists and is active
    const userQuery = await db.query(
      'SELECT id, username, email, is_active FROM admin_users WHERE id = $1 AND is_active = true',
      [decoded.id]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'User account not found or inactive'
      });
    }
    
    req.user = userQuery.rows[0];
    
    authLogger.debug('Admin authentication successful', {
      userId: decoded.id,
      username: decoded.username
    });
    
    next();
    
  } catch (error) {
    authLogger.warn('Admin authentication error:', error.message);
    
    return res.status(401).json({
      error: 'Access denied',
      message: 'Invalid or expired token'
    });
  }
}

/**
 * Express middleware for optional authentication
 * Adds user info to request if token is valid, but doesn't require it
 */
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      req.user = decoded;
    }
    
    next();
    
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
}

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  authenticateUser,
  requireAuth,
  requireAdmin,
  optionalAuth
};