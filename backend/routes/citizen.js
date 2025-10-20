// backend/routes/citizen.js
const express = require('express');
const db = require('../config/db');
const { sendSMS } = require('../utils/twilioClient');

const router = express.Router();

// Phone number normalization utility
const normalizePhone = (phone) => {
  if (!phone) throw new Error('Phone number is required');
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  if (cleaned.length === 10) {
    return '+1' + cleaned;
  }
  
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return '+' + cleaned;
  }
  
  throw new Error('Invalid phone number format. Use +1234567890 or 1234567890 format.');
};

// Submit citizen data via QR code
router.post('/submit/:qrId', async (req, res) => {
  const { qrId } = req.params;
  const { name, phone, email } = req.body;

  // Basic validation
  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  if (name.length > 100) {
    return res.status(400).json({ error: 'Name must be less than 100 characters' });
  }

  if (email && email.length > 255) {
    return res.status(400).json({ error: 'Email must be less than 255 characters' });
  }

  try {
    // Normalize phone number
    const normalizedPhone = normalizePhone(phone);

    // 1. Validate QR code
    const qrResult = await db.query(
      `SELECT qc.food_window_id, fw.available_bags, fw.start_time, fw.end_time
       FROM qr_codes qc
       JOIN food_windows fw ON qc.food_window_id = fw.id
       WHERE qc.id = $1 
         AND qc.is_active = true 
         AND qc.expires_at > NOW()
         AND fw.is_active = true`,
      [qrId]
    );

    if (qrResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid, expired, or inactive QR code' });
    }

    const { food_window_id, available_bags, start_time, end_time } = qrResult.rows[0];

    // 2. Check if current time is within food window (with timezone consideration)
    const now = new Date();
    const windowStart = new Date(start_time);
    const windowEnd = new Date(end_time);
    
    if (now < windowStart || now > windowEnd) {
      return res.status(400).json({ 
        error: 'Submission period is not active',
        currentTime: now.toISOString(),
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString()
      });
    }

    // 3. Check if quota is full
    const usedBagsResult = await db.query(
      'SELECT COUNT(*) FROM citizens WHERE food_window_id = $1',
      [food_window_id]
    );
    const usedBags = parseInt(usedBagsResult.rows[0].count);
    if (usedBags >= available_bags) {
      return res.status(400).json({ 
        error: 'Food quota has been reached. No more requests accepted.',
        available: available_bags,
        used: usedBags
      });
    }

    // 4. Enforce 14-day rule
    const recentResult = await db.query(
      `SELECT id, submitted_at FROM citizens 
       WHERE phone = $1 
         AND submitted_at > NOW() - INTERVAL '14 days'`,
      [normalizedPhone]
    );
    if (recentResult.rows.length > 0) {
      const lastSubmission = new Date(recentResult.rows[0].submitted_at);
      const daysAgo = Math.floor((now - lastSubmission) / (1000 * 60 * 60 * 24));
      return res.status(400).json({ 
        error: 'You have already requested food in the last 14 days. Please wait.',
        lastSubmission: lastSubmission.toISOString(),
        daysAgo: daysAgo
      });
    }

    // 5. Generate unique order number
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `FB-${dateStr}-${String(usedBags + 1).padStart(3, '0')}`;

    // 6. Insert citizen
    const citizenResult = await db.query(
      `INSERT INTO citizens (name, phone, email, order_number, food_window_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, submitted_at`,
      [name.trim(), normalizedPhone, email?.trim() || null, orderNumber, food_window_id]
    );

    // 7. Send SMS via Twilio
    try {
      const smsResult = await sendSMS(
        normalizedPhone,
        `✅ Your food order #${orderNumber} has been confirmed. Thank you for using our food bank!`
      );
      
      if (!smsResult.success) {
        console.warn('Failed to send SMS:', smsResult.error);
      }
    } catch (smsErr) {
      console.warn('SMS sending failed:', smsErr.message);
      // Don't fail the whole request if SMS fails
    }

    res.status(201).json({
      success: true,
      orderNumber,
      citizenId: citizenResult.rows[0].id,
      submittedAt: citizenResult.rows[0].submitted_at,
      message: 'Registration successful! Check your SMS for confirmation.'
    });

  } catch (err) {
    console.error('Citizen submission error:', err);
    
    if (err.message.includes('phone number') || err.message.includes('Phone number')) {
      return res.status(400).json({ error: err.message });
    }
    
    res.status(500).json({ error: 'Registration failed. Please try again later.' });
  }
});

// Get citizen by order number (for status checking)
router.get('/order/:orderNumber', async (req, res) => {
  const { orderNumber } = req.params;

  try {
    const result = await db.query(
      `SELECT c.*, fw.start_time, fw.end_time 
       FROM citizens c
       JOIN food_windows fw ON c.food_window_id = fw.id
       WHERE c.order_number = $1`,
      [orderNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Order lookup error:', err);
    res.status(500).json({ error: 'Failed to retrieve order information' });
  }
});

module.exports = router;
