// backend/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const expressMongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const compression = require('compression');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const staffRoutes = require('./routes/staff');
const citizenRoutes = require('./routes/citizen');

// Import middleware
const { authenticateJWT, authorizeRoles } = require('./middleware/auth');
const { errorHandler } = require('./middleware/error');
const { requestLogger } = require('./middleware/logger');

// Import database connection
const connectDB = require('./config/database');

const app = express();

// ======================
// DATABASE CONNECTION
// ======================
connectDB();

// ======================
// SECURITY MIDDLEWARE
// ======================

// Custom Helmet configuration for specific security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Enable CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : ['http://localhost:5173', 'https://church-foodbank.vercel.app'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Request parsing with limits
app.use(express.json({ 
  limit: process.env.BODY_LIMIT || '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.BODY_LIMIT || '10mb',
  parameterLimit: 100 // Prevent overloading with too many parameters
}));

// Data sanitization against NoSQL query injection
app.use(expressMongoSanitize());

// Prevent parameter pollution
app.use(hpp({
  whitelist: ['sort', 'page', 'limit', 'fields'] // Whitelist certain parameters
}));

// Compression middleware
app.use(compression());

// ======================
// LOGGING MIDDLEWARE
// ======================
app.use(requestLogger);

// ======================
// RATE LIMITING
// ======================

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Citizen submission rate limiter (more restrictive)
const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 submission requests per windowMs
  message: {
    error: 'Too many registration attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP + user agent for more accurate rate limiting
    return req.ip + (req.get('user-agent') || '');
  }
});

// Apply general rate limiting to all routes
app.use('/api/', generalLimiter);

// ======================
// API ROUTES
// ======================

// Public routes
app.use('/api/auth', authRoutes);

// Citizen routes with submission-specific rate limiting
app.use('/api/citizen', citizenRoutes);
app.use('/api/citizen/submit', submissionLimiter); // Apply only to submission endpoints

// Protected routes (JWT required)
app.use('/api/admin', authenticateJWT, authorizeRoles(['admin']), adminRoutes);
app.use('/api/staff', authenticateJWT, authorizeRoles(['staff', 'admin']), staffRoutes);

// ======================
// HEALTH CHECK & ROOT
// ======================

app.get('/api/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  };
  
  res.json(healthCheck);
});

app.get('/api/info', (req, res) => {
  res.json({
    name: 'Church Food Bank API',
    version: '1.0.0',
    description: 'API for managing church food bank operations',
    documentation: '/api/health for status',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req, res) => {
  res.redirect('/api/info');
});

// ======================
// GLOBAL ERROR HANDLING
// ======================

// Handle 404 for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use(errorHandler);

// ======================
// ENVIRONMENT VALIDATION
// ======================
const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0 && process.env.NODE_ENV === 'production') {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

// ======================
// SERVER STARTUP
// ======================

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`✅ Church Food Bank API running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 Host: ${HOST}`);
  console.log(`🔐 Admin login: POST /api/auth/login`);
  console.log(`📱 Citizen submit: POST /api/citizen/submit/:qrId`);
  console.log(`📊 Health check: GET /api/health`);
});

// ======================
// GRACEFUL SHUTDOWN
// ======================

const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    // Close database connections here if needed
    // mongoose.connection.close();
    
    console.log('✅ Process terminated gracefully');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;
