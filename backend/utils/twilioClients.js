// backend/utils/twilioClient.js
const twilio = require('twilio');

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Send an SMS message via Twilio
 * @param {string} to - Recipient phone number
 * @param {string} body - Message content
 * @returns {Promise<{ success: boolean, sid?: string, error?: string }>}
 */
async function sendSMS(to, body) {
  // Validate inputs
  if (!to || !body) {
    return { success: false, error: 'Missing "to" or "body" parameters' };
  }

  // Basic phone validation
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  if (!phoneRegex.test(to)) {
    return { success: false, error: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)' };
  }

  if (body.length > 1600) {
    return { success: false, error: 'Message too long (max 1600 characters)' };
  }

  if (!process.env.TWILIO_PHONE_NUMBER) {
    return { success: false, error: 'Twilio phone number not configured' };
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
    
    // Handle specific Twilio error codes
    let userMessage = 'Failed to send SMS';
    
    if (err.code === 21211) {
      userMessage = 'Invalid phone number';
    } else if (err.code === 21408) {
      userMessage = 'Twilio account not authorized to send to this number';
    } else if (err.code === 21610) {
      userMessage = 'Phone number cannot receive SMS messages';
    } else if (err.code === 21614) {
      userMessage = 'Phone number is not SMS capable';
    }

    return {
      success: false,
      error: userMessage,
      details: err.message
    };
  }
}

module.exports = { sendSMS };
