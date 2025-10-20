// Test script to verify the "No" response handling
import { COMMANDS } from './src/constants.js';

// Test the END_CONVERSATION pattern
const testCases = [
  "No",
  "nope", 
  "n",
  "thanks",
  "thank you",
  "that's all",
  "done",
  "finished",
  "goodbye",
  "bye"
];

console.log("Testing END_CONVERSATION pattern:");
testCases.forEach(testCase => {
  const matches = COMMANDS.END_CONVERSATION.test(testCase);
  console.log(`"${testCase}" -> ${matches ? '✅ MATCHES' : '❌ NO MATCH'}`);
});

// Test the NEW pattern
const newTestCases = [
  "New entry",
  "new",
  "start over",
  "restart"
];

console.log("\nTesting NEW pattern:");
newTestCases.forEach(testCase => {
  const matches = COMMANDS.NEW.test(testCase);
  console.log(`"${testCase}" -> ${matches ? '✅ MATCHES' : '❌ NO MATCH'}`);
});
