const Redis = require('ioredis');
const env = require('./env');

// Initialize Redis Client with graceful fallback
const redisClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
        if (times > 3) {
            console.warn('⚠️  Redis unavailable. Retrying stopped. Using in-memory fallbacks.');
            return null; // Stop retrying
        }
        return Math.min(times * 100, 2000); // Retry with backoff
    }
});

redisClient.on('error', (err) => {
    // Only log if it's not the generic "connection refused" spam during retries
    if (err.code !== 'ECONNREFUSED') {
        console.error('Redis Client Error', err.message);
    }
});

redisClient.on('connect', () => {
    console.log('✅ Redis connected');
});

module.exports = redisClient;
