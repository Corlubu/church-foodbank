// backend/config/db.js
const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
  if (isProduction && pool.options.ssl.rejectUnauthorized === false) {
    console.warn(
      '\n' +
      '========================================\n' +
      '⚠️  SECURITY WARNING ⚠️\n' +
      'Database SSL is set to "rejectUnauthorized: false".\n' +
      'This is insecure and vulnerable to man-in-the-middle attacks.\n' +
      'Only use this if you cannot validate the DB certificate.\n' +
      'For Render internal databases, you should be able to remove this line.\n' +
      '========================================\n'
    );
  }
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool: pool,
};
