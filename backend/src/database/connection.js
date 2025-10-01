/**
 * PostgreSQL Database Connection
 * Network Engineers Toolkit Backend
 */

const { Pool } = require('pg');
const winston = require('winston');

// Configure logger for database operations
const dbLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'database' },
  transports: [
    new winston.transports.File({ filename: 'logs/database.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// Database configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'nettools',
  user: process.env.DB_USER || 'nettools_user',
  password: process.env.DB_PASSWORD || 'password',
  
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  min: 2,  // Minimum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return error after 10 seconds if connection could not be established
  maxUses: 7500, // Close (and replace) connection after it has been used this many times
  
  // SSL configuration (for production)
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
};

// Create connection pool
const pool = new Pool(config);

// Handle pool errors
pool.on('error', (err, client) => {
  dbLogger.error('Unexpected error on idle client:', err);
  process.exit(-1);
});

pool.on('connect', (client) => {
  dbLogger.info('New database connection established');
});

pool.on('acquire', (client) => {
  dbLogger.debug('Connection acquired from pool');
});

pool.on('remove', (client) => {
  dbLogger.info('Connection removed from pool');
});

/**
 * Execute a database query
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise} Query result
 */
async function query(text, params) {
  const start = Date.now();
  const client = await pool.connect();
  
  try {
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    
    dbLogger.debug('Executed query', {
      query: text,
      duration: duration,
      rows: result.rowCount
    });
    
    return result;
  } catch (error) {
    dbLogger.error('Database query error:', {
      query: text,
      params: params,
      error: error.message
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute a transaction
 * @param {Function} callback - Function to execute within transaction
 * @returns {Promise} Transaction result
 */
async function transaction(callback) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    
    dbLogger.info('Transaction completed successfully');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    dbLogger.error('Transaction rolled back:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get database connection statistics
 * @returns {Object} Connection pool stats
 */
function getStats() {
  return {
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingClients: pool.waitingCount,
    maxConnections: config.max
  };
}

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection status
 */
async function testConnection() {
  try {
    const result = await query('SELECT NOW() as current_time, version() as pg_version');
    dbLogger.info('Database connection test successful', {
      timestamp: result.rows[0].current_time,
      version: result.rows[0].pg_version
    });
    return true;
  } catch (error) {
    dbLogger.error('Database connection test failed:', error.message);
    return false;
  }
}

/**
 * Close all database connections
 * @returns {Promise} Promise that resolves when pool is closed
 */
async function end() {
  try {
    await pool.end();
    dbLogger.info('Database connection pool closed');
  } catch (error) {
    dbLogger.error('Error closing database pool:', error.message);
    throw error;
  }
}

// Initialize database connection on startup
(async () => {
  try {
    await testConnection();
    dbLogger.info('Database connection initialized successfully');
  } catch (error) {
    dbLogger.error('Failed to initialize database connection:', error.message);
    process.exit(1);
  }
})();

module.exports = {
  query,
  transaction,
  getStats,
  testConnection,
  end,
  pool
};