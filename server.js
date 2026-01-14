const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const redisClient = require('./config/redis');
const app = express();

// Security Middleware
app.use(helmet()); // Set secure HTTP headers

// Relaxed CORS for mobile/dev
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://quick-bh1a.onrender.com',
    'http://localhost:3000',
    'http://localhost',
    'capacitor://localhost',
    'http://10.0.2.2:3001',
    'http://10.0.2.2'
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost') || origin.startsWith('capacitor://localhost') || origin.startsWith('https://quick-bh1a.onrender.com')) {
            callback(null, true);
        } else {
            console.warn(`[CORS] Rejected origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

// Request Logging Middleware for debugging connectivity
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'No Origin'}`);
    next();
});
app.use(express.json({ limit: '10kb' })); // Body limit protection
app.use(cookieParser());
const secretGuard = require('./middleware/secretGuard');
app.use(secretGuard);

// Trust Proxy (Required if behind Nginx/Load Balancer)
app.enable('trust proxy');

// Rate Limiting (Global for unauthenticated API, specific for auth)
const rateLimiter = require('./middleware/rateLimiter');

if (redisClient) {
  rateLimiter.init(redisClient);
  console.log("✅ Rate limiter initialized with Redis");
} else {
  console.warn("⚠️ Redis not available. Rate limiter running in memory mode.");
}


// Routes
const authRoutes = require('./routes/auth.routes');
const searchRoutes = require('./routes/search.routes');

app.use('/auth', authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/bookings', require('./routes/booking.routes'));
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start Server
const server = app.listen(env.PORT, () => {
    console.log(`🚀 Backend secure server running on port ${env.PORT}`);
    console.log(`Running in ${env.NODE_ENV} mode`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        redisClient.quit();
    });
});

module.exports = { app, redisClient };
