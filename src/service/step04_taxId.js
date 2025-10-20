import { taxIdSchema } from "../validator/step04.zod.js";
import { sendSms } from "../lib/twilio.js";
import { setSession } from "../lib/redis.js";
import { logMessage } from "../lib/sheets.js";
import { logStep, logRedis, logTwilio } from "../lib/logger.js";
import { MESSAGES, STEPS } from "../constants.js";

export async function handleTaxId(phone, text, session) {
  try {
    logStep(phone, 4, "Processing Tax ID", { input: text });
    
    // Validate the Tax ID
    const parsed = taxIdSchema.parse(text);
    
    // Update session
    session.data.taxId = parsed;
    session.step = STEPS.AMOUNT;
    session.lastMessageAt = Date.now();
    
    await setSession(phone, session);
    logRedis("setSession", phone, true);
    
    // Send success message
    const successMessage = MESSAGES.TAXID_SUCCESS.replace("{tax_id}", parsed);
    await sendSms(phone, successMessage);
    logTwilio("sendSms", phone, true);
    
    // Log message to sheets
    await logMessage(phone, successMessage, "outbound", 4);
    
    logStep(phone, 4, "Tax ID processed successfully", { taxId: parsed });
    return session;
    
  } catch (error) {
    console.error('❌ Step 4 (Tax ID) error:', error);
    
    // Send error message
    await sendSms(phone, MESSAGES.TAXID_INVALID);
    logTwilio("sendSms", phone, true);
    
    // Log message to sheets
    await logMessage(phone, MESSAGES.TAXID_INVALID, "outbound", 4);
    
    logStep(phone, 4, "Tax ID validation failed", { error: error.message });
    return session;
  }
}
