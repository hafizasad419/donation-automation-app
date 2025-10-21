import twilio from "twilio";
import axios from "axios";
import { 
  TWILIO_ACCOUNT_SID, 
  TWILIO_AUTH_TOKEN, 
  TWILIO_MESSAGING_SERVICE_SID, 
  TWILIO_PHONE_NUMBER,
  MESSAGECOLLAB_ACCOUNT_ID,
  MESSAGECOLLAB_PHONE_NUMBER,
  MESSAGECOLLAB_TOKEN
} from "../config/index.js";
import { MESSAGE_SENDING_PLATFORMS } from "../constants.js";
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
export async function sendSmsTwilio(to, body) {
  try {
    console.log(`📤 Sending SMS via Twilio to ${to}: ${body}`);
    
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

    console.log(`✅ SMS sent successfully via Twilio. SID: ${message.sid}`);
    console.log(`📊 Message details: Status: ${message.status}, Direction: ${message.direction}, To: ${message.to}, From: ${message.from}`);
    console.log(`📝 Message body preview: ${body.substring(0, 100)}${body.length > 100 ? '...' : ''}`);
    return message;
  } catch (error) {
    console.error('❌ Failed to send SMS via Twilio:', error);
    throw error;
  }
}

/**
 * Send SMS message using MessageCollab
 * @param {string} to - Phone number to send to
 * @param {string} body - Message body
 * @returns {Promise<Object>} MessageCollab response object
 */
export async function sendSmsMessageCollab(to, body) {
  try {
    console.log(`📤 Sending SMS via MessageCollab to ${to}: ${body}`);
    
    if (!MESSAGECOLLAB_ACCOUNT_ID || !MESSAGECOLLAB_PHONE_NUMBER || !MESSAGECOLLAB_TOKEN) {
      throw new Error('MessageCollab configuration missing: MESSAGECOLLAB_ACCOUNT_ID, MESSAGECOLLAB_PHONE_NUMBER, and MESSAGECOLLAB_TOKEN are required');
    }

    // Ensure phone numbers are in the correct format (+1XXXXXXXXXX)
    const formattedFrom = MESSAGECOLLAB_PHONE_NUMBER.startsWith('+') ? MESSAGECOLLAB_PHONE_NUMBER : `+1${MESSAGECOLLAB_PHONE_NUMBER}`;
    const formattedTo = to.startsWith('+') ? to : `+1${to}`;

    const response = await axios.post(
      `https://messaging.entpher.io/api/v1/sms/${MESSAGECOLLAB_ACCOUNT_ID}`,
      {
        from: formattedFrom,
        to: formattedTo,
        message: body,
        displayInPortal: true
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${MESSAGECOLLAB_TOKEN}`
        }
      }
    );

    console.log(`✅ SMS sent successfully via MessageCollab. mId: ${response.data.mId}`);
    console.log(`📊 Message details: mId: ${response.data.mId}, message: ${response.data.message}`);
    console.log(`📝 Message body preview: ${body.substring(0, 100)}${body.length > 100 ? '...' : ''}`);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to send SMS via MessageCollab:', error);
    throw error;
  }
}

/**
 * Send SMS message using the configured platform (Twilio or MessageCollab)
 * @param {string} to - Phone number to send to
 * @param {string} body - Message body
 * @param {string} platform - Platform to use (optional, defaults to configured platform)
 * @returns {Promise<Object>} Message response object
 */
export async function sendSms(to, body, platform = MESSAGE_SENDING_PLATFORMS.MESSAGECOLLAB) {
  try {
    // Determine which platform to use
    const selectedPlatform = platform || process.env.MESSAGE_SENDING_PLATFORM || MESSAGE_SENDING_PLATFORMS.TWILIO;
    
    console.log(`📤 Sending SMS via ${selectedPlatform} to ${to}: ${body}`);
    
    switch (selectedPlatform) {
      case MESSAGE_SENDING_PLATFORMS.MESSAGECOLLAB:
        return await sendSmsMessageCollab(to, body);
      case MESSAGE_SENDING_PLATFORMS.TWILIO:
      default:
        return await sendSmsTwilio(to, body);
    }
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

/**
 * Test MessageCollab connection
 * @returns {Promise<boolean>} Connection status
 */
export async function testMessageCollabConnection() {
  try {
    if (!MESSAGECOLLAB_ACCOUNT_ID || !MESSAGECOLLAB_TOKEN) {
      throw new Error('MessageCollab configuration missing: MESSAGECOLLAB_ACCOUNT_ID and MESSAGECOLLAB_TOKEN are required');
    }

    // Test connection by making a simple API call
    const response = await axios.get(
      `https://messaging.entpher.io/api/v1/sms/${MESSAGECOLLAB_ACCOUNT_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${MESSAGECOLLAB_TOKEN}`,
          'Accept': 'application/json'
        }
      }
    );

    console.log('✅ MessageCollab connection successful');
    console.log(`Account ID: ${MESSAGECOLLAB_ACCOUNT_ID}`);
    return true;
  } catch (error) {
    console.error('❌ MessageCollab connection failed:', error.message);
    return false;
  }
}
