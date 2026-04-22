import { amountSchema } from "../validator/step05.zod.js";
import { sendSms } from "../lib/twilio.js";
import { setSession } from "../lib/redis.js";
import { logMessage } from "../lib/sheets.js";
import { logStep, logRedis, logTwilio } from "../lib/logger.js";
import { MESSAGES, STEPS } from "../constants.js";
import { clearMonthlySplitFields } from "./confirmationSummary.js";

export async function handleAmount(phone, text, session) {
  try {
    logStep(phone, 5, "Processing donation amount", { input: text });
    
    // Validate the amount
    const parsed = amountSchema.parse(text);
    
    // Update session
    session.data.amount = parsed.formatted;
    session.data.amountNumeric = parsed.numeric;
    session.lastMessageAt = Date.now();
    
    // Check if we're editing a field - if so, return to confirmation
    if (session.editingField === "amount") {
      clearMonthlySplitFields(session.data);
      session.editingField = null;
      session.step = STEPS.SPLIT_MONTHLY_PROMPT;
      await setSession(phone, session);
      logRedis("setSession", phone, true);

      await sendSms(phone, MESSAGES.SPLIT_MONTHLY_ASK);
      logTwilio("sendSms", phone, true);
      await logMessage(phone, MESSAGES.SPLIT_MONTHLY_ASK, "outbound", STEPS.SPLIT_MONTHLY_PROMPT);

      logStep(phone, STEPS.SPLIT_MONTHLY_PROMPT, "Amount updated; re-asking monthly split");
      return session;
    } else {
      clearMonthlySplitFields(session.data);
      session.step = STEPS.SPLIT_MONTHLY_PROMPT;
      await setSession(phone, session);
      logRedis("setSession", phone, true);

      await sendSms(phone, MESSAGES.SPLIT_MONTHLY_ASK);
      logTwilio("sendSms", phone, true);
      await logMessage(phone, MESSAGES.SPLIT_MONTHLY_ASK, "outbound", STEPS.SPLIT_MONTHLY_PROMPT);
    }
    
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
