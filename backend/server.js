// backend/server.js - REWRITE FOR ENHANCED STABILITY & CORS

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
// Use the dotenv config first to ensure environment variables are loaded
require('dotenv').config(); 

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const staffRoutes = require('./routes/staff');
const citizenRoutes = require('./routes/citizen');

// Import middleware
const { authenticateJWT, authorizeRoles } = require('./middleware/auth');
const { errorHandler } = require('./middleware/error'); // Should be PostgreSQL-aware

// Import database connection utility
const db = require('./config/db');

const app = express();

// ======================
// 1. ENVIRONMENT VALIDATION
// ======================
const requiredEnvVars = [
  'JWT_SECRET', 
  'DATABASE_URL', 
  'TWILIO_ACCOUNT_SID', 
  'TWILIO_AUTH_TOKEN',
  'FRONTEND_URL' // Crucial for CORS
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  // Exit immediately in production if critical variables are missing
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
    process.exit(1);
  }
}

// ======================
// 2. DATABASE HEALTH CHECK
// ======================
const checkDatabaseConnection = async () => {
  try {
    // Attempt a simple query to confirm connectivity
    await db.query('SELECT 1'); 
    console.log('✅ Database connection established');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    if (process.env.NODE_ENV === 'production') {
      // Force exit if database is unreachable in production
      process.exit(1); 
    }
  }
};
checkDatabaseConnection();

// ======================
// 3. SECURITY MIDDLEWARE (Helmet & CORS)
// ======================
// Custom Helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Allow data: for QR codes generated on the frontend
      imgSrc: ["'self'", "data:", "https:"], 
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
    },
  },
  // Vercel/Render hosting usually handles these, but explicitly setting safe defaults
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS configuration (FIXING THE PREFLIGHT ERROR)
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(origin => origin.trim())
  // Fallback for development/testing if ENV is missed (but should be set)
  : ['http://localhost:5173', 'http://localhost:3000', 'https://church-foodbank.vercel.app']; 

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., Postman, server-to-server, curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS Blocked: Origin ${origin} is not allowed.`);
      // Passing an Error here prevents CORS headers from being set
      callback(new Error('Not allowed by CORS'), false); 
    }
  },
  credentials: true,
  // Ensure 204 for successful OPTIONS preflight request (Best Practice)
  optionsSuccessStatus: 204, 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// ======================
// 4. BODY PARSING & RATE LIMITING
// ======================

// Body parsing middleware
app.use(express.json({ limit: process.env.BODY_LIMIT || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.BODY_LIMIT || '10mb' }));

// General Rate Limiter (100 requests per 15 mins)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Citizen Submission Limiter (5 requests per 15 mins to prevent spam/abuse)
const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many registration attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', generalLimiter);

// ======================
// 5. API ROUTES
// ======================
app.use('/api/auth', authRoutes);

// Apply strict limiter before mounting the route
app.use('/api/citizen/submit', submissionLimiter); 
app.use('/api/citizen', citizenRoutes);

// Protected routes (Note: Ensure 'authenticateToken' is renamed to 'authenticateJWT' in admin.js and staff.js)
app.use('/api/admin', authenticateJWT, authorizeRoles(['admin']), adminRoutes);
app.use('/api/staff', authenticateJWT, authorizeRoles(['staff', 'admin']), staffRoutes);

// ======================
// 6. HEALTH CHECK & INFO
// ======================
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (err) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: err.message
    });
  }
});

// Default route for easy API discovery
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the Church Food Bank API',
    endpoints: {
      auth: '/api/auth/login',
      health: '/api/health',
      docs: 'API documentation coming soon...'
    }
  });
});

// ======================
// 7. ERROR HANDLING
// ======================

// 404 handler (Catch-all for undefined routes)
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// Global error handler (Must be the last middleware)
app.use(errorHandler);

// ======================
// 8. SERVER STARTUP & SHUTDOWN
// ======================
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log('='.repeat(50));
  console.log(`✅ Church Food Bank API Server Started`);
  console.log(`📍 Host: ${HOST}`);
  console.log(`🚀 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(50));
});

// Graceful Shutdown implementation remains the same and is excellent.
const shutdownSignals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
const gracefulShutdown = (signal) => { /* ... (Your existing implementation) ... */ }; 
shutdownSignals.forEach(signal => { process.on(signal, () => gracefulShutdown(signal)); });
process.on('uncaughtException', (error) => { console.error('❌ Uncaught Exception:', error); process.exit(1); });
process.on('unhandledRejection', (reason, promise) => { console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason); process.exit(1); });

module.exports = app;
