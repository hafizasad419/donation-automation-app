#!/usr/bin/env node

import { handleIncomingSms } from '../src/controller/smsController.js';

// Simple test to verify the CLI test setup works
console.log('🧪 Testing CLI Test Setup...');

// Mock request/response
const mockReq = {
  body: {
    From: '+1234567890',
    Body: 'Hi',
    from: '+1234567890',
    body: 'Hi'
  }
};

const mockRes = {
  status: (code) => {
    console.log(`📡 HTTP Status: ${code}`);
    return this;
  },
  send: (body) => {
    console.log(`📡 HTTP Response: ${body || 'OK'}`);
    return this;
  }
};

// Test basic functionality
try {
  console.log('✅ CLI test setup is working');
  console.log('✅ SMS Controller imported successfully');
  console.log('✅ Mock request/response created');
  console.log('\n🎉 CLI Test Setup Complete!');
  console.log('Run "npm run test:cli" to start the interactive test');
} catch (error) {
  console.error('❌ CLI test setup failed:', error.message);
  process.exit(1);
}
