import dotenv from 'dotenv';
import { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID, TWILIO_PHONE_NUMBER } from '../src/config/index.js';

// Load environment variables
dotenv.config();

console.log('🔍 Twilio Configuration Debug');
console.log('============================');

// Check if variables are set (without showing values)
console.log(`TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID ? '✅ SET' : '❌ NOT SET'}`);
console.log(`TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN ? '✅ SET' : '❌ NOT SET'}`);
console.log(`TWILIO_MESSAGING_SERVICE_SID: ${TWILIO_MESSAGING_SERVICE_SID ? '✅ SET' : '❌ NOT SET'}`);
console.log(`TWILIO_PHONE_NUMBER: ${TWILIO_PHONE_NUMBER ? '✅ SET' : '❌ NOT SET'}`);

// Check credential format
if (TWILIO_ACCOUNT_SID) {
  console.log(`Account SID format: ${TWILIO_ACCOUNT_SID.startsWith('AC') ? '✅ Valid format' : '❌ Invalid format (should start with AC)'}`);
  console.log(`Account SID length: ${TWILIO_ACCOUNT_SID.length} characters`);
}

if (TWILIO_AUTH_TOKEN) {
  console.log(`Auth Token length: ${TWILIO_AUTH_TOKEN.length} characters`);
  console.log(`Auth Token format: ${TWILIO_AUTH_TOKEN.length === 32 ? '✅ Correct length' : '❌ Incorrect length (should be 32 chars)'}`);
}

// Test the actual connection with detailed error info
console.log('\n🧪 Testing Twilio Connection...');
console.log('==============================');

try {
  const twilio = await import('twilio');
  const client = twilio.default(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  
  console.log('📞 Attempting to fetch account info...');
  const account = await client.api.accounts(TWILIO_ACCOUNT_SID).fetch();
  
  console.log('✅ Twilio connection successful!');
  console.log(`Account Name: ${account.friendlyName}`);
  console.log(`Account Status: ${account.status}`);
  console.log(`Account Type: ${account.type}`);
  
} catch (error) {
  console.log('❌ Twilio connection failed!');
  console.log(`Error Code: ${error.code}`);
  console.log(`Error Status: ${error.status}`);
  console.log(`Error Message: ${error.message}`);
  
  if (error.code === 20003) {
    console.log('\n💡 Error 20003 means "Authenticate" - this indicates:');
    console.log('   - Invalid Account SID or Auth Token');
    console.log('   - Credentials are incorrect or expired');
    console.log('   - Account might be suspended');
  }
  
  if (error.moreInfo) {
    console.log(`More Info: ${error.moreInfo}`);
  }
}
