#!/usr/bin/env node

import inquirer from 'inquirer';
import { handleIncomingSms } from '../src/controller/smsController.js';
import { getSession, deleteSession } from '../src/lib/redis.js';
import { logMessage } from '../src/lib/sheets.js';

// Mock Twilio SMS function for CLI testing
let mockMessages = [];

// Override the sendSms function to capture messages instead of sending them
async function mockSendSms(to, body) {
  const message = {
    to,
    body,
    timestamp: new Date().toISOString(),
    direction: 'outbound'
  };
  mockMessages.push(message);
  console.log(`🤖 BOT REPLY: ${body}`);
  return { sid: 'MOCK-' + Date.now() };
}

// Override the logTwilio function for CLI testing
function mockLogTwilio(action, phone, success) {
  console.log(`📱 [MOCK TWILIO] ${action} to ${phone}: ${success ? 'Success' : 'Failed'}`);
}

// Mock request/response objects for the SMS controller
function createMockRequest(body, from = '+1234567890') {
  return {
    body: {
      From: from,
      Body: body,
      from: from,
      body: body
    }
  };
}

function createMockResponse() {
  let statusCode = 200;
  let responseBody = '';
  
  return {
    status: (code) => {
      statusCode = code;
      return this;
    },
    send: (body) => {
      responseBody = body;
      console.log(`📡 HTTP Response: ${statusCode} - ${responseBody || 'OK'}`);
      return this;
    }
  };
}

// Test session management
async function showSessionState(phone) {
  try {
    const session = await getSession(phone);
    if (session) {
      console.log('\n📊 CURRENT SESSION STATE:');
      console.log(`   Step: ${session.step}`);
      console.log(`   Data:`, JSON.stringify(session.data, null, 2));
      console.log(`   Last Message: ${new Date(session.lastMessageAt).toISOString()}`);
    } else {
      console.log('\n📊 No active session found');
    }
  } catch (error) {
    console.log('\n❌ Error retrieving session:', error.message);
  }
}

// Show conversation history
function showConversationHistory() {
  console.log('\n📝 CONVERSATION HISTORY:');
  if (mockMessages.length === 0) {
    console.log('   No messages yet');
    return;
  }
  
  mockMessages.forEach((msg, index) => {
    const direction = msg.direction === 'inbound' ? '👤 USER' : '🤖 BOT';
    const time = new Date(msg.timestamp).toLocaleTimeString();
    console.log(`   ${index + 1}. ${direction}: ${msg.body} (${time})`);
  });
}

// Clear session
async function clearSession(phone) {
  try {
    await deleteSession(phone);
    mockMessages = [];
    console.log('\n🧹 Session cleared successfully');
  } catch (error) {
    console.log('\n❌ Error clearing session:', error.message);
  }
}

// Simulate inactivity check
async function testInactivityCheck(phone) {
  console.log('\n⏰ Testing inactivity check...');
  try {
    // Import the inactivity check handler
    const { handleInactivityCheck } = await import('../src/controller/smsController.js');
    
    const mockReq = {
      body: { phone }
    };
    
    const mockRes = createMockResponse();
    
    await handleInactivityCheck(mockReq, mockRes);
    console.log('✅ Inactivity check completed');
  } catch (error) {
    console.log('❌ Inactivity check failed:', error.message);
  }
}

// Main CLI interface
async function startCLITest() {
  console.log('🚀 SMS DONATION BOT - CLI TEST MODE');
  console.log('══════════════════════════════════════════════════');
  console.log('This will simulate the SMS donation flow without using Twilio.');
  console.log('All functionality (Redis, Sheets, QStash) will work normally.\n');
  
  const testPhone = '+1234567890';
  
  while (true) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          '📱 Send a message to the bot',
          '📊 View current session state',
          '📝 View conversation history',
          '🔄 Start new conversation',
          '⏰ Test inactivity check',
          '🧹 Clear session',
          '❌ Exit'
        ]
      }
    ]);
    
    switch (action) {
      case '📱 Send a message to the bot':
        await sendMessageToBot(testPhone);
        break;
      case '📊 View current session state':
        await showSessionState(testPhone);
        break;
      case '📝 View conversation history':
        showConversationHistory();
        break;
      case '🔄 Start new conversation':
        await clearSession(testPhone);
        console.log('✅ New conversation started');
        break;
      case '⏰ Test inactivity check':
        await testInactivityCheck(testPhone);
        break;
      case '🧹 Clear session':
        await clearSession(testPhone);
        break;
      case '❌ Exit':
        console.log('👋 Goodbye!');
        process.exit(0);
    }
    
    console.log(''); // Add spacing
  }
}

// Send message to bot
async function sendMessageToBot(phone) {
  try {
    const { message } = await inquirer.prompt([
      {
        type: 'input',
        name: 'message',
        message: 'Enter your message:'
      }
    ]);
    
    console.log('\n👤 USER MESSAGE:');
    console.log(`📱 From: ${phone}`);
    console.log(`💬 Message: ${message}`);
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    console.log('──────────────────────────────────────────────────');
    
    // Add user message to history
    mockMessages.push({
      to: phone,
      body: message,
      timestamp: new Date().toISOString(),
      direction: 'inbound'
    });
    
    // Create mock request and response
    const mockReq = createMockRequest(message, phone);
    const mockRes = createMockResponse();
    
    // Store original functions
    const twilioModule = await import('../src/lib/twilio.js');
    const loggerModule = await import('../src/lib/logger.js');
    const originalSendSms = twilioModule.sendSms;
    const originalLogTwilio = loggerModule.logTwilio;
    
    // Temporarily replace functions by deleting and redefining
    delete twilioModule.sendSms;
    delete loggerModule.logTwilio;
    
    twilioModule.sendSms = mockSendSms;
    loggerModule.logTwilio = mockLogTwilio;
    
    // Process the message through the SMS controller
    await handleIncomingSms(mockReq, mockRes);
    
    // Restore original functions
    twilioModule.sendSms = originalSendSms;
    loggerModule.logTwilio = originalLogTwilio;
    
    // Log to sheets (this will work normally)
    await logMessage(phone, message, 'inbound', null);
    console.log('✅ Incoming message logged to Google Sheets');
    
  } catch (error) {
    console.log('❌ Error processing message:', error.message);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  process.exit(0);
});

// Start the CLI test
startCLITest().catch(error => {
  console.error('❌ CLI Test Error:', error);
  process.exit(1);
});
