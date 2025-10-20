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

// Import middleware (make sure these files exist)
const { authenticateJWT, authorizeRoles } = require('./middleware/auth');
const { errorHandler } = require('./middleware/error');
const { requestLogger } = require('./middleware/logger');

// Import database connection
const connectDB = require('./config/database');

const app = express();

// ======================
// ENVIRONMENT VALIDATION (FIRST!)
// ======================
const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL', 'NODE_ENV'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  } else {
    console.warn('⚠️  Running in development with missing environment variables');
  }
}

// ======================
// DATABASE CONNECTION
// ======================
connectDB();

// ======================
// SECURITY MIDDLEWARE
// ======================

// Custom Helmet configuration
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

// CORS configuration
const getCorsOrigins = () => {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.split(',').map(origin => origin.trim());
  }
  return process.env.NODE_ENV === 'production' 
    ? ['https://church-foodbank.vercel.app']
    : ['http://localhost:5173', 'https://church-foodbank.vercel.app'];
};

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getCorsOrigins();
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`🚫 Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes

// Body parsing middleware
app.use(express.json({ 
  limit: process.env.BODY_LIMIT || '10mb'
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.BODY_LIMIT || '10mb',
  parameterLimit: 50 // Reduced from 100 for security
}));

// ======================
// RATE LIMITING (REORDERED!)
// ======================

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Citizen submission rate limiter
const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: 'Too many registration attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting in correct order
app.use('/api/', generalLimiter);

// ======================
// API ROUTES (CORRECT ORDER)
// ======================

// Public routes
app.use('/api/auth', authRoutes);

// Citizen routes with proper rate limiting ORDER
app.use('/api/citizen/submit', submissionLimiter); // Apply limiter FIRST
app.use('/api/citizen', citizenRoutes); // Then mount routes

// Protected routes
app.use('/api/admin', authenticateJWT, authorizeRoles(['admin']), adminRoutes);
app.use('/api/staff', authenticateJWT, authorizeRoles(['staff', 'admin']), staffRoutes);

// ======================
// HEALTH CHECK & INFO
// ======================

app.get('/api/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    database: 'connected' // You might want to check DB connection here
  };
  
  res.json(healthCheck);
});

app.get('/api/info', (req, res) => {
  res.json({
    name: 'Church Food Bank API',
    version: '1.0.0',
    description: 'API for managing church food bank operations',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req, res) => {
  res.redirect('/api/info');
});

// ======================
// ERROR HANDLING
// ======================

// Handle 404 - must be after all routes
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
// SERVER STARTUP
// ======================

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Validate port
if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
  console.error('❌ Invalid PORT:', PORT);
  process.exit(1);
}

const server = app.listen(PORT, HOST, () => {
  console.log('='.repeat(50));
  console.log(`✅ Church Food Bank API Server Started`);
  console.log(`📍 Host: ${HOST}`);
  console.log(`🚀 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health: http://${HOST}:${PORT}/api/health`);
  console.log('='.repeat(50));
});

// ======================
// GRACEFUL SHUTDOWN
// ======================

const shutdownSignals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      console.error('❌ Error during shutdown:', err);
      process.exit(1);
    }
    
    console.log('✅ HTTP server closed');
    // Add database disconnection here if needed
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  });

  // Force shutdown after 8 seconds
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcing shutdown');
    process.exit(1);
  }, 8000);
};

// Register shutdown handlers
shutdownSignals.forEach(signal => {
  process.on(signal, () => gracefulShutdown(signal));
});

// Handle unhandled exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;
