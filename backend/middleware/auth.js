// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      
      // ✨ ENHANCEMENT: Log successful decoding (Optional)
      console.log(`✅ JWT decoded for UserID: ${decoded.userId}, Role: ${decoded.role}`);
      
      next();
    } catch (error) {
      console.error('JWT verification failed:', error.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } else {
    return res.status(401).json({ error: 'Authorization token required' });
  }
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.warn(`Unauthorized access attempt by ${req.user.role} to ${req.method} ${req.path}`);
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

module.exports = { authenticateJWT, authorizeRoles };
