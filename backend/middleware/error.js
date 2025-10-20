// backend/middleware/error.js
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error with request context
  console.error('Error Details:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user ? req.user.userId : 'unauthenticated',
    timestamp: new Date().toISOString()
  });

  // PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // unique_violation
        error = { message: 'Duplicate entry found', statusCode: 409 };
        break;
      case '23503': // foreign_key_violation
        error = { message: 'Referenced record not found', statusCode: 404 };
        break;
      case '23502': // not_null_violation
        error = { message: 'Required field missing', statusCode: 400 };
        break;
      case '22P02': // invalid_text_representation
        error = { message: 'Invalid data format', statusCode: 400 };
        break;
      default:
        error = { message: 'Database error', statusCode: 500 };
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = { message: 'Invalid token', statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    error = { message: 'Token expired', statusCode: 401 };
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    error = { message: messages.join(', '), statusCode: 400 };
  }

  // Cast errors (invalid ID format)
  if (err.name === 'CastError') {
    error = { message: 'Resource not found', statusCode: 404 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err.details 
    })
  });
};

module.exports = { errorHandler };
