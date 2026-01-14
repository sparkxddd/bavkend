const { verifyAccessToken } = require('../utils/token');

const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];

    const decoded = await verifyAccessToken(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
    }

    // Bind user to request
    req.user = decoded;

    // Optional: Verify Device ID binding if passed in headers (Deep Defense)
    // Ensures token stolen from one device can't be used on another if device fingerprint changes
    const requestDeviceId = req.headers['x-device-id']; // Client should send this
    if (requestDeviceId && decoded.deviceId !== requestDeviceId) {
        // Logging security event
        console.warn(`[SECURITY] Token Device Mismatch. Token: ${decoded.deviceId}, Req: ${requestDeviceId}`);
        // We might choose to block or just log. Strict mode: block.
        return res.status(403).json({ error: 'Forbidden', message: 'Device Token Mismatch' });
    }

    next();
};

module.exports = authenticate;
