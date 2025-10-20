# CLI Test Runner

This folder contains a CLI-based test runner for the SMS Donation Bot that simulates the conversation flow without using Twilio.

## Features

- **Interactive CLI Interface**: Uses `inquirer` for a user-friendly command-line interface
- **Full Bot Logic**: Reuses all existing bot logic (controllers, services, validators)
- **Real Side Effects**: 
  - ✅ Logs messages to Google Sheets
  - ✅ Stores session data in Redis
  - ✅ QStash functionality (bypassed in development mode)
- **Session Management**: View, clear, and manage user sessions
- **Conversation History**: Track the full conversation flow
- **Mock Twilio**: Captures bot responses without sending actual SMS

## Usage

### Start the CLI Test

```bash
npm run test:cli
```

### Interactive Flow Test

For a simpler interactive experience without menus:

```bash
npm run test:interactive
```

This provides a direct message input interface where you can:
- Type messages directly to the bot
- Use special commands: `session`, `history`, `clear`, `exit`
- Test the complete donation flow step by step

### Available Commands (Menu Mode)

1. **📱 Send a message to the bot** - Simulate user input
2. **📊 View current session state** - See Redis session data
3. **📝 View conversation history** - See all messages in the conversation
4. **🔄 Start new conversation** - Clear session and start fresh
5. **⏰ Test inactivity check** - Simulate QStash timeout check
6. **🧹 Clear session** - Remove session from Redis
7. **❌ Exit** - Quit the test runner

## Example Flow

```
🚀 SMS DONATION BOT - CLI TEST MODE
══════════════════════════════════════════════════
This will simulate the SMS donation flow without using Twilio.
All functionality (Redis, Sheets, QStash) will work normally.

? What would you like to do? 📱 Send a message to the bot
? Enter your message: Hi

👤 USER MESSAGE:
📱 From: +1234567890
💬 Message: Hi
⏰ Time: 2025-10-20T02:47:36.290Z
──────────────────────────────────────────────────
🤖 BOT REPLY: Hello! Thank you for your interest in making a donation. Let's begin — what's the congregation or organization name?
✅ Incoming message logged to Google Sheets
```

## Technical Details

### Mock Implementation

- **Twilio SMS**: Messages are captured and displayed in CLI instead of being sent
- **Session Management**: Uses real Redis for session storage
- **Google Sheets**: Real logging to Google Sheets (if configured)
- **QStash**: Bypassed in development mode (as per existing logic)

### File Structure

```
test/
├── cli-test.js          # Main CLI test runner
└── README.md           # This documentation
```

### Dependencies

- `inquirer` - For interactive CLI prompts (already installed)
- All existing bot dependencies for full functionality

## Benefits

1. **No Twilio Costs**: Test the full flow without SMS charges
2. **Faster Testing**: No network delays for SMS delivery
3. **Full Visibility**: See all bot responses immediately
4. **Real Data**: All side effects (Redis, Sheets) work normally
5. **Debug Friendly**: Easy to inspect session state and conversation history

## Environment Requirements

- Same environment variables as production (Redis, Sheets, etc.)
- Node.js with ES modules support
- All existing dependencies installed
