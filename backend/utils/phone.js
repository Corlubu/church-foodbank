// backend/utils/phone.js

/**
 * Normalizes a phone number to E.164 format (e.g., +1234567890)
 * @param {string} phone - The phone number to normalize
 * @returns {string} The normalized phone number
 * @throws {Error} If the phone number is invalid
 */
const normalizePhone = (phone) => {
  if (!phone) throw new Error('Phone number is required');
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  if (cleaned.startsWith('+')) {
    // Already in some E.164-like format
    return cleaned;
  }
  
  if (cleaned.length === 10) {
    // Assume US/Canada
    return '+1' + cleaned;
  }
  
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // Assume US/Canada with '1' prefix
    return '+' + cleaned;
  }
  
  // Could add more country-specific rules here if needed
  
  throw new Error('Invalid phone number format. Use +1234567890 or 1234567890 format.');
};

module.exports = { normalizePhone };
