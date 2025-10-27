// backend/routes/auth.js

router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // 1. Find user by email in PostgreSQL
    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // 2. Compare the plain password with the hashed password from the DB
    // NOTE: If you haven't hashed the passwords yet, this is where you'd do it.
    // For now, if passwords are in plain text, you might use: password === user.password 
    // but the final code MUST use bcrypt.
    
    // ❌ DANGER: ONLY use for temporary testing if DB passwords are plain text.
    // const passwordMatch = (password === user.password); 
    
    // ✅ PROPER IMPLEMENTATION (assuming user.password is a hash):
    const passwordMatch = await bcrypt.compare(password, user.password); 

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 3. Generate JWT Token with role
    const token = jwt.sign(
      { 
        userId: user.id, 
        role: user.role // 👈 CRITICAL: This role is used by your middleware/auth.js
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
    console.error('Login error:', error);
    // Pass the error to your centralized error handler (backend/middleware/error.js)
    next(error); 
  }
});

// module.exports = router;
