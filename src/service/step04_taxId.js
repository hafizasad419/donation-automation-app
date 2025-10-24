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
    session.lastMessageAt = Date.now();
    
    // Check if we're editing a field - if so, return to confirmation
    if (session.editingField === "taxId") {
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
      
      logStep(phone, STEPS.CONFIRMATION, "Returned to confirmation after editing tax ID");
      return session;
    } else {
      // Normal flow - continue to next step
      session.step = STEPS.AMOUNT;
      await setSession(phone, session);
      logRedis("setSession", phone, true);
      
      // Send success message
      const successMessage = MESSAGES.TAXID_SUCCESS.replace("{tax_id}", parsed);
      await sendSms(phone, successMessage);
      logTwilio("sendSms", phone, true);
      
      // Log message to sheets
      await logMessage(phone, successMessage, "outbound", STEPS.AMOUNT);
    }
    
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
