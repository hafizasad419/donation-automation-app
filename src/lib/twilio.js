import twilio from "twilio";
import { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID, TWILIO_PHONE_NUMBER } from "../config/index.js";
// Twilio client instance (lazy initialization)
let twilioClientInstance = null;

// Get Twilio client (lazy initialization)
export function getTwilioClient() {
  if (!twilioClientInstance) {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_MESSAGING_SERVICE_SID || !TWILIO_PHONE_NUMBER) {
      throw new Error('Twilio configuration missing: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required');
    }
    
    twilioClientInstance = twilio(
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN
    );
  }
  return twilioClientInstance;
}

// Backward compatibility - export twilioClient as a getter
export const twilioClient = new Proxy({}, {
  get(target, prop) {
    const client = getTwilioClient();
    if (typeof client[prop] === 'function') {
      return client[prop].bind(client);
    }
    return client[prop];
  }
});

/**
 * Send SMS message using Twilio
 * @param {string} to - Phone number to send to
 * @param {string} body - Message body
 * @returns {Promise<Object>} Twilio message object
 */
export async function sendSms(to, body) {
  try {
    console.log(`📤 Sending SMS to ${to}: ${body}`);
    
    const client = getTwilioClient();
    const messageOptions = {
      body,
      to,
    };

    // Use messaging service if available, otherwise use phone number
    if (TWILIO_MESSAGING_SERVICE_SID) {
      messageOptions.messagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;
    } else if (TWILIO_PHONE_NUMBER) {
      messageOptions.from = TWILIO_PHONE_NUMBER;
    } else {
      throw new Error('No Twilio messaging service or phone number configured');
    }

    const message = await client.messages.create(messageOptions);

    console.log(`✅ SMS sent successfully. SID: ${message.sid}`);
    console.log(`📊 Message details: Status: ${message.status}, Direction: ${message.direction}, To: ${message.to}, From: ${message.from}`);
    console.log(`📝 Message body preview: ${body.substring(0, 100)}${body.length > 100 ? '...' : ''}`);
    return message;
  } catch (error) {
    console.error('❌ Failed to send SMS:', error);
    throw error;
  }
}

/**
 * Validate Twilio webhook signature (optional security enhancement)
 * @param {string} signature - Twilio signature header
 * @param {string} url - Webhook URL
 * @param {Object} params - Request parameters
 * @returns {boolean} Whether signature is valid
 */
export function validateWebhookSignature(signature, url, params) {
  try {
    return twilio.validateRequest(
      TWILIO_AUTH_TOKEN,
      signature,
      url,
      params
    );
  } catch (error) {
    console.error('❌ Webhook signature validation failed:', error);
    return false;
  }
}

/**
 * Test Twilio connection
 * @returns {Promise<boolean>} Connection status
 */
export async function testConnection() {
  try {
    const client = getTwilioClient();
    const account = await client.api.accounts(TWILIO_ACCOUNT_SID).fetch();
    console.log('✅ Twilio connection successful');
    console.log(`Account: ${account.friendlyName}`);
    return true;
  } catch (error) {
    console.error('❌ Twilio connection failed:', error);
    return false;
  }
}
