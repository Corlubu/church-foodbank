// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
//const User = require('../models/User'); // Assuming you have a User model

// Mock user data - replace with your actual user database
const users = [
  {
    id: 1,
    email: 'admin@church.org',
    password: 'admin123', // In real app, use hashed passwords
    role: 'admin',
    name: 'Church Administrator'
  },
  {
    id: 2,
    email: 'staff@church.org',
    password: 'staff123',
    role: 'staff',
    name: 'Church Staff'
  }
];

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    // Find user (replace with database lookup)
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Create token payload (excluding password)
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    };

    // Generate JWT token
    const token = jwt.sign(
     {
     userId: user.id,
    // THIS IS CRITICAL: Must be the exact column name from your DB (e.g., 'role')
    role: user.role 
    },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Return user data (without password) and token
    const userResponse = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    };

    res.json({
      token,
      user: userResponse,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error during login'
    });
  }
});

// Verify token route
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        valid: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Find user (replace with database lookup)
      const user = users.find(u => u.id === decoded.userId);
      
      if (!user) {
        return res.status(401).json({
          valid: false,
          error: 'User not found'
        });
      }

      // Return user data (without password)
      const userResponse = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      };

      res.json({
        valid: true,
        user: userResponse
      });

    } catch (jwtError) {
      return res.status(401).json({
        valid: false,
        error: 'Invalid or expired token'
      });
    }

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      valid: false,
      error: 'Token verification failed'
    });
  }
});

// Logout route (optional - for server-side token invalidation if needed)
router.post('/logout', (req, res) => {
  // In a real app, you might want to maintain a blacklist of tokens
  // For JWT, since they're stateless, we just tell the client to forget the token
  res.json({
    message: 'Logout successful'
  });
});

module.exports = router;
