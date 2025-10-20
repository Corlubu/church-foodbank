// backend/routes/admin.js
const express = require('express');
const db = require('../config/db');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const ExcelJS = require('exceljs');

const router = express.Router();

// Create a new food availability window
router.post('/food-window', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  const { available_bags, start_time, end_time, description } = req.body;

  if (!available_bags || !start_time || !end_time) {
    return res.status(400).json({ error: 'available_bags, start_time, and end_time are required' });
  }

  if (available_bags < 1) {
    return res.status(400).json({ error: 'available_bags must be at least 1' });
  }

  const startTime = new Date(start_time);
  const endTime = new Date(end_time);
  
  if (startTime >= endTime) {
    return res.status(400).json({ error: 'start_time must be before end_time' });
  }

  if (startTime < new Date()) {
    return res.status(400).json({ error: 'start_time cannot be in the past' });
  }

  try {
    const result = await db.query(
      `INSERT INTO food_windows (available_bags, start_time, end_time, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [available_bags, start_time, end_time, description?.trim() || null]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create food window error:', err);
    res.status(500).json({ error: 'Failed to create food window' });
  }
});

// Generate QR code for a food window
router.post('/qr', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  const { food_window_id, hours_valid = 24 } = req.body;

  if (!food_window_id) {
    return res.status(400).json({ error: 'food_window_id is required' });
  }

  if (hours_valid < 1 || hours_valid > 168) {
    return res.status(400).json({ error: 'hours_valid must be between 1 and 168 (1 week)' });
  }

  try {
    // Validate food window exists and is active
    const windowResult = await db.query(
      'SELECT * FROM food_windows WHERE id = $1 AND is_active = true',
      [food_window_id]
    );
    
    if (windowResult.rows.length === 0) {
      return res.status(404).json({ error: 'Active food window not found' });
    }

    const qrId = uuidv4();
    const expiresAt = new Date(Date.now() + hours_valid * 60 * 60 * 1000);

    await db.query(
      `INSERT INTO qr_codes (id, food_window_id, expires_at)
       VALUES ($1, $2, $3)`,
      [qrId, food_window_id, expiresAt]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'https://church-foodbank.vercel.app';
    const qrUrl = `${frontendUrl}/citizen/submit/${qrId}`;

    res.status(201).json({
      qrId,
      qrUrl,
      expiresAt: expiresAt.toISOString(),
      food_window: windowResult.rows[0],
      message: 'QR code generated successfully'
    });
  } catch (err) {
    console.error('QR generation error:', err);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Get all citizens (with pagination and filtering)
router.get('/citizens', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const offset = (page - 1) * limit;
  const { food_window_id, date } = req.query;

  try {
    let query = `
      SELECT c.*, fw.start_time, fw.end_time, fw.available_bags
      FROM citizens c
      JOIN food_windows fw ON c.food_window_id = fw.id
    `;
    let countQuery = `SELECT COUNT(*) FROM citizens c JOIN food_windows fw ON c.food_window_id = fw.id`;
    const queryParams = [];
    const whereConditions = [];

    if (food_window_id) {
      queryParams.push(food_window_id);
      whereConditions.push(`c.food_window_id = $${queryParams.length}`);
    }

    if (date) {
      queryParams.push(date);
      whereConditions.push(`DATE(c.submitted_at) = $${queryParams.length}`);
    }

    if (whereConditions.length > 0) {
      const whereClause = ` WHERE ${whereConditions.join(' AND ')}`;
      query += whereClause;
      countQuery += whereClause;
    }

    query += ` ORDER BY c.submitted_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const [result, totalResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, queryParams.slice(0, -2)) // Remove limit/offset for count
    ]);

    const total = parseInt(totalResult.rows[0].count);

    res.json({
      citizens: result.rows,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error('Fetch citizens error:', err);
    res.status(500).json({ error: 'Failed to fetch citizens' });
  }
});

// Update citizen
router.put('/citizens/:id', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  const { id } = req.params;
  const { name, phone, email } = req.body;

  if (!name && !phone && !email) {
    return res.status(400).json({ error: 'At least one field (name, phone, email) is required to update' });
  }

  try {
    const currentResult = await db.query('SELECT * FROM citizens WHERE id = $1', [id]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Citizen not found' });
    }

    const current = currentResult.rows[0];
    const updateFields = [];
    const queryParams = [];

    if (name) {
      queryParams.push(name.trim());
      updateFields.push(`name = $${queryParams.length}`);
    }

    if (phone) {
      queryParams.push(phone.trim());
      updateFields.push(`phone = $${queryParams.length}`);
    }

    if (email) {
      queryParams.push(email?.trim() || null);
      updateFields.push(`email = $${queryParams.length}`);
    }

    queryParams.push(id);

    const result = await db.query(
      `UPDATE citizens
       SET ${updateFields.join(', ')}, updated_at = NOW()
       WHERE id = $${queryParams.length}
       RETURNING *`,
      queryParams
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update citizen error:', err);
    res.status(500).json({ error: 'Failed to update citizen' });
  }
});

// Export citizens to Excel
router.get('/export/excel', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    const citizens = await db.query(
      `SELECT 
        c.name, 
        c.phone, 
        c.email, 
        c.order_number, 
        c.submitted_at, 
        c.pickup_confirmed,
        fw.start_time AS window_start,
        fw.end_time AS window_end
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
      { header: 'Submission Date', key: 'submitted_at', width: 22 },
      { header: 'Distribution Window Start', key: 'window_start', width: 25 },
      { header: 'Distribution Window End', key: 'window_end', width: 25 },
      { header: 'Pickup Confirmed', key: 'pickup_confirmed', width: 18 }
    ];

    if (citizens.rows.length > 0) {
      worksheet.addRows(citizens.rows);

      // Format date columns
      citizens.rows.forEach((row, rowIndex) => {
        ['submitted_at', 'window_start', 'window_end'].forEach(col => {
          const cell = worksheet.getCell(rowIndex + 2, worksheet.getColumn(col).number);
          if (row[col]) {
            cell.value = new Date(row[col]);
            cell.numFmt = 'YYYY-MM-DD HH:MM';
          }
        });

        // Format boolean column
        const pickupCell = worksheet.getCell(rowIndex + 2, worksheet.getColumn('pickup_confirmed').number);
        pickupCell.value = row.pickup_confirmed ? 'Yes' : 'No';
      });
    } else {
      worksheet.addRow(['No data available']);
    }

    // Set response headers
    const timestamp = new Date().toISOString().slice(0, 10);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="foodbank_registrations_${timestamp}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Excel export error:', err);
    res.status(500).json({ error: 'Failed to generate Excel report' });
  }
});

// Toggle food window active status
router.patch('/food-window/:id/active', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  if (typeof is_active !== 'boolean') {
    return res.status(400).json({ error: 'is_active must be a boolean' });
  }

  try {
    const result = await db.query(
      'UPDATE food_windows SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [is_active, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Food window not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Toggle food window error:', err);
    res.status(500).json({ error: 'Failed to update food window' });
  }
});

// Get all food windows
router.get('/food-windows', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT fw.*, 
              (SELECT COUNT(*) FROM citizens WHERE food_window_id = fw.id) AS used_bags,
              (SELECT COUNT(*) FROM qr_codes WHERE food_window_id = fw.id AND is_active = true AND expires_at > NOW()) AS active_qr_codes
       FROM food_windows fw
       ORDER BY fw.start_time DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch food windows error:', err);
    res.status(500).json({ error: 'Failed to fetch food windows' });
  }
});

module.exports = router;
