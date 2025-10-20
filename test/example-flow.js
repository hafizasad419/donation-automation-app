#!/usr/bin/env node

/**
 * Example script showing how to programmatically test the donation flow
 * This demonstrates the same functionality as the interactive CLI test
 */

import { handleIncomingSms } from '../src/controller/smsController.js';
import { getSession, deleteSession } from '../src/lib/redis.js';
import { logMessage } from '../src/lib/sheets.js';
import inquirer from 'inquirer';

// Mock functions for testing
let conversationHistory = [];

async function mockSendSms(to, body) {
  const message = {
    to,
    body,
    timestamp: new Date().toISOString(),
    direction: 'outbound'
  };
  conversationHistory.push(message);
  console.log(`🤖 BOT: ${body}`);
  return { sid: 'MOCK-' + Date.now() };
}

function mockLogTwilio(action, phone, success) {
  // Silent in automated test
}

// Process message with mocked functions
async function processMessageWithMocks(req, res, message, phone) {
  try {
    const from = req.body.From || req.body.from;
    const body = (req.body.Body || req.body.body || "").trim();
    
    if (!from || !body) {
      return res.status(400).send("Missing required fields");
    }
    
    // Get or create session
    const { getSession, setSession, getQStashJob, setQStashJob, deleteQStashJob } = await import('../src/lib/redis.js');
    const { scheduleTimeout, cancelScheduledJob } = await import('../src/lib/qstash.js');
    const { logMessage } = await import('../src/lib/sheets.js');
    const { STEPS, COMMANDS, MESSAGES, TIMEOUT_MS } = await import('../src/constants.js');
    
    let session = await getSession(from);
    if (!session) {
      session = { 
        step: STEPS.GREETING, 
        data: {}, 
        lastMessageAt: Date.now() 
      };
      await setSession(from, session);
    }
    
    // Cancel previous scheduled timeout job
    const prevJobId = await getQStashJob(from);
    if (prevJobId) {
      await cancelScheduledJob(prevJobId);
      await deleteQStashJob(from);
    }
    
    // Handle special commands first
    if (COMMANDS.GREETING.test(body) && session.step === STEPS.GREETING) {
      const result = await handleGreetingMock(from, body, session);
      if (result) {
        session = result;
      }
      return res.status(200).send("");
    }
    
    // If user is at greeting step but didn't send a greeting, treat as congregation input
    if (session.step === STEPS.GREETING && !COMMANDS.GREETING.test(body)) {
      session.step = STEPS.CONGREGATION;
      session.lastMessageAt = Date.now();
      await setSession(from, session);
    }
    
    // Handle normal step flow
    let result = null;
    
    switch (session.step) {
      case STEPS.GREETING:
        result = await handleGreetingMock(from, body, session);
        break;
      case STEPS.CONGREGATION:
        result = await handleCongregationMock(from, body, session);
        break;
      case STEPS.PERSON_NAME:
        result = await handlePersonNameMock(from, body, session);
        break;
      case STEPS.PHONE_NUMBER:
        result = await handlePhoneNumberMock(from, body, session);
        break;
      case STEPS.TAX_ID:
        result = await handleTaxIdMock(from, body, session);
        break;
      case STEPS.AMOUNT:
        result = await handleAmountMock(from, body, session);
        break;
      case STEPS.CONFIRMATION:
        result = await handleConfirmationMock(from, body, session);
        break;
      default:
        // Start over if unknown step
        await mockSendSms(from, MESSAGES.START);
        session.step = STEPS.CONGREGATION;
        await setSession(from, session);
    }
    
    if (result) {
      session = result;
    }
    
    // Respond to Twilio webhook
    res.status(200).send("");
    
  } catch (error) {
    console.error('❌ SMS Controller error:', error);
    
    // Try to send error message to user
    try {
      const from = req.body.From || req.body.from;
      if (from) {
        await mockSendSms(from, "Sorry, there was an error processing your message. Please try again.");
      }
    } catch (smsError) {
      console.error('❌ Failed to send error SMS:', smsError);
    }
    
    res.status(500).send("Internal server error");
  }
}

// Mock step handlers that use our mock functions
async function handleGreetingMock(phone, text, session) {
  try {
    // Send greeting message and move to congregation step
    session.step = 1; // STEPS.CONGREGATION
    session.lastMessageAt = Date.now();
    
    const { setSession } = await import('../src/lib/redis.js');
    await setSession(phone, session);
    
    // Send greeting message
    const { MESSAGES } = await import('../src/constants.js');
    await mockSendSms(phone, MESSAGES.GREETING);
    
    return session;
  } catch (error) {
    console.error('❌ Step 0 (Greeting) error:', error);
    await mockSendSms(phone, "Hello! Thank you for reaching out. Let's begin — what's the congregation or organization name?");
    return session;
  }
}

