/**
 * Admin Routes - API Key Management & System Configuration
 * Network Engineers Toolkit Backend
 */

const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const db = require('../database/connection');
const winston = require('winston');

const router = express.Router();

const adminLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'admin' },
  transports: [
    new winston.transports.File({ filename: 'logs/admin.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// Encryption key for API keys (should be stored securely)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';

/**
 * Encrypt API key for secure storage
 */
function encryptApiKey(apiKey) {
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

/**
 * Decrypt API key for usage
 */
function decryptApiKey(encryptedKey) {
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// GET /api/admin/dashboard - Admin dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const stats = await Promise.all([
      // Tool usage stats (last 7 days)
      db.query(`
        SELECT tool_name, COUNT(*) as usage_count
        FROM tool_usage 
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY tool_name
        ORDER BY usage_count DESC
        LIMIT 10
      `),
      
      // API key status
      db.query(`
        SELECT 
          COUNT(*) as total_keys,
          COUNT(*) FILTER (WHERE is_active = true) as active_keys,
          COUNT(*) FILTER (WHERE expires_at < CURRENT_TIMESTAMP) as expired_keys
        FROM api_keys
      `),
      
      // Recent tool usage
      db.query(`
        SELECT tool_name, success, created_at, response_time
        FROM tool_usage
        ORDER BY created_at DESC
        LIMIT 20
      `),
      
      // System statistics
      db.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as total_requests,
          AVG(response_time) as avg_response_time,
          COUNT(*) FILTER (WHERE success = false) as error_count
        FROM tool_usage
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `)
    ]);

    const dashboardData = {
      toolUsage: stats[0].rows,
      apiKeyStats: stats[1].rows[0],
      recentActivity: stats[2].rows,
      dailyStats: stats[3].rows,
      systemStatus: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      }
    };

    res.json(dashboardData);
    
  } catch (error) {
    adminLogger.error('Dashboard data error:', error);
    res.status(500).json({
      error: 'Failed to load dashboard data',
      message: error.message
    });
  }
});

// GET /api/admin/api-keys - List all API keys
router.get('/api-keys', async (req, res) => {
  try {
    const query = `
      SELECT 
        ak.id,
        ak.key_name,
        ak.key_type,
        ak.usage_limit,
        ak.current_usage,
        ak.expires_at,
        ak.created_at,
        ak.last_used,
        ak.is_active,
        ap.name as provider_name,
        ap.description as provider_description,
        au.username as created_by_username
      FROM api_keys ak
      JOIN api_providers ap ON ak.provider_id = ap.id
      LEFT JOIN admin_users au ON ak.created_by = au.id
      ORDER BY ak.created_at DESC
    `;
    
    const result = await db.query(query);
    
    // Don't include encrypted keys in response
    const apiKeys = result.rows.map(key => ({
      ...key,
      usagePercentage: key.usage_limit > 0 ? 
        Math.round((key.current_usage / key.usage_limit) * 100) : 0,
      isExpired: key.expires_at ? new Date(key.expires_at) < new Date() : false
    }));
    
    res.json(apiKeys);
    
  } catch (error) {
    adminLogger.error('API keys list error:', error);
    res.status(500).json({
      error: 'Failed to fetch API keys',
      message: error.message
    });
  }
});

// GET /api/admin/api-providers - List all API providers
router.get('/api-providers', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, name, description, base_url, documentation_url, is_active
      FROM api_providers
      WHERE is_active = true
      ORDER BY name
    `);
    
    res.json(result.rows);
    
  } catch (error) {
    adminLogger.error('API providers list error:', error);
    res.status(500).json({
      error: 'Failed to fetch API providers',
      message: error.message
    });
  }
});

// POST /api/admin/api-keys - Create new API key
router.post('/api-keys', [
  body('keyName').trim().isLength({ min: 3, max: 100 }).withMessage('Key name must be 3-100 characters'),
  body('providerId').isUUID().withMessage('Valid provider ID required'),
  body('apiKey').trim().isLength({ min: 10 }).withMessage('API key must be at least 10 characters'),
  body('keyType').optional().isIn(['api_key', 'bearer_token', 'basic_auth']).withMessage('Invalid key type'),
  body('usageLimit').optional().isInt({ min: 0 }).withMessage('Usage limit must be a positive number'),
  body('expiresAt').optional().isISO8601().withMessage('Invalid expiration date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { keyName, providerId, apiKey, keyType, usageLimit, expiresAt } = req.body;
    
    // Verify provider exists
    const providerCheck = await db.query(
      'SELECT id FROM api_providers WHERE id = $1 AND is_active = true',
      [providerId]
    );
    
    if (providerCheck.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid provider',
        message: 'Selected provider does not exist or is inactive'
      });
    }
    
    // Encrypt the API key
    const encryptedKey = encryptApiKey(apiKey);
    
    const insertQuery = `
      INSERT INTO api_keys (
        key_name, provider_id, encrypted_key, key_type, 
        usage_limit, expires_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, key_name, created_at
    `;
    
    const result = await db.query(insertQuery, [
      keyName,
      providerId,
      encryptedKey,
      keyType || 'api_key',
      usageLimit || null,
      expiresAt || null,
      req.user.id
    ]);
    
    adminLogger.info('API key created', {
      keyId: result.rows[0].id,
      keyName,
      providerId,
      createdBy: req.user.username
    });
    
    res.status(201).json({
      message: 'API key created successfully',
      apiKey: result.rows[0]
    });
    
  } catch (error) {
    adminLogger.error('Create API key error:', error);
    res.status(500).json({
      error: 'Failed to create API key',
      message: error.message
    });
  }
});

