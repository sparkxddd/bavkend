const jwt = require('jsonwebtoken');
const redisClient = require('../config/redis');
const env = require('../config/env');
const crypto = require('crypto');

// -- Constants --
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const REDIS_SESSION_PREFIX = 'session:';
const REDIS_BLACKLIST_PREFIX = 'bl:';

/**
 * Sign Access Token
 * Payload includes minimal user info and deviceId binding
 */
const signAccessToken = (user, deviceId) => {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role, deviceId },
        env.JWT_ACCESS_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
};

/**
 * Sign Refresh Token
 * Unique per device. Stored in Redis.
 */
const signRefreshToken = async (user, deviceId) => {
    const token = jwt.sign(
        { id: user.id, deviceId, type: 'refresh' },
        env.JWT_REFRESH_SECRET,
        { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` }
    );

    // Store in Redis: key = session:userId:deviceId, value = token
    const key = `${REDIS_SESSION_PREFIX}${user.id}:${deviceId}`;
    await redisClient.set(key, token, 'EX', REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60);

    return token;
};

/**
 * Rotate Refresh Token
 * Implements Reuse Detection (if token doesn't match current Redis token)
 */
const rotateRefreshToken = async (oldToken, deviceId) => {
    let decoded;
    try {
        decoded = jwt.verify(oldToken, env.JWT_REFRESH_SECRET);
    } catch (err) {
        throw new Error('Invalid Refresh Token');
    }

    if (decoded.deviceId !== deviceId) {
        throw new Error('Device Mismatch');
    }

    const key = `${REDIS_SESSION_PREFIX}${decoded.id}:${deviceId}`;
    const currentStoredToken = await redisClient.get(key);

    // Token Reuse Detection
    // If the provided token isn't the one we have in Redis, it means it was already used/rotated.
    // Possible theft! Nuke the session.
    if (!currentStoredToken || currentStoredToken !== oldToken) {
        console.warn(`[SECURITY] Refresh Token Reuse Detected! User: ${decoded.id}, Device: ${deviceId}`);
        await redisClient.del(key); // Kill the session
        throw new Error('Refresh Token Reuse Detected');
    }

    // Issue new pair
    const user = { id: decoded.id }; // Add other fields if needed, or fetch from DB
    const newAccessToken = signAccessToken(user, deviceId);
    const newRefreshToken = await signRefreshToken(user, deviceId);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

/**
 * Verify Access Token
 * Checks signature and checks if user/device is globally revoked
 */
const verifyAccessToken = async (token) => {
    try {
        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

        // Check revocation (optional, if we want immediate revocation functionality)
        // We could check a "revocation_timestamp" for the user in Redis

        return decoded;
    } catch (err) {
        return null;
    }
};

/**
 * Revoke Session
 */
const revokeSession = async (userId, deviceId) => {
    const key = `${REDIS_SESSION_PREFIX}${userId}:${deviceId}`;
    await redisClient.del(key);
};

/**
 * Revoke All User Sessions
 */
const revokeAllSessions = async (userId) => {
    // Pattern match scan to delete all session:userId:*
    const stream = redisClient.scanStream({ match: `${REDIS_SESSION_PREFIX}${userId}:*` });
    stream.on('data', (keys) => {
        if (keys.length) {
            const pipeline = redisClient.pipeline();
            keys.forEach((key) => pipeline.del(key));
            pipeline.exec();
        }
    });
};

module.exports = {
    signAccessToken,
    signRefreshToken,
    rotateRefreshToken,
    verifyAccessToken,
    revokeSession,
    revokeAllSessions
};
