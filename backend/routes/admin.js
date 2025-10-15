// backend/routes/admin.js
const { v4: uuidv4 } = require('uuid');const express = require('express');

const db = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs').promises;

// Instead of hardcoding localhost
const frontendUrl = process.env.FRONTEND_URL || 'https://cchfoodbank.onrender.com/api';
const qrUrl = '${frontendUrl}/citizen/submit/${qrId}';

const router = express.Router();

// Create a new food availability window
router.post('/food-window', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { available_bags, start_time, end_time } = req.body;

  if (!available_bags || !start_time || !end_time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await db.query(
      `INSERT INTO food_windows (available_bags, start_time, end_time)
       VALUES ($1, $2, $3) RETURNING *`,
      [available_bags, start_time, end_time]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create food window' });
  }
});

// Generate QR code for a food window
router.post('/qr', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { food_window_id, hours_valid = 24 } = req.body;

  if (!food_window_id) {
    return res.status(400).json({ error: 'food_window_id is required' });
  }

  try {
    // Validate food window exists and is active
    const window = await db.query(
      'SELECT * FROM food_windows WHERE id = $1 AND is_active = true',
      [food_window_id]
    );
    if (window.rows.length === 0) {
      return res.status(404).json({ error: 'Active food window not found' });
    }
    //GENERATE qrId FIRST
    const qrId = uuidv4();
    const expiresAt = new Date(Date.now() + hours_valid * 60 * 60 * 1000);

    await db.query(
      `INSERT INTO qr_codes (id, food_window_id, expires_at)
       VALUES ($1, $2, $3)`,
      [qrId, food_window_id, expiresAt]
    );

    // Frontend URL (adjust in production)
    ////const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const frontendUrl = process.env.FRONTEND_URL || 'https://cch-foodpantry.onrender.com/api';
    const qrUrl = `${frontendUrl}/citizen/submit/${qrId}`;

    res.json({
      qrId,
      qrUrl,
      expiresAt,
      message: 'QR code generated successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Get all citizens (with pagination)
router.get('/citizens', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  try {
    const result = await db.query(
      `SELECT c.*, fw.start_time, fw.end_time
       FROM citizens c
       JOIN food_windows fw ON c.food_window_id = fw.id
       ORDER BY c.submitted_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const total = await db.query('SELECT COUNT(*) FROM citizens');
    res.json({
      citizens: result.rows,
      total: parseInt(total.rows[0].count),
      page,
      pages: Math.ceil(parseInt(total.rows[0].count) / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch citizens' });
  }
});

// Update citizen (e.g., correct name/phone)
router.put('/citizens/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { id } = req.params;
  const { name, phone, email } = req.body;

  try {
    const result = await db.query(
      `UPDATE citizens
       SET name = $1, phone = $2, email = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name, phone, email, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Citizen not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update citizen' });
  }
});

// Export citizens to Excel
router.get('/export/excel', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const citizens = await db.query(
      `SELECT name, phone, email, order_number, submitted_at, fw.start_time AS window_start
       FROM citizens c
       JOIN food_windows fw ON c.food_window_id = fw.id
       ORDER BY c.submitted_at DESC`
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Food Bank Registrations');

    worksheet.columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Order Number', key: 'order_number', width: 20 },
      { header: 'Submission Date', key: 'submitted_at', width: 20 },
      { header: 'Distribution Window', key: 'window_start', width: 20 }
    ];

    worksheet.addRows(citizens.rows);

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="foodbank_registrations.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate Excel report' });
  }
});

// Toggle food window active status
router.patch('/food-window/:id/active', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  try {
    const result = await db.query(
      'UPDATE food_windows SET is_active = $1 WHERE id = $2 RETURNING *',
      [is_active, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Food window not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update food window' });
  }
});

module.exports = router;