# CLI Test Runner Usage Guide

## Quick Start

```bash
# Interactive CLI test (recommended)
npm run test:cli

# Automated flow test (demonstration)
npm run test:flow

# Test setup verification
npm run test:setup
```

## Interactive CLI Test (`npm run test:cli`)

The interactive CLI test provides a menu-driven interface to test the donation bot:

### Menu Options

1. **📱 Send a message to the bot**
   - Type any message to simulate user input
   - Bot will respond using the same logic as production
   - Messages are logged to Google Sheets and Redis

2. **📊 View current session state**
   - Shows the current Redis session data
   - Displays step number, collected data, and timestamps

3. **📝 View conversation history**
   - Shows all messages exchanged in the current session
   - Includes timestamps and message directions

4. **🔄 Start new conversation**
   - Clears the current session and starts fresh
   - Useful for testing multiple donation flows

5. **⏰ Test inactivity check**
   - Simulates the QStash timeout functionality
   - Tests the inactivity handling logic

6. **🧹 Clear session**
   - Removes session data from Redis
   - Clears conversation history

7. **❌ Exit**
   - Gracefully exits the test runner

### Example Session

```
🚀 SMS DONATION BOT - CLI TEST MODE
══════════════════════════════════════════════════

? What would you like to do? 📱 Send a message to the bot
? Enter your message: Hi

👤 USER MESSAGE:
📱 From: +1234567890
💬 Message: Hi
⏰ Time: 2025-10-20T02:47:36.290Z
──────────────────────────────────────────────────
🤖 BOT REPLY: Hello! Thank you for your interest in making a donation. Let's begin — what's the congregation or organization name?
✅ Incoming message logged to Google Sheets

? What would you like to do? 📱 Send a message to the bot
? Enter your message: Bais Shalom

👤 USER MESSAGE:
📱 From: +1234567890
💬 Message: Bais Shalom
⏰ Time: 2025-10-20T02:47:45.123Z
──────────────────────────────────────────────────
🤖 BOT REPLY: Got it — the congregation is Bais Shalom. Now, what's the person's full name?
✅ Incoming message logged to Google Sheets

? What would you like to do? 📊 View current session state

📊 CURRENT SESSION STATE:
   Step: 2
   Data: {
     "congregation": "Bais Shalom"
   }
   Last Message: 2025-10-20T02:47:45.123Z
```

## Automated Flow Test (`npm run test:flow`)

The automated flow test runs a complete donation flow programmatically:

```bash
npm run test:flow
```

This will automatically:
1. Send "Hi" → Bot responds with greeting
2. Send "Bais Shalom" → Bot asks for person name
3. Send "John Doe" → Bot asks for phone number
4. Send "1234567890" → Bot asks for Tax ID
5. Send "123456789" → Bot asks for amount
6. Send "100" → Bot shows confirmation summary
7. Send "Yes, that's correct" → Bot saves donation and sends success message

## Test Setup Verification (`npm run test:setup`)

Verifies that the test environment is properly configured:

```bash
npm run test:setup
```

## Features

### ✅ What Works in Tests

- **Full Bot Logic**: All controllers, services, and validators
- **Redis Sessions**: Real session storage and retrieval
- **Google Sheets Logging**: Real message logging to sheets
- **Input Validation**: All Zod validation schemas
- **Step Progression**: Complete donation flow logic
- **Error Handling**: All error scenarios and recovery

### 🔄 What's Mocked

- **Twilio SMS**: Messages displayed in CLI instead of sent via SMS
- **QStash**: Bypassed in development mode (same as production)
- **HTTP Responses**: Mock request/response objects

### 📊 What's Preserved

- **Session Management**: Real Redis operations
- **Data Persistence**: Real Google Sheets integration
- **Business Logic**: All donation flow logic
- **Validation**: All input validation rules
- **Error Handling**: All error scenarios

## Troubleshooting

### Common Issues

1. **Import Errors**: Make sure you're running from the project root
2. **Redis Connection**: Ensure Redis environment variables are set
3. **Sheets Connection**: Ensure Google Sheets credentials are configured
4. **Module Not Found**: Run `npm install` to ensure all dependencies are installed

### Debug Mode

The CLI test includes extensive logging to help debug issues:
- Session state changes
- Message processing steps
- Redis operations
- Google Sheets logging
- Error handling

## File Structure

```
test/
├── cli-test.js          # Interactive CLI test runner
├── example-flow.js      # Automated flow demonstration
├── tf-simple.js        # Setup verification
├── README.md           # Overview documentation
└── USAGE.md           # This usage guide
```

## Environment Requirements

Same as production:
- Redis environment variables
- Google Sheets credentials
- All npm dependencies installed
- Node.js with ES modules support
