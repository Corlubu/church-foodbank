// backend/routes/auth.js
const express = require('express');
const db = require('../config/db'); // Import your DB connection
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// FIX: Initialize the Express Router
const router = express.Router(); 

// Login Route (now using PostgreSQL and bcrypt)
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // 1. Find user by email in PostgreSQL
    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      // Use next() to pass to the error middleware for consistency
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      return next(err);
    }

    const user = userResult.rows[0];

    // 2. Compare the plain password with the hashed password from the DB
     // ❌ DANGER: THIS IS INSECURE AND SHOULD ONLY BE USED FOR TESTING!
     // -----------------------------------------------------------------
    // BEFORE: const passwordMatch = await bcrypt.compare(password, user.password); 
    
    // AFTER: Change this line to compare the plain text passwords
    const passwordMatch = (password === user.password); 
    // -----------------------------------------------------------------
    if (!passwordMatch) {
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      return next(err);
    }

    // 3. Generate JWT Token with role
    const token = jwt.sign(
      { 
        userId: user.id, 
        role: user.role // CRITICAL: Used by middleware/auth.js
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // 4. Send token and user data back
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
    });

  } catch (error) {
    console.error('Login database error:', error);
    next(error); // Pass the error to your centralized error handler
  }
});

// Route for token verification (optional, but good practice)
router.get('/verify', async (req, res, next) => {
    // You'll need to use your authenticateJWT middleware here
    // But since this file only exports routes, this logic often lives elsewhere.
    // For now, let's keep it simple and focus on the login fix.
    res.status(501).json({ error: 'Verification route not implemented' });
});

// FIX: Export the router
module.exports = router;
