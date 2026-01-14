const { RateLimiterRedis, RateLimiterMemory } = require('rate-limiter-flexible');
// Remove circular dependency on server.js
// We will initialize limiters lazily or pass the client in
// For simplicity in this structure, we'll create a factory or just a standalone config that server.js calls.

// Better approach: Export a function that initizlies the limiters given a client
let limiters = null;

const initRateLimiters = (redisClient) => {
    if (limiters) return limiters;

    // Fallback to Memory implementation if no Redis client (common on Windows dev)
    const isRedis = !!redisClient && redisClient.status === 'ready';

    // Config
    const RATE_LIMITS = {
        common: { points: 20, duration: 60, blockDuration: 60 * 5 },
        auth: { points: 5, duration: 60 * 15, blockDuration: 60 * 60 },
        sensitive: { points: 3, duration: 60, blockDuration: 60 * 30 }
    };

    const createLimiter = (options) => {
        if (isRedis) {
            return new RateLimiterRedis({
                storeClient: redisClient,
                ...options
            });
        } else {
            // Memory fallback
            console.log(`⚠️  Redis not available. Using Memory Rate Limiter for ${options.keyPrefix}`);
            return new RateLimiterMemory({
                ...options
            });
        }
    };

    limiters = {
        common: createLimiter({ keyPrefix: 'rl_common', ...RATE_LIMITS.common }),
        auth: createLimiter({ keyPrefix: 'rl_auth', ...RATE_LIMITS.auth }),
        sensitive: createLimiter({ keyPrefix: 'rl_sensitive', ...RATE_LIMITS.sensitive }),
    };

    return limiters;
};

/**
 * Rate Limiter Middleware
 * @param {'common' | 'auth' | 'sensitive'} type
 */
// We modify the export to be the initialization function AND the middleware
// But the middleware needs access to the initialized limiters.

module.exports = {
    init: initRateLimiters,
    middleware: (type = 'common') => (req, res, next) => {
        // Safety check if someone forgot to init
        if (!limiters) {
            // Attempt to init with null (Memory mode) if not set effectively
            console.warn("Rate limiters not initialized, falling back to memory request-scoped (not effective globally but prevents crash)");
            initRateLimiters(null);
        }

        const limiter = limiters[type] || limiters.common;
        const key = req.user ? req.user.id : `${req.ip}_${req.headers['user-agent'] || 'unknown'}`;

        limiter.consume(key)
            .then(() => {
                next();
            })
            .catch((rejRes) => {
                res.status(429).json({
                    error: 'Too Many Requests',
                    message: 'Rate limit exceeded. Please try again later.',
                    retryAfter: Math.round(rejRes.msBeforeNext / 1000) || 60,
                });
            });
    }
};
