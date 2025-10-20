import { personNameSchema } from "../validator/step02.zod.js";
import { sendSms } from "../lib/twilio.js";
import { setSession } from "../lib/redis.js";
import { logMessage } from "../lib/sheets.js";
import { logStep, logRedis, logTwilio } from "../lib/logger.js";
import { MESSAGES, STEPS } from "../constants.js";

export async function handlePersonName(phone, text, session) {
  try {
    logStep(phone, 2, "Processing person name", { input: text });
    
    // Validate the person name
    const parsed = personNameSchema.parse(text);
    
    // Update session
    session.data.personName = parsed;
    session.step = STEPS.PHONE_NUMBER;
    session.lastMessageAt = Date.now();
    
    await setSession(phone, session);
    logRedis("setSession", phone, true);
    
    // Send success message
    const successMessage = MESSAGES.NAME_SUCCESS.replace("{person_name}", parsed);
    await sendSms(phone, successMessage);
    logTwilio("sendSms", phone, true);
    
    // Log message to sheets
    await logMessage(phone, successMessage, "outbound", 2);
    
    logStep(phone, 2, "Person name processed successfully", { name: parsed });
    return session;
    
  } catch (error) {
    console.error('❌ Step 2 (Person Name) error:', error);
    
    // Send error message
    await sendSms(phone, MESSAGES.NAME_INVALID);
    logTwilio("sendSms", phone, true);
    
    // Log message to sheets
    await logMessage(phone, MESSAGES.NAME_INVALID, "outbound", 2);
    
    logStep(phone, 2, "Person name validation failed", { error: error.message });
    return session;
  }
}
