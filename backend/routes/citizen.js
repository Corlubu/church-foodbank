// backend/routes/citizen.js
const express = require('express');
const db = require('../config/db');
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
// Sequence for order numbers
//////const { rows } = await db.query('SELECT nextval(\'foodbank_order_seq\') AS seq');
//////const orderNumber = `FB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(rows[0].seq).padStart(3, '0')}`;
const { v4: uuidv4 } = require('uuid');
const orderNumber = `FB-${uuidv4().slice(0, 8)}`;

const router = express.Router();

// Submit citizen data via QR code
router.post('/submit/:qrId', async (req, res) => {
  const { qrId } = req.params;
  const { name, phone, email } = req.body;

  // Basic validation
  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  // Normalize phone (ensure E.164 format if possible)
  let normalizedPhone = phone;
  if (!phone.startsWith('+')) {
    // Simple fallback: assume US (+1)
    normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length === 10) {
      normalizedPhone = '+1' + normalizedPhone;
    } else {
      return res.status(400).json({ error: 'Invalid phone number. Please use +1234567890 format.' });
    }
  }

  try {
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

    // 2. Check if current time is within food window
    const now = new Date();
    if (now < new Date(start_time) || now > new Date(end_time)) {
      return res.status(400).json({ error: 'Submission period is not active' });
    }

    // 3. Check if quota is full
    const usedBagsResult = await db.query(
      'SELECT COUNT(*) FROM citizens WHERE food_window_id = $1',
      [food_window_id]
    );
    const usedBags = parseInt(usedBagsResult.rows[0].count);
    if (usedBags >= available_bags) {
      return res.status(400).json({ error: 'Food quota has been reached. No more requests accepted.' });
    }

    // 4. Enforce 14-day rule
    const recentResult = await db.query(
      `SELECT id FROM citizens 
       WHERE phone = $1 
         AND submitted_at > NOW() - INTERVAL '14 days'`,
      [normalizedPhone]
    );
    if (recentResult.rows.length > 0) {
      return res.status(400).json({ error: 'You have already requested food in the last 14 days. Please wait.' });
    }

    // 5. Generate unique order number
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `FB-${dateStr}-${String(usedBags + 1).padStart(3, '0')}`;

    // 6. Insert citizen
    await db.query(
      `INSERT INTO citizens (name, phone, email, order_number, food_window_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [name.trim(), normalizedPhone, email?.trim() || null, orderNumber, food_window_id]
    );

    // 7. Send SMS via Twilio
    try {
      await client.messages.create({
        body: `✅ Your food order #${orderNumber} has been confirmed. Thank you for using our food bank!`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: normalizedPhone
      });
    } catch (smsErr) {
      console.warn('Failed to send SMS:', smsErr.message);
      // Don't fail the whole request if SMS fails
    }

    res.status(201).json({
      success: true,
      orderNumber,
      message: 'Registration successful! Check your SMS.'
    });

  } catch (err) {
    console.error('Citizen submission error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again later.' });
  }
});

module.exports = router;