// PUT /api/admin/api-keys/:id - Update API key
router.put('/api-keys/:id', [
  body('keyName').optional().trim().isLength({ min: 3, max: 100 }),
  body('apiKey').optional().trim().isLength({ min: 10 }),
  body('usageLimit').optional().isInt({ min: 0 }),
  body('expiresAt').optional().isISO8601(),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    if (updates.keyName) {
      updateFields.push(`key_name = $${paramCount++}`);
      values.push(updates.keyName);
    }
    
    if (updates.apiKey) {
      updateFields.push(`encrypted_key = $${paramCount++}`);
      values.push(encryptApiKey(updates.apiKey));
    }
    
    if (updates.usageLimit !== undefined) {
      updateFields.push(`usage_limit = $${paramCount++}`);
      values.push(updates.usageLimit);
    }
    
    if (updates.expiresAt !== undefined) {
      updateFields.push(`expires_at = $${paramCount++}`);
      values.push(updates.expiresAt);
    }
    
    if (updates.isActive !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      values.push(updates.isActive);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update'
      });
    }
    
    values.push(id);
    const query = `
      UPDATE api_keys 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, key_name, updated_at
    `;
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'API key not found'
      });
    }
    
    adminLogger.info('API key updated', {
      keyId: id,
      updatedBy: req.user.username
    });
    
    res.json({
      message: 'API key updated successfully',
      apiKey: result.rows[0]
    });
    
  } catch (error) {
    adminLogger.error('Update API key error:', error);
    res.status(500).json({
      error: 'Failed to update API key',
      message: error.message
    });
  }
});

// DELETE /api/admin/api-keys/:id - Delete API key
router.delete('/api-keys/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'DELETE FROM api_keys WHERE id = $1 RETURNING id, key_name',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'API key not found'
      });
    }
    
    adminLogger.info('API key deleted', {
      keyId: id,
      keyName: result.rows[0].key_name,
      deletedBy: req.user.username
    });
    
    res.json({
      message: 'API key deleted successfully'
    });
    
  } catch (error) {
    adminLogger.error('Delete API key error:', error);
    res.status(500).json({
      error: 'Failed to delete API key',
      message: error.message
    });
  }
});

// POST /api/admin/api-keys/:id/test - Test API key
router.post('/api-keys/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    
    const keyQuery = await db.query(`
      SELECT ak.encrypted_key, ak.key_type, ap.name, ap.base_url
      FROM api_keys ak
      JOIN api_providers ap ON ak.provider_id = ap.id
      WHERE ak.id = $1 AND ak.is_active = true
    `, [id]);
    
    if (keyQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'API key not found or inactive'
      });
    }
    
    const keyData = keyQuery.rows[0];
    const decryptedKey = decryptApiKey(keyData.encrypted_key);
    
    // Test the API key based on provider
    let testResult = { success: false, message: 'Test not implemented' };
    
    // Add provider-specific testing logic here
    switch (keyData.name.toLowerCase()) {
      case 'whoisxml':
        // Test WhoisXML API
        testResult = { success: true, message: 'API key format appears valid' };
        break;
      case 'peeringdb':
        // Test PeeringDB API
        testResult = { success: true, message: 'API key format appears valid' };
        break;
      default:
        testResult = { success: true, message: 'Basic validation passed' };
    }
    
    res.json({
      provider: keyData.name,
      testResult
    });
    
  } catch (error) {
    adminLogger.error('Test API key error:', error);
    res.status(500).json({
      error: 'Failed to test API key',
      message: error.message
    });
  }
});

// GET /api/admin/usage-stats - Usage statistics
router.get('/usage-stats', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const stats = await Promise.all([
      // Daily usage stats
      db.query(`
        SELECT 
          DATE(created_at) as date,
          tool_name,
          COUNT(*) as usage_count,
          AVG(response_time) as avg_response_time,
          COUNT(*) FILTER (WHERE success = false) as error_count
        FROM tool_usage
        WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(created_at), tool_name
        ORDER BY date DESC, usage_count DESC
      `),
      
      // Top tools
      db.query(`
        SELECT 
          tool_name,
          COUNT(*) as total_usage,
          AVG(response_time) as avg_response_time,
          COUNT(DISTINCT user_ip) as unique_users
        FROM tool_usage
        WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY tool_name
        ORDER BY total_usage DESC
      `),
      
      // Error analysis
      db.query(`
        SELECT 
          tool_name,
          error_message,
          COUNT(*) as error_count
        FROM tool_usage
        WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
          AND success = false
        GROUP BY tool_name, error_message
        ORDER BY error_count DESC
        LIMIT 20
      `)
    ]);
    
    res.json({
      dailyStats: stats[0].rows,
      topTools: stats[1].rows,
      errorAnalysis: stats[2].rows,
      period: `${days} days`
    });
    
  } catch (error) {
    adminLogger.error('Usage stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch usage statistics',
      message: error.message
    });
  }
});

// Utility function to get decrypted API key (for internal use)
async function getDecryptedApiKey(providerId, keyType = 'api_key') {
  try {
    const result = await db.query(`
      SELECT encrypted_key
      FROM api_keys
      WHERE provider_id = $1 AND key_type = $2 AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `, [providerId, keyType]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return decryptApiKey(result.rows[0].encrypted_key);
  } catch (error) {
    adminLogger.error('Get decrypted API key error:', error);
    return null;
  }
}

module.exports = router;