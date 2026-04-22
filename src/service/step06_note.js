import { noteSchema } from "../validator/step06.zod.js";
import { sendSms } from "../lib/twilio.js";
import { setSession } from "../lib/redis.js";
import { logMessage } from "../lib/sheets.js";
import { logStep, logRedis, logTwilio } from "../lib/logger.js";
import { MESSAGES, STEPS, COMMANDS } from "../constants.js";
import { buildConfirmationSummaryMessage } from "./confirmationSummary.js";

export async function handleNote(phone, text, session) {
  try {
    logStep(phone, STEPS.NOTE, "Processing note", { input: text });
    
    // Check if user wants to skip note
    if (COMMANDS.SKIP_NOTE.test(text)) {
      session.data.note = "";
      session.step = STEPS.CONFIRMATION;
      session.lastMessageAt = Date.now();
      await setSession(phone, session);
      logRedis("setSession", phone, true);
      
      const skipAndSummary = `${MESSAGES.NOTE_SKIP}\n\n${buildConfirmationSummaryMessage(session)}`;
      await sendSms(phone, skipAndSummary);
      logTwilio("sendSms", phone, true);
      await logMessage(phone, skipAndSummary, "outbound", STEPS.CONFIRMATION);
      
      logStep(phone, STEPS.CONFIRMATION, "Note skipped");
      return session;
    }
    
    // Validate the note
    const parsed = noteSchema.parse(text);
    
    // Update session
    session.data.note = parsed;
    session.lastMessageAt = Date.now();
    
    // Check if we're editing a field - if so, return to confirmation
    if (session.editingField === "note") {
      session.step = STEPS.CONFIRMATION;
      session.editingField = null; // Clear edit flag
      await setSession(phone, session);
      logRedis("setSession", phone, true);
      
      const summaryMessage = buildConfirmationSummaryMessage(session);
      
      await sendSms(phone, summaryMessage);
      logTwilio("sendSms", phone, true);
      await logMessage(phone, summaryMessage, "outbound", STEPS.CONFIRMATION);
      
      logStep(phone, STEPS.CONFIRMATION, "Returned to confirmation after editing note");
      return session;
    } else {
      // Normal flow - continue to confirmation
      session.step = STEPS.CONFIRMATION;
      await setSession(phone, session);
      logRedis("setSession", phone, true);
      
      const summaryMessage = buildConfirmationSummaryMessage(session);
      
      await sendSms(phone, summaryMessage);
      logTwilio("sendSms", phone, true);
      await logMessage(phone, summaryMessage, "outbound", STEPS.CONFIRMATION);
    }
    
    logStep(phone, STEPS.NOTE, "Note processed successfully", { note: parsed });
    return session;
    
  } catch (error) {
    console.error('❌ Step 6 (Note) error:', error);
    
    // Send error message
    await sendSms(phone, MESSAGES.NOTE_INVALID);
    logTwilio("sendSms", phone, true);
    
    // Log message to sheets
    await logMessage(phone, MESSAGES.NOTE_INVALID, "outbound", STEPS.NOTE);
    
    logStep(phone, STEPS.NOTE, "Note validation failed", { error: error.message });
    return session;
  }
}
