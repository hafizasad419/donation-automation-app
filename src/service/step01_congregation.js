import { congregationSchema } from "../validator/step01.zod.js";
import { sendSms } from "../lib/twilio.js";
import { setSession } from "../lib/redis.js";
import { logMessage } from "../lib/sheets.js";
import { MESSAGES, STEPS } from "../constants.js";
import { logStep } from "../lib/logger.js";

export async function handleCongregation(phone, text, session) {
  try {
    logStep(phone, 1, "Processing congregation input", { text });
    
    // Parse and validate congregation name
    const congregation = congregationSchema.parse(text);
    
    // Update session
    session.data.congregation = congregation;
    session.step = STEPS.PERSON_NAME;
    session.lastMessageAt = Date.now();
    
    await setSession(phone, session);
    
    // Send success response
    const response = MESSAGES.CONGREGATION_SUCCESS.replace("{congregation}", congregation);
    await sendSms(phone, response);
    
    // Log message to sheets
    await logMessage(phone, response, "outbound", STEPS.PERSON_NAME);
    
    logStep(phone, 1, "Congregation processed successfully", { congregation });
    return session;
    
  } catch (error) {
    logStep(phone, 1, "Congregation validation failed", { error: error.message });
    
    // Send error response
    await sendSms(phone, MESSAGES.CONGREGATION_INVALID);
    await logMessage(phone, MESSAGES.CONGREGATION_INVALID, "outbound", STEPS.CONGREGATION);
    
    return session;
  }
}
