import { congregationSchema } from "../validator/step01.zod.js";
import { sendSms } from "../lib/twilio.js";
import { setSession } from "../lib/redis.js";
import { logMessage } from "../lib/sheets.js";
import { MESSAGES, STEPS } from "../constants.js";
import { logStep } from "../lib/logger.js";

export async function handleCongregation(phone, text, session) {
  try {
    logStep(phone, 1, "Processing congregation input", { text });
    
    // Guard: Don't process greetings as congregation names
    const isGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening|greetings|hi there|hello there|start|begin)$/i.test(text);
    if (isGreeting) {
      await sendSms(phone, "Let's begin — what's the congregation or organization name?");
      await logMessage(phone, "Let's begin — what's the congregation or organization name?", "outbound", 1);
      logStep(phone, 1, "Rejected greeting as congregation input");
      return session;
    }
    
    // Parse and validate congregation name
    const congregation = congregationSchema.parse(text);
    
    // Update session
    session.data.congregation = congregation;
    session.lastMessageAt = Date.now();
    
    // Check if we're editing a field - if so, return to confirmation
    if (session.editingField === "congregation") {
      session.step = STEPS.CONFIRMATION;
      session.editingField = null; // Clear edit flag
      await setSession(phone, session);
      
      // Send updated confirmation summary
      const summaryMessage = MESSAGES.CONFIRMATION_SUMMARY
        .replace("{congregation}", session.data.congregation || "")
        .replace("{person_name}", session.data.personName || "")
        .replace("{tax_id}", session.data.taxId || "")
        .replace("{amount}", session.data.amount || "");
      
      await sendSms(phone, summaryMessage);
      await logMessage(phone, summaryMessage, "outbound", STEPS.CONFIRMATION);
      
      logStep(phone, STEPS.CONFIRMATION, "Returned to confirmation after editing congregation");
      return session;
    } else {
      // Normal flow - continue to next step
      session.step = STEPS.PERSON_NAME;
      await setSession(phone, session);
      
      // Send success response
      const response = MESSAGES.CONGREGATION_SUCCESS.replace("{congregation}", congregation);
      await sendSms(phone, response);
    }
    
    // Log message to sheets
    await logMessage(phone, response, "outbound", session.step);
    
    logStep(phone, session.step, "Congregation processed successfully", { congregation });
    return session;
    
  } catch (error) {
    logStep(phone, 1, "Congregation validation failed", { error: error.message });
    
    // Send error response
    await sendSms(phone, MESSAGES.CONGREGATION_INVALID);
    await logMessage(phone, MESSAGES.CONGREGATION_INVALID, "outbound", STEPS.CONGREGATION);
    
    return session;
  }
}
