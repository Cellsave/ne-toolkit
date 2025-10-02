const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');
const auth = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

// Generate unique referral code
function generateReferralCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Send referral email
async function sendReferralEmail(refereeEmail, refereeName, referrerName, referralCode) {
    if (!process.env.SMTP_HOST) {
        console.log('SMTP not configured, skipping email send');
        return;
    }

    const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    const registrationLink = `${process.env.APP_URL}/register?ref=${referralCode}`;
    
    const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@nettools.local',
        to: refereeEmail,
        subject: `${referrerName} invited you to join Network Engineers Toolkit`,
        html: `
            <h2>You've been invited to join Network Engineers Toolkit!</h2>
            <p>Hi ${refereeName || 'there'},</p>
            <p>${referrerName} has invited you to join the Network Engineers Toolkit - a comprehensive suite of network analysis and diagnostic tools.</p>
            <p>Click the link below to register and start using our tools:</p>
            <a href="${registrationLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Join Now</a>
            <p>Or copy and paste this link: ${registrationLink}</p>
            <p>This invitation expires in 30 days.</p>
            <p>Best regards,<br>Network Engineers Toolkit Team</p>
        `
    };

    await transporter.sendMail(mailOptions);
}

// POST /api/referrals - Send referral invitation
router.post('/', auth, async (req, res) => {
    try {
        const { referee_email, referee_name, message } = req.body;
        const referrer_user_id = req.user.id;

        // Validate input
        if (!referee_email) {
            return res.status(400).json({ error: 'Referee email is required' });
        }

        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [referee_email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Check for existing pending referral
        const existingReferral = await pool.query(
            'SELECT id FROM referrals WHERE referee_email = $1 AND status = $2',
            [referee_email, 'pending']
        );

        if (existingReferral.rows.length > 0) {
            return res.status(400).json({ error: 'Pending referral already exists for this email' });
        }

        // Generate unique referral code
        let referralCode;
        let isUnique = false;
        while (!isUnique) {
            referralCode = generateReferralCode();
            const codeCheck = await pool.query(
                'SELECT id FROM referrals WHERE referral_code = $1',
                [referralCode]
            );
            isUnique = codeCheck.rows.length === 0;
        }

        // Get referrer name
        const referrerResult = await pool.query(
            'SELECT username FROM users WHERE id = $1',
            [referrer_user_id]
        );
        const referrerName = referrerResult.rows[0].username;

        // Create referral record
        const result = await pool.query(
            `INSERT INTO referrals (referrer_user_id, referee_email, referee_name, referral_code, message)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [referrer_user_id, referee_email, referee_name, referralCode, message]
        );

        // Send referral email
        try {
            await sendReferralEmail(referee_email, referee_name, referrerName, referralCode);
        } catch (emailError) {
            console.error('Failed to send referral email:', emailError);
            // Don't fail the request if email fails
        }

        res.status(201).json({
            message: 'Referral sent successfully',
            referral: result.rows[0]
        });

    } catch (error) {
        console.error('Error sending referral:', error);
        res.status(500).json({ error: 'Failed to send referral' });
    }
});

// GET /api/referrals - Get user's referrals
router.get('/', auth, async (req, res) => {
    try {
        const referrer_user_id = req.user.id;
        
        const result = await pool.query(
            `SELECT id, referee_email, referee_name, referral_code, status, message, 
                    created_at, registered_at, expires_at
             FROM referrals 
             WHERE referrer_user_id = $1 
             ORDER BY created_at DESC`,
            [referrer_user_id]
        );

        res.json({ referrals: result.rows });

    } catch (error) {
        console.error('Error fetching referrals:', error);
        res.status(500).json({ error: 'Failed to fetch referrals' });
    }
});

// GET /api/referrals/validate/:code - Validate referral code
router.get('/validate/:code', async (req, res) => {
    try {
        const { code } = req.params;
        
        const result = await pool.query(
            `SELECT r.*, u.username as referrer_name 
             FROM referrals r 
             JOIN users u ON r.referrer_user_id = u.id 
             WHERE r.referral_code = $1 AND r.status = $2 AND r.expires_at > CURRENT_TIMESTAMP`,
            [code, 'pending']
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Invalid or expired referral code' });
        }

        res.json({ 
            valid: true, 
            referral: result.rows[0] 
        });

    } catch (error) {
        console.error('Error validating referral:', error);
        res.status(500).json({ error: 'Failed to validate referral' });
    }
});

module.exports = router;
