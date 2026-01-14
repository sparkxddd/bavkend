const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { z } = require('zod');
const validate = require('../middleware/validate');

// Schema for creating a booking
const createBookingSchema = z.object({
    body: z.object({
        service_type: z.string().min(1),
        provider_name: z.string().optional(), // We'll look up ID or store name
        provider_id: z.string().optional(),
        scheduled_at: z.string().optional(), // ISO String
        address_text: z.string().min(1),
        description: z.string().optional(),
        price: z.number().optional(),
        type: z.enum(['instant', 'scheduled']).default('instant')
    })
});

// POST /api/bookings
router.post('/', validate(createBookingSchema), async (req, res) => {
    const { service_type, provider_name, address_text, description, price, type, scheduled_at } = req.body;

    try {
        // 1. Ensure a "Guest/Test" user exists (Since we stripped login)
        // In a real app, this would come from req.user.id via auth middleware
        let customer_id;

        // Check for existing test user
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', 'guest@quickfix.app')
            .single();

        if (existingUser) {
            customer_id = existingUser.id;
        } else {
            // Create test user
            const { data: newUser, error: userError } = await supabase
                .from('users')
                .insert({
                    email: 'guest@quickfix.app',
                    full_name: 'Guest User',
                    role: 'customer'
                })
                .select()
                .single();

            if (userError) throw userError;
            customer_id = newUser.id;
        }

        // 2. Insert Booking
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .insert({
                customer_id,
                service_type,
                // status defaults to 'pending'
                address_text,
                notes: description,
                estimated_price: price,
                scheduled_at: type === 'scheduled' ? scheduled_at : new Date().toISOString() // Now for instant
            })
            .select()
            .single();

        if (bookingError) throw bookingError;

        res.status(201).json({
            message: 'Booking created successfully',
            booking
        });

    } catch (error) {
        console.error('Booking Error:', error);
        res.status(500).json({ error: 'Failed to create booking', details: error.message });
    }
});

module.exports = router;
