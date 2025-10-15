const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await db.query('SELECT * FROM users WHERE username = $1', [username]);
  if (user.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.rows[0].password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user.rows[0].id, username, role: user.rows[0].role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  res.json({ token, role: user.rows[0].role });
});

module.exports = router;
