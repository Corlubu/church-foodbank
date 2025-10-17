// backend/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const staffRoutes = require('./routes/staff');
const citizenRoutes = require('./routes/citizen');

const app = express();

// ======================
// SECURITY MIDDLEWARE
// ======================

// Set secure HTTP headers
app.use(helmet());

// Enable CORS (restrict to your frontend origin in production)
const corsOptions = {
  ////origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  origin: process.env.FRONTEND_URL || 'https://church-foodbank.vercel.app',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ======================
// RATE LIMITING
// ======================

// Limit citizen submissions to prevent abuse
const citizenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many registration attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/citizen', citizenLimiter);

// ======================
// API ROUTES
// ======================

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/citizen', citizenRoutes);

// Protected routes (JWT required)
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);

// ======================
// HEALTH CHECK & ROOT
// ======================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Church Food Bank API is running 🙏'
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Church Food Bank API',
    version: '1.0.0',
    documentation: 'Visit /api/health for status'
  });
});

// ======================
// GLOBAL ERROR HANDLING
// ======================

// Handle 404 for undefined routes
app.use('/{*any}', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler (for uncaught errors)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ======================
// SERVER STARTUP
// ======================

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Church Food Bank API running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 Admin login: POST /api/auth/login`);
  console.log(`📱 Citizen submit: POST /api/citizen/submit/:qrId`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated gracefully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated gracefully');
    process.exit(0);
  });
});

module.exports = app;
