import { phoneNumberSchema } from "../validator/step03.zod.js";
import { sendSms } from "../lib/twilio.js";
import { setSession } from "../lib/redis.js";
import { logMessage } from "../lib/sheets.js";
import { logStep, logRedis, logTwilio } from "../lib/logger.js";
import { MESSAGES, STEPS } from "../constants.js";

export async function handlePhoneNumber(phone, text, session) {
  try {
    logStep(phone, 3, "Processing phone number", { input: text });
    
    // Validate the phone number
    const parsed = phoneNumberSchema.parse(text);
    
    // Update session
    session.data.personPhone = parsed;
    session.step = STEPS.TAX_ID;
    session.lastMessageAt = Date.now();
    
    await setSession(phone, session);
    logRedis("setSession", phone, true);
    
    // Send success message
    const successMessage = MESSAGES.PHONE_SUCCESS.replace("{phone}", parsed);
    await sendSms(phone, successMessage);
    logTwilio("sendSms", phone, true);
    
    // Log message to sheets
    await logMessage(phone, successMessage, "outbound", 3);
    
    logStep(phone, 3, "Phone number processed successfully", { phone: parsed });
    return session;
    
  } catch (error) {
    console.error('❌ Step 3 (Phone Number) error:', error);
    
    // Send error message
    await sendSms(phone, MESSAGES.PHONE_INVALID);
    logTwilio("sendSms", phone, true);
    
    // Log message to sheets
    await logMessage(phone, MESSAGES.PHONE_INVALID, "outbound", 3);
    
    logStep(phone, 3, "Phone number validation failed", { error: error.message });
    return session;
  }
}
