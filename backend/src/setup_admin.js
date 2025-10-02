#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

async function createAdmin() {
    try {
        // Check if admin user already exists
        const existingAdmin = await pool.query(
            'SELECT id FROM users WHERE role = $1 LIMIT 1',
            ['admin']
        );

        if (existingAdmin.rows.length > 0) {
            console.log('❌ Admin user already exists. Skipping creation.');
            process.exit(0);
        }

        // Generate secure password
        const password = crypto.randomBytes(16).toString('hex');
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create admin user
        const result = await pool.query(
            'INSERT INTO users (username, email, password_hash, role, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email',
            ['admin', 'admin@nettools.local', passwordHash, 'admin', true]
        );

        console.log('✅ Admin user created successfully!');
        console.log('');
        console.log('📋 Admin Credentials:');
        console.log(`   Username: ${result.rows[0].username}`);
        console.log(`   Email: ${result.rows[0].email}`);
        console.log(`   Password: ${password}`);
        console.log('');
        console.log('⚠️  IMPORTANT: Save these credentials securely and change the password after first login!');
        console.log('');

    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the script
if (require.main === module) {
    createAdmin();
}

module.exports = { createAdmin };
