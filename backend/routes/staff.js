// backend/routes/staff.js
const express = require('express');
const db = require('../config/db');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const { sendSMS } = require('../utils/twilioClient');

const router = express.Router();

// Lookup citizen by QR code ID
router.get('/lookup/:qrId', authenticateJWT, authorizeRoles('staff', 'admin'), async (req, res) => {
  const { qrId } = req.params;

  try {
    const result = await db.query(
      `SELECT c.*, fw.available_bags, fw.start_time, fw.end_time,
              (SELECT COUNT(*) FROM citizens WHERE food_window_id = fw.id) AS used_bags
       FROM qr_codes qc
       JOIN food_windows fw ON qc.food_window_id = fw.id
       LEFT JOIN citizens c ON c.food_window_id = fw.id
       WHERE qc.id = $1 AND qc.is_active = true AND qc.expires_at > NOW()`,
      [qrId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active QR code found' });
    }

    // Return food window info and all citizens in that window
    const windowInfo = {
      food_window: {
        id: result.rows[0].food_window_id,
        available_bags: result.rows[0].available_bags,
        used_bags: result.rows[0].used_bags,
        start_time: result.rows[0].start_time,
        end_time: result.rows[0].end_time
      },
      citizens: result.rows.filter(row => row.id !== null).map(row => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        order_number: row.order_number,
        submitted_at: row.submitted_at
      }))
    };

    res.json(windowInfo);
  } catch (err) {
    console.error('QR lookup error:', err);
    res.status(500).json({ error: 'Lookup failed' });
  }
});

// Manual citizen registration by staff
router.post('/citizen/manual', authenticateJWT, authorizeRoles('staff', 'admin'), async (req, res) => {
  const { name, phone, email, food_window_id } = req.body;

  if (!name || !phone || !food_window_id) {
    return res.status(400).json({ error: 'Name, phone, and food window are required' });
  }

  if (name.length > 100) {
    return res.status(400).json({ error: 'Name must be less than 100 characters' });
  }

  try {
    // Validate food window
    const windowResult = await db.query(
      `SELECT * FROM food_windows 
       WHERE id = $1 AND is_active = true 
       AND NOW() BETWEEN start_time AND end_time`,
      [food_window_id]
    );
    
    if (windowResult.rows.length === 0) {
      return res.status(400).json({ error: 'Selected food window is not active or not found' });
    }

    const foodWindow = windowResult.rows[0];

    // Normalize phone
    const normalizePhone = (phone) => {
      const cleaned = phone.replace(/[^\d+]/g, '');
      if (cleaned.startsWith('+')) return cleaned;
      if (cleaned.length === 10) return '+1' + cleaned;
      if (cleaned.length === 11 && cleaned.startsWith('1')) return '+' + cleaned;
      throw new Error('Invalid phone number format');
    };

    const normalizedPhone = normalizePhone(phone);

    // Check 14-day rule
    const recentResult = await db.query(
      `SELECT id, submitted_at FROM citizens 
       WHERE phone = $1 AND submitted_at > NOW() - INTERVAL '14 days'`,
      [normalizedPhone]
    );
    
    if (recentResult.rows.length > 0) {
      return res.status(400).json({ 
        error: 'This phone number already requested food in the last 14 days',
        lastSubmission: recentResult.rows[0].submitted_at
      });
    }

    // Check quota
    const usedResult = await db.query(
      'SELECT COUNT(*) FROM citizens WHERE food_window_id = $1', 
      [food_window_id]
    );
    
    const usedBags = parseInt(usedResult.rows[0].count);
    if (usedBags >= foodWindow.available_bags) {
      return res.status(400).json({ 
        error: 'Food quota for this window is full',
        available: foodWindow.available_bags,
        used: usedBags
      });
    }

    // Generate order number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `FB-${dateStr}-${String(usedBags + 1).padStart(3, '0')}`;

    // Insert citizen
    const citizenResult = await db.query(
      `INSERT INTO citizens (name, phone, email, order_number, food_window_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, submitted_at`,
      [name.trim(), normalizedPhone, email?.trim() || null, orderNumber, food_window_id]
    );

    // Send SMS
    try {
      await sendSMS(
        normalizedPhone,
        `✅ Your food order #${orderNumber} has been confirmed. Thank you for using our food bank!`
      );
    } catch (smsErr) {
      console.warn('SMS failed:', smsErr.message);
    }

    res.status(201).json({ 
      success: true, 
      message: 'Citizen registered successfully',
      orderNumber,
      citizenId: citizenResult.rows[0].id
    });
  } catch (err) {
    console.error('Manual registration error:', err);
    
    if (err.message.includes('phone number')) {
      return res.status(400).json({ error: err.message });
    }
    
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Get active food windows
router.get('/food-windows/active', authenticateJWT, authorizeRoles('staff', 'admin'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        id,
        start_time,
        end_time,
        available_bags,
        (SELECT COUNT(*) FROM citizens WHERE food_window_id = fw.id) AS used_bags
       FROM food_windows fw
       WHERE is_active = true 
         AND NOW() BETWEEN start_time AND end_time
       ORDER BY start_time ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching active windows:', err);
    res.status(500).json({ error: 'Failed to load food windows' });
  }
});

// Confirm pickup (optional enhancement)
router.post('/citizen/:id/pickup', authenticateJWT, authorizeRoles('staff', 'admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      `UPDATE citizens 
       SET pickup_confirmed = true, pickup_confirmed_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Citizen not found' });
    }

    res.json({ 
      success: true, 
      message: 'Pickup confirmed',
      citizen: result.rows[0]
    });
  } catch (err) {
    console.error('Pickup confirmation error:', err);
    res.status(500).json({ error: 'Failed to confirm pickup' });
  }
});

module.exports = router;