async function handleCongregationMock(phone, text, session) {
  try {
    const { congregationSchema } = await import('../src/validator/step01.zod.js');
    const { MESSAGES, STEPS } = await import('../src/constants.js');
    
    // Parse and validate congregation name
    const congregation = congregationSchema.parse(text);
    
    // Update session
    session.data.congregation = congregation;
    session.step = STEPS.PERSON_NAME;
    session.lastMessageAt = Date.now();
    
    const { setSession } = await import('../src/lib/redis.js');
    await setSession(phone, session);
    
    // Send success response
    const response = MESSAGES.CONGREGATION_SUCCESS.replace("{congregation}", congregation);
    await mockSendSms(phone, response);
    
    return session;
  } catch (error) {
    const { MESSAGES } = await import('../src/constants.js');
    await mockSendSms(phone, MESSAGES.CONGREGATION_INVALID);
    return session;
  }
}

async function handlePersonNameMock(phone, text, session) {
  try {
    const { personNameSchema } = await import('../src/validator/step02.zod.js');
    const { MESSAGES, STEPS } = await import('../src/constants.js');
    
    // Validate the person name
    const parsed = personNameSchema.parse(text);
    
    // Update session
    session.data.personName = parsed;
    session.step = STEPS.PHONE_NUMBER;
    session.lastMessageAt = Date.now();
    
    const { setSession } = await import('../src/lib/redis.js');
    await setSession(phone, session);
    
    // Send success message
    const successMessage = MESSAGES.NAME_SUCCESS.replace("{person_name}", parsed);
    await mockSendSms(phone, successMessage);
    
    return session;
  } catch (error) {
    const { MESSAGES } = await import('../src/constants.js');
    await mockSendSms(phone, MESSAGES.NAME_INVALID);
    return session;
  }
}

async function handlePhoneNumberMock(phone, text, session) {
  try {
    const { phoneNumberSchema } = await import('../src/validator/step03.zod.js');
    const { MESSAGES, STEPS } = await import('../src/constants.js');
    
    // Validate the phone number
    const parsed = phoneNumberSchema.parse(text);
    
    // Update session
    session.data.personPhone = parsed;
    session.step = STEPS.TAX_ID;
    session.lastMessageAt = Date.now();
    
    const { setSession } = await import('../src/lib/redis.js');
    await setSession(phone, session);
    
    // Send success message
    const successMessage = MESSAGES.PHONE_SUCCESS.replace("{phone}", parsed);
    await mockSendSms(phone, successMessage);
    
    return session;
  } catch (error) {
    const { MESSAGES } = await import('../src/constants.js');
    await mockSendSms(phone, MESSAGES.PHONE_INVALID);
    return session;
  }
}

async function handleTaxIdMock(phone, text, session) {
  try {
    const { taxIdSchema } = await import('../src/validator/step04.zod.js');
    const { MESSAGES, STEPS } = await import('../src/constants.js');
    
    // Validate the Tax ID
    const parsed = taxIdSchema.parse(text);
    
    // Update session
    session.data.taxId = parsed;
    session.step = STEPS.AMOUNT;
    session.lastMessageAt = Date.now();
    
    const { setSession } = await import('../src/lib/redis.js');
    await setSession(phone, session);
    
    // Send success message
    const successMessage = MESSAGES.TAXID_SUCCESS.replace("{tax_id}", parsed);
    await mockSendSms(phone, successMessage);
    
    return session;
  } catch (error) {
    const { MESSAGES } = await import('../src/constants.js');
    await mockSendSms(phone, MESSAGES.TAXID_INVALID);
    return session;
  }
}

async function handleAmountMock(phone, text, session) {
  try {
    const { amountSchema } = await import('../src/validator/step05.zod.js');
    const { MESSAGES, STEPS } = await import('../src/constants.js');
    
    // Validate the amount
    const parsed = amountSchema.parse(text);
    
    // Update session
    session.data.amount = parsed.formatted;
    session.data.amountNumeric = parsed.numeric;
    session.step = STEPS.CONFIRMATION;
    session.lastMessageAt = Date.now();
    
    const { setSession } = await import('../src/lib/redis.js');
    await setSession(phone, session);
    
    // Send confirmation summary
    const summaryMessage = MESSAGES.CONFIRMATION_SUMMARY
      .replace("{congregation}", session.data.congregation || "")
      .replace("{person_name}", session.data.personName || "")
      .replace("{tax_id}", session.data.taxId || "")
      .replace("{amount}", parsed.formatted);
    
    await mockSendSms(phone, summaryMessage);
    
    return session;
  } catch (error) {
    const { MESSAGES } = await import('../src/constants.js');
    await mockSendSms(phone, MESSAGES.AMOUNT_INVALID);
    return session;
  }
}

