const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const env = require('../config/env');
const { signAccessToken, signRefreshToken, rotateRefreshToken, revokeSession } = require('../utils/token');
const { loginSchema, refreshTokenSchema } = require('../schemas/authSchemas');
const validate = require('../middleware/validate');
const rateLimiter = require('../middleware/rateLimiter');
const authenticate = require('../middleware/auth');

const router = express.Router();
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

// POST /auth/login - Google Auth
router.post('/login',
    rateLimiter.middleware('auth'), // Strict rate limit
    validate(loginSchema),
    async (req, res) => {
        const { idToken, deviceId } = req.body;

        // 1. Verify Google Token
        let ticket;
        try {
            ticket = await googleClient.verifyIdToken({
                idToken,
                audience: env.GOOGLE_CLIENT_ID,
            });
        } catch (error) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Invalid Google Token' });
        }

        const payload = ticket.getPayload();
        const user = {
            id: payload.sub, // Google User ID
            email: payload.email,
            role: 'user', // Default role, fetch real role from DB if needed
            // ... check if user exists in DB, create if not ...
        };

        // 2. Generate Tokens
        const accessToken = signAccessToken(user, deviceId);
        const refreshToken = await signRefreshToken(user, deviceId);

        // 3. Return Tokens
        res.json({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email
            }
        });
    }
);

// POST /auth/refresh - Rotate Tokens
router.post('/refresh',
    rateLimiter.middleware('auth'),
    validate(refreshTokenSchema),
    async (req, res) => {
        const { refreshToken, deviceId } = req.body;

        try {
            const tokens = await rotateRefreshToken(refreshToken, deviceId);
            res.json(tokens);
        } catch (error) {
            // Generic error to avoid leakage, but logs show details
            console.error('Refresh Error:', error.message);
            res.status(401).json({ error: 'Unauthorized', message: 'Invalid Refresh Token' });
        }
    }
);

// POST /auth/logout
router.post('/logout',
    authenticate,
    async (req, res) => {
        // Revoke the session for *this* device
        // req.user is set by authenticate middleware
        await revokeSession(req.user.id, req.user.deviceId);
        res.json({ message: 'Logged out successfully' });
    }
);

module.exports = router;
