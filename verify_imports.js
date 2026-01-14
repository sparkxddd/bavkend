try {
    console.log('Verifying imports...');
    require('./config/env');
    console.log('✅ Config/Env loaded');
    require('./server');
    console.log('✅ Server loaded'); // Note matches might fail if env vars missing, but syntax is checked
    require('./middleware/rateLimiter');
    console.log('✅ RateLimiter loaded');
    require('./middleware/validate');
    console.log('✅ Validator loaded');
    require('./middleware/auth');
    console.log('✅ Auth Middleware loaded');
    require('./utils/token');
    console.log('✅ Token Utils loaded');
    require('./routes/auth.routes');
    console.log('✅ Auth Routes loaded');
    console.log('🎉 All Security Modules Verified!');
    process.exit(0);
} catch (err) {
    console.error('❌ Verification Failed:', err);
    process.exit(1);
}
