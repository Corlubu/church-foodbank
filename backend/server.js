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

// Import middleware
const { authenticateJWT, authorizeRoles } = require('./middleware/auth');
const { errorHandler } = require('./middleware/error');

// Import database connection
const db = require('./config/db');

const app = express();

// ======================
// ENVIRONMENT VALIDATION
// ======================
const requiredEnvVars = ['JWT_SECRET', 'DB_NAME', 'DB_USER', 'DB_PASS', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'];
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
// DATABASE HEALTH CHECK
// ======================
const checkDatabaseConnection = async () => {
  try {
    await db.query('SELECT 1');
    console.log('✅ Database connection established');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};
checkDatabaseConnection();

// ======================
// SECURITY MIDDLEWARE
// ======================
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
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.FRONTEND_URL 
      ? process.env.FRONTEND_URL.split(',').map(origin => origin.trim())
      : process.env.NODE_ENV === 'production' 
        ? ['https://church-foodbank.vercel.app']
        : ['http://localhost:5173', 'http://localhost:3000', 'https://church-foodbank.vercel.app'];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
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
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json({ 
  limit: process.env.BODY_LIMIT || '10mb'
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.BODY_LIMIT || '10mb',
  parameterLimit: 50
}));

// ======================
// RATE LIMITING
// ======================
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many registration attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', generalLimiter);

// ======================
// REQUEST LOGGING
// ======================
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// ======================
// API ROUTES
// ======================
app.use('/api/auth', authRoutes);
app.use('/api/citizen/submit', submissionLimiter);
app.use('/api/citizen', citizenRoutes);
app.use('/api/admin', authenticateJWT, authorizeRoles(['admin']), adminRoutes);
app.use('/api/staff', authenticateJWT, authorizeRoles(['staff', 'admin']), staffRoutes);

// ======================
// HEALTH CHECK & INFO
// ======================
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    const healthCheck = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      database: 'connected'
    };
    res.json(healthCheck);
  } catch (err) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: err.message
    });
  }
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
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

app.use(errorHandler);

// ======================
// SERVER STARTUP
// ======================
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

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
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcing shutdown');
    process.exit(1);
  }, 8000);
};

shutdownSignals.forEach(signal => {
  process.on(signal, () => gracefulShutdown(signal));
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;
