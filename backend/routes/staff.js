// backend/routes/staff.js
const express = require('express');
const db = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
// Sequence for order numbers
//////const { rows } = await db.query('SELECT nextval(\'foodbank_order_seq\') AS seq');
//////const orderNumber = `FB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(rows[0].seq).padStart(3, '0')}`;
const { v4: uuidv4 } = require('uuid');
const orderNumber = `FB-${uuidv4().slice(0, 8)}`;

const router = express.Router();

// Lookup citizen by QR code ID (used when staff scans QR)
router.get('/lookup/:qrId', authenticateToken, authorizeRoles('staff'), async (req, res) => {
  const { qrId } = req.params;

  try {
    const result = await db.query(
      `SELECT c.*, fw.available_bags, 
              (SELECT COUNT(*) FROM citizens WHERE food_window_id = fw.id) AS used_bags
       FROM qr_codes qc
       JOIN food_windows fw ON qc.food_window_id = fw.id
       JOIN citizens c ON c.food_window_id = fw.id
       WHERE qc.id = $1 AND qc.is_active = true AND qc.expires_at > NOW()`,
      [qrId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No citizen found for this QR code' });
    }

    // Return all citizens in that window (or just the one if needed)
    // For simplicity, we return the first (or you can return all)
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lookup failed' });
  }
});

// Confirm pickup (optional enhancement)
// backend/routes/staff.js

// Add this inside the staff router
router.post('/citizen/manual', authenticateToken, authorizeRoles('staff'), async (req, res) => {
  const { name, phone, email, food_window_id } = req.body;

  if (!name || !phone || !food_window_id) {
    return res.status(400).json({ error: 'Name, phone, and food window are required' });
  }

  try {
    // Validate food window
    const window = await db.query(
      'SELECT * FROM food_windows WHERE id = $1 AND is_active = true AND NOW() BETWEEN start_time AND end_time',
      [food_window_id]
    );
    if (window.rows.length === 0) {
      return res.status(400).json({ error: 'Selected food window is not active' });
    }

    // Check 14-day rule
    const recent = await db.query(
      'SELECT id FROM citizens WHERE phone = $1 AND submitted_at > NOW() - INTERVAL \'14 days\'',
      [phone]
    );
    if (recent.rows.length > 0) {
      return res.status(400).json({ error: 'This phone number already requested food in the last 14 days' });
    }

    // Check quota
    const used = await db.query('SELECT COUNT(*) FROM citizens WHERE food_window_id = $1', [food_window_id]);
    if (parseInt(used.rows[0].count) >= window.rows[0].available_bags) {
      return res.status(400).json({ error: 'Food quota for this window is full' });
    }

    // Generate order number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `FB-${dateStr}-${String(parseInt(used.rows[0].count) + 1).padStart(3, '0')}`;

    // Insert citizen
    await db.query(
      `INSERT INTO citizens (name, phone, email, order_number, food_window_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [name, phone, email, orderNumber, food_window_id]
    );

    // Send SMS
    try {
      await require('../utils/twilioClients').sendSMS(
        phone,
        `Your food order #${orderNumber} has been confirmed. Thank you!`
      );
    } catch (smsErr) {
      console.warn('SMS failed:', smsErr);
    }

    res.json({ success: true, message: 'Citizen registered' });
  } catch (err) {
    console.error('Manual registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Add this route to get active food windows
router.get('/food-windows/active', authenticateToken, authorizeRoles('staff'), async (req, res) => {
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
       ORDER BY start_time DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching active windows:', err);
    res.status(500).json({ error: 'Failed to load food windows' });
  }
});

module.exports = router;