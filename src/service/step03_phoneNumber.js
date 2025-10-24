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
    session.lastMessageAt = Date.now();
    
    // Check if we're editing a field - if so, return to confirmation
    if (session.editingField === "personPhone") {
      session.step = STEPS.CONFIRMATION;
      session.editingField = null; // Clear edit flag
      await setSession(phone, session);
      logRedis("setSession", phone, true);
      
      // Send updated confirmation summary
      const summaryMessage = MESSAGES.CONFIRMATION_SUMMARY
        .replace("{congregation}", session.data.congregation || "")
        .replace("{person_name}", session.data.personName || "")
        .replace("{personPhone}", session.data.personPhone || "")
        .replace("{tax_id}", session.data.taxId || "")
        .replace("{amount}", session.data.amount || "")
        .replace("{note}", session.data.note || "");
      
      await sendSms(phone, summaryMessage);
      logTwilio("sendSms", phone, true);
      await logMessage(phone, summaryMessage, "outbound", STEPS.CONFIRMATION);
      
      logStep(phone, STEPS.CONFIRMATION, "Returned to confirmation after editing phone");
      return session;
    } else {
      // Normal flow - continue to next step
      session.step = STEPS.TAX_ID;
      await setSession(phone, session);
      logRedis("setSession", phone, true);
      
      // Send success message
      const successMessage = MESSAGES.PHONE_SUCCESS.replace("{phone}", parsed);
      await sendSms(phone, successMessage);
      logTwilio("sendSms", phone, true);
      
      // Log message to sheets
      await logMessage(phone, successMessage, "outbound", STEPS.TAX_ID);
    }
    
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
