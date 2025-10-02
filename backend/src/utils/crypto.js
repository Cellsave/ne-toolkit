const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
}

/**
 * Encrypt a text string
 * @param {string} text - The text to encrypt
 * @returns {string} - The encrypted text in format: iv:encryptedData
 */
function encrypt(text) {
    if (!text) return null;
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipher(ALGORITHM, Buffer.from(ENCRYPTION_KEY));
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypt an encrypted string
 * @param {string} text - The encrypted text in format: iv:encryptedData
 * @returns {string} - The decrypted text
 */
function decrypt(text) {
    if (!text) return null;
    
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipher(ALGORITHM, Buffer.from(ENCRYPTION_KEY));
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

/**
 * Generate a secure random string
 * @param {number} length - The length of the random string
 * @returns {string} - A secure random string
 */
function generateSecureRandom(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a password using bcrypt
 * @param {string} password - The password to hash
 * @returns {Promise<string>} - The hashed password
 */
async function hashPassword(password) {
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
}

/**
 * Verify a password against a hash
 * @param {string} password - The password to verify
 * @param {string} hash - The hash to verify against
 * @returns {Promise<boolean>} - True if password matches
 */
async function verifyPassword(password, hash) {
    const bcrypt = require('bcryptjs');
    return bcrypt.compare(password, hash);
}

module.exports = {
    encrypt,
    decrypt,
    generateSecureRandom,
    hashPassword,
    verifyPassword
};
