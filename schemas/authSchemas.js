const { z } = require('zod');

const loginSchema = z.object({
    body: z.object({
        idToken: z.string().min(10, "Google ID Token is required"), // Google ID Token
        deviceId: z.string().min(5, "Device ID is required"),
        deviceType: z.enum(['android', 'ios', 'web']).optional(),
    }),
});

const refreshTokenSchema = z.object({
    body: z.object({
        refreshToken: z.string().min(10, "Refresh Token is required"),
        deviceId: z.string().min(5, "Device ID is required"),
    })
});

module.exports = {
    loginSchema,
    refreshTokenSchema
};
