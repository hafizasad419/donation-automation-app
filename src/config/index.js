import 'dotenv/config'

// Server Configuration
export const PORT = process.env.PORT || 5000;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const DEBUG = process.env.DEBUG === 'true';

// App Configuration
export const APP_BASE_URL = process.env.APP_BASE_URL;

// Twilio Configuration
export const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
export const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
export const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
export const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;

// Upstash Redis Configuration
export const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
export const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Upstash QStash Configuration
export const QSTASH_URL = process.env.QSTASH_URL;
export const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
export const QSTASH_CURRENT_SIGNING_KEY = process.env.QSTASH_CURRENT_SIGNING_KEY;
export const QSTASH_NEXT_SIGNING_KEY = process.env.QSTASH_NEXT_SIGNING_KEY;

// Google Sheets Configuration
export const SHEET_ID = process.env.SHEET_ID;
export const SHEET_RANGE_DONATIONS = process.env.SHEET_RANGE_DONATIONS;
export const SHEET_RANGE_MESSAGES = process.env.SHEET_RANGE_MESSAGES;
export const GOOGLE_SERVICE_EMAIL = process.env.GOOGLE_SERVICE_EMAIL;
export const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;


// messagecollab
export const MESSAGECOLLAB_ACCOUNT_ID = process.env.MESSAGECOLLAB_ACCOUNT_ID; 
export const MESSAGECOLLAB_PHONE_NUMBER = process.env.MESSAGECOLLAB_PHONE_NUMBER;
export const MESSAGECOLLAB_TOKEN = process.env.MESSAGECOLLAB_TOKEN;

// Optional Configuration
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

// Lambda check (for Vercel deployment)
export const IS_LAMBDA = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

// Validation function to check required environment variables
export function validateEnvironment() {
  const required = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'QSTASH_TOKEN',
    'SHEET_ID',
    'SHEET_RANGE_DONATIONS',
    'SHEET_RANGE_MESSAGES',
    'GOOGLE_SERVICE_EMAIL',
    'GOOGLE_PRIVATE_KEY',
    'APP_BASE_URL',
    'MESSAGECOLLAB_ACCOUNT_ID',
    'MESSAGECOLLAB_PHONE_NUMBER',
    'MESSAGECOLLAB_TOKEN'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  return true;
}
