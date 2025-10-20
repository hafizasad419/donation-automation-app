import dotenv from 'dotenv';
import { testConnection as testRedis } from '../src/lib/redis.js';
import { testConnection as testTwilio } from '../src/lib/twilio.js';
import { testConnection as testQStash } from '../src/lib/qstash.js';
import { testConnection as testSheets } from '../src/lib/sheets.js';

// Load environment variables
dotenv.config();

async function testAllConnections() {
  console.log('🧪 Testing all external connections...\n');
  
  const results = {
    redis: false,
    twilio: false,
    qstash: false,
    sheets: false
  };
  
  try {
    console.log('1. Testing Redis connection...');
    results.redis = await testRedis();
  } catch (error) {
    console.error('❌ Redis test failed:', error.message);
  }
  
  try {
    console.log('\n2. Testing Twilio connection...');
    results.twilio = await testTwilio();
  } catch (error) {
    console.error('❌ Twilio test failed:', error.message);
  }
  
  try {
    console.log('\n3. Testing QStash connection...');
    results.qstash = await testQStash();
  } catch (error) {
    console.error('❌ QStash test failed:', error.message);
  }
  
  try {
    console.log('\n4. Testing Google Sheets connection...');
    results.sheets = await testSheets();
  } catch (error) {
    console.error('❌ Google Sheets test failed:', error.message);
  }
  
  console.log('\n📊 Connection Test Results:');
  console.log('========================');
  console.log(`Redis: ${results.redis ? '✅ Connected' : '❌ Failed'}`);
  console.log(`Twilio: ${results.twilio ? '✅ Connected' : '❌ Failed'}`);
  console.log(`QStash: ${results.qstash ? '✅ Connected' : '❌ Failed'}`);
  console.log(`Sheets: ${results.sheets ? '✅ Connected' : '❌ Failed'}`);
  
  const allConnected = Object.values(results).every(Boolean);
  console.log(`\nOverall Status: ${allConnected ? '✅ All systems ready!' : '⚠️ Some connections failed'}`);
  
  if (!allConnected) {
    console.log('\n💡 Please check your environment variables and credentials.');
    process.exit(1);
  }
}

testAllConnections().catch(console.error);
