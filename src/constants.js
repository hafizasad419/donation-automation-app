// SMS Donation Flow Constants
export const STEPS = {
  GREETING: 0,
  CONGREGATION: 1,
  PERSON_NAME: 2,
  PHONE_NUMBER: 3,
  TAX_ID: 4,
  AMOUNT: 5,
  CONFIRMATION: 6
};

export const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
export const REDIS_SESSION_PREFIX = "session:";
export const REDIS_QSTASH_JOB_PREFIX = "qjob:";
export const RECORD_ID_PREFIX = "D-";

// Response Messages
export const MESSAGES = {
  GREETING: "Hello! Thank you for your interest in making a donation. Let's begin — what's the congregation or organization name?",
  START: "Let's begin — what's the congregation or organization name?",
  CONGREGATION_SUCCESS: "Got it — the congregation is {congregation}.\nNow, what's the person's full name?",
  CONGREGATION_INVALID: "Hmm, I didn't catch that. Please send the congregation or organization name in words (like Bais Shalom).\nLet's try again — what's the congregation or organization name?",

  NAME_SUCCESS: "Thanks! I've got the person's name as {person_name}.\nNow please send the person's phone number (10 digits, like 12124441100).",
  NAME_INVALID: "That seems too short. Please send the person's full name, at least two letters — for example Moshe Cohen.",

  PHONE_SUCCESS: "Thanks! I've got the person's phone number as {phone}.\nNow please send the Tax ID (9 digits, like 123456789 or 12-3456789).",
  PHONE_INVALID: "That doesn't look like a phone number. Please send 10 digits (for example 2124441100).",

  TAXID_SUCCESS: "Great — the Tax ID is {tax_id}.\nNow, what's the donation amount? (e.g., 125 or $125.00)",
  TAXID_INVALID: "That doesn't look like a Tax ID, a Tax ID should have 9 digits (for example 123456789).\nPlease try again — what's the Tax ID?",

  AMOUNT_SUCCESS: "Perfect — I've got the Tax ID as {tax_id}.\nWhat's the donation amount?\n(You can write 125, $125, or $125.00)\nIf you'd like to change something earlier, you can still say \"Change the congregation\" or \"Go back.\"",
  AMOUNT_INVALID: "Please write the number as digits, like 180 or $180.00.\nWhat's the donation amount?",

  CONFIRMATION_SUMMARY: "Here's what I have so far:\n• Congregation: {congregation}\n• Person: {person_name}\n• Tax ID: {tax_id}\n• Amount: {amount}\n\nDoes everything look right?\nPlease reply \"Yes\" to confirm — or tell me what to fix (for example, \"Change the amount\" or \"Fix the name\").",

  CONFIRMATION_SUCCESS: "Great! Your donation record has been saved.\nRecord ID: {record_id}\nWould you like to enter another donation? Just say \"New entry.\"",
  CONFIRMATION_CHANGE: "Please reply \"Yes\" to confirm or tell me what to change.",
  CONVERSATION_END: "Okay, thank you for your donation! Have a great day!",

  TIMEOUT_MESSAGE: "Still with me? Would you like to finish entering this donation or start over?",
  CANCEL_MESSAGE: "Okay, I've stopped and nothing was saved.\nYou can start again anytime by saying \"New entry.\"",

  START_OVER_CONFIRM: "You're about to start fresh and discard what we already filled in.\nAre you sure you want to start over?\n(Reply \"Yes\" to restart, or \"No\" to continue.)",
  START_OVER_YES: "No problem. Let's start again — what's the congregation or organization name?",

  NEW_ENTRY_MIDWAY: "You're still in the middle of one donation.\nWould you like to finish this one or start a new one?\nSay \"Continue\" to continue, or \"New\" to start over from the beginning."
};

// Command Patterns
export const COMMANDS = {
  GREETING: /^(hi|hello|hey|good morning|good afternoon|good evening|greetings|hi there|hello there)$/i,
  START_OVER: /^(start over|restart|begin again|new entry|start again)$/i,
  CANCEL: /^(cancel|stop|quit|end)$/i,
  YES: /^(yes|yeah|yep|y|correct|right|ok|okay|confirm|yes\s*,?\s*that'?s?\s*correct|that'?s?\s*correct|looks?\s*good|perfect|sounds?\s*good)/i,
  NO: /^(no|nope|n|incorrect|wrong|fix|change)$/i,
  END_CONVERSATION: /^(no|nope|n|thanks|thank you|that'?s?\s*all|done|finished|goodbye|bye)$/i,
  CHANGE: /^(change|edit|fix|update|modify)\s+/i,
  FINISH: /^(finish|continue|complete)$/i,
  NEW: /^(new|new entry|start over|restart)$/i
};

// Validation Patterns
export const PATTERNS = {
  CONGREGATION: /^[a-zA-Z\s\-'\.]+$/,
  PERSON_NAME: /^[a-zA-Z\s\-'\.]+$/,
  PHONE_NUMBER: /^\d{10}$/,
  TAX_ID: /^\d{9}$|^\d{2}-\d{7}$/,
  AMOUNT: /^\$?(\d+(?:\.\d{2})?)$/
};

// Redis TTL (24 hours)
export const REDIS_TTL = 86400;

export const MESSAGE_SENDING_PLATFORMS = {
  MESSAGECOLLAB: "messagecollab",
  TWILIO: "twilio"
}
