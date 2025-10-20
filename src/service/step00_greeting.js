import { sendSms } from "../lib/twilio.js";
import { setSession } from "../lib/redis.js";
import { logMessage } from "../lib/sheets.js";
import { logStep, logRedis, logTwilio } from "../lib/logger.js";
import { MESSAGES, STEPS } from "../constants.js";

export async function handleGreeting(phone, text, session) {
  try {
    logStep(phone, 0, "Processing greeting", { input: text });
    
    // Send greeting message and move to congregation step
    session.step = STEPS.CONGREGATION;
    session.lastMessageAt = Date.now();
    
    await setSession(phone, session);
    logRedis("setSession", phone, true);
    
    // Send greeting message
    await sendSms(phone, MESSAGES.GREETING);
    logTwilio("sendSms", phone, true);
    
    // Log message to sheets
    await logMessage(phone, MESSAGES.GREETING, "outbound", 0);
    
    logStep(phone, 0, "Greeting processed successfully");
    return session;
    
  } catch (error) {
    console.error('❌ Step 0 (Greeting) error:', error);
    
    // Send error message
    await sendSms(phone, "Hello! Thank you for reaching out. Let's begin — what's the congregation or organization name?");
    logTwilio("sendSms", phone, true);
    
    // Log message to sheets
    await logMessage(phone, "Hello! Thank you for reaching out. Let's begin — what's the congregation or organization name?", "outbound", 0);
    
    logStep(phone, 0, "Greeting processing failed", { error: error.message });
    return session;
  }
}
