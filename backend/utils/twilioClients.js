// backend/utils/twilioClient.js
const twilio = require('twilio');

// Initialize Twilio client once
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Send an SMS message via Twilio
 * @param {string} to - Recipient phone number in E.164 format (+1234567890)
 * @param {string} body - Message content (max 1600 chars)
 * @returns {Promise<{ success: boolean, sid?: string, error?: string }>}
 */
async function sendSMS(to, body) {
  // Validate inputs
  if (!to || !body) {
    return { success: false, error: 'Missing "to" or "body"' };
  }

  // Enforce E.164 format (basic check)
  if (!to.match(/^\+[1-9]\d{1,14}$/)) {
    return { success: false, error: 'Invalid phone number format. Use E.164 (e.g., +1234567890)' };
  }

  if (body.length > 1600) {
    return { success: false, error: 'Message too long (max 1600 characters)' };
  }

  try {
    const message = await client.messages.create({
      body: body.trim(),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });

    console.log(`✅ SMS sent to ${to} | SID: ${message.sid}`);
    return { success: true, sid: message.sid };
  } catch (err) {
    console.error(`❌ Twilio SMS failed to ${to}:`, err.message);
    return {
      success: false,
      error: err.message || 'Unknown Twilio error'
    };
  }
}

module.exports = { sendSMS };