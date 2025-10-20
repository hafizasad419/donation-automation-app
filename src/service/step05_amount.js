import { amountSchema } from "../validator/step05.zod.js";
import { sendSms } from "../lib/twilio.js";
import { setSession } from "../lib/redis.js";
import { logMessage } from "../lib/sheets.js";
import { logStep, logRedis, logTwilio } from "../lib/logger.js";
import { MESSAGES, STEPS } from "../constants.js";

export async function handleAmount(phone, text, session) {
  try {
    logStep(phone, 5, "Processing donation amount", { input: text });
    
    // Validate the amount
    const parsed = amountSchema.parse(text);
    
    // Update session
    session.data.amount = parsed.formatted;
    session.data.amountNumeric = parsed.numeric;
    session.step = STEPS.CONFIRMATION;
    session.lastMessageAt = Date.now();
    
    await setSession(phone, session);
    logRedis("setSession", phone, true);
    
    // Send confirmation summary
    const summaryMessage = MESSAGES.CONFIRMATION_SUMMARY
      .replace("{congregation}", session.data.congregation || "")
      .replace("{person_name}", session.data.personName || "")
      .replace("{tax_id}", session.data.taxId || "")
      .replace("{amount}", parsed.formatted);
    
    await sendSms(phone, summaryMessage);
    logTwilio("sendSms", phone, true);
    
    // Log message to sheets
    await logMessage(phone, summaryMessage, "outbound", 5);
    
    logStep(phone, 5, "Amount processed successfully", { amount: parsed.formatted });
    return session;
    
  } catch (error) {
    console.error('❌ Step 5 (Amount) error:', error);
    
    // Send error message
    await sendSms(phone, MESSAGES.AMOUNT_INVALID);
    logTwilio("sendSms", phone, true);
    
    // Log message to sheets
    await logMessage(phone, MESSAGES.AMOUNT_INVALID, "outbound", 5);
    
    logStep(phone, 5, "Amount validation failed", { error: error.message });
    return session;
  }
}