async function handleConfirmationMock(phone, text, session) {
  try {
    const { COMMANDS, MESSAGES } = await import('../src/constants.js');
    const { appendDonationRecord, generateRecordId } = await import('../src/lib/sheets.js');
    const { deleteSession } = await import('../src/lib/redis.js');
    
    // Check if user confirmed
    if (COMMANDS.YES.test(text)) {
      // Generate record ID and save to sheets
      const recordId = generateRecordId();
      const record = [
        recordId,
        session.data.congregation || "",
        session.data.personName || "",
        session.data.personPhone || "",
        session.data.taxId || "",
        session.data.amount || "",
        session.data.amountNumeric || 0
      ];
      
      await appendDonationRecord(record);
      
      // Send success message
      const successMessage = MESSAGES.CONFIRMATION_SUCCESS.replace("{record_id}", recordId);
      await mockSendSms(phone, successMessage);
      
      // Clear session
      await deleteSession(phone);
      
      return null; // Session cleared
    } else {
      // Invalid response
      await mockSendSms(phone, MESSAGES.CONFIRMATION_CHANGE);
      return session;
    }
  } catch (error) {
    console.error('❌ Step 6 (Confirmation) error:', error);
    await mockSendSms(phone, "Sorry, there was an error processing your donation. Please try again.");
    return session;
  }
}

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
  return {
    status: (code) => ({ send: (body) => console.log(`📡 HTTP ${code}: ${body || 'OK'}`) }),
    send: (body) => console.log(`📡 HTTP Response: ${body || 'OK'}`)
  };
}

async function simulateMessage(phone, message) {
  console.log(`\n👤 USER: ${message}`);
  console.log(`📱 From: ${phone}`);
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log('──────────────────────────────────────────────────');
  
  // Add user message to history
  conversationHistory.push({
    to: phone,
    body: message,
    timestamp: new Date().toISOString(),
    direction: 'inbound'
  });
  
  // Create mock request and response
  const mockReq = createMockRequest(message, phone);
  const mockRes = createMockResponse();
  
  try {
    // Process the message with mocked functions
    await processMessageWithMocks(mockReq, mockRes, message, phone);
    
    // Log to sheets
    await logMessage(phone, message, 'inbound', null);
    console.log('✅ Message logged to Google Sheets');
    
  } catch (error) {
    console.error('❌ Error processing message:', error.message);
  }
}

async function showSessionState(phone) {
  try {
    const session = await getSession(phone);
    if (session) {
      console.log('\n📊 SESSION STATE:');
      console.log(`   Step: ${session.step}`);
      console.log(`   Data:`, JSON.stringify(session.data, null, 2));
      console.log(`   Last Message: ${new Date(session.lastMessageAt).toISOString()}`);
    } else {
      console.log('\n📊 No active session');
    }
  } catch (error) {
    console.log('\n❌ Error retrieving session:', error.message);
  }
}

async function runInteractiveFlow() {
  console.log('🚀 SMS DONATION BOT - INTERACTIVE FLOW TEST');
  console.log('══════════════════════════════════════════════════');
  console.log('This allows you to test the donation flow interactively.\n');
  
  const testPhone = '+1234567890';
  
  try {
    // Clear any existing session
    await deleteSession(testPhone);
    conversationHistory = [];
    
    console.log('💡 Suggested flow: Hi → Bais Shalom → John Doe → 1234567890 → 123456789 → 100 → Yes, that\'s correct');
    console.log('💡 Or type any message to test the bot response.\n');
    
    while (true) {
      const { message } = await inquirer.prompt([
        {
          type: 'input',
          name: 'message',
          message: 'Enter your message (or "exit" to quit):'
        }
      ]);
      
      if (message.toLowerCase() === 'exit') {
        break;
      }
      
      if (message.toLowerCase() === 'session') {
        await showSessionState(testPhone);
        continue;
      }
      
      if (message.toLowerCase() === 'history') {
        console.log('\n📝 CONVERSATION HISTORY:');
        conversationHistory.forEach((msg, index) => {
          const direction = msg.direction === 'inbound' ? '👤 USER' : '🤖 BOT';
          const time = new Date(msg.timestamp).toLocaleTimeString();
          console.log(`   ${index + 1}. ${direction}: ${msg.body} (${time})`);
        });
        continue;
      }
      
      if (message.toLowerCase() === 'clear') {
        await deleteSession(testPhone);
        conversationHistory = [];
        console.log('🧹 Session cleared');
        continue;
      }
      
      await simulateMessage(testPhone, message);
      await showSessionState(testPhone);
    }
    
    console.log('\n🎉 INTERACTIVE FLOW TEST COMPLETED!');
    console.log(`📝 Total messages exchanged: ${conversationHistory.length}`);
    
  } catch (error) {
    console.error('❌ Flow test failed:', error.message);
  }
}

// Run the interactive flow
runInteractiveFlow().catch(error => {
  console.error('❌ Interactive Flow Error:', error);
  process.exit(1);
});
