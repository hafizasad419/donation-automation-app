import { sendSms } from "../lib/twilio.js";
import { setSession } from "../lib/redis.js";
import { appendDonationRecord, generateRecordId } from "../lib/sheets.js";
import { logMessage } from "../lib/sheets.js";
import { logStep, logRedis, logTwilio } from "../lib/logger.js";
import { MESSAGES, COMMANDS } from "../constants.js";

export async function handleConfirmation(phone, text, session) {
  try {
    logStep(phone, 6, "Processing confirmation", { input: text });
    
    // Debug: Check what the YES pattern matches
    console.log(`🔍 [DEBUG] Confirmation input: "${text}"`);
    console.log(`🔍 [DEBUG] YES pattern test result: ${COMMANDS.YES.test(text)}`);
    console.log(`🔍 [DEBUG] YES pattern: ${COMMANDS.YES}`);
    
    // Check if user confirmed
    if (COMMANDS.YES.test(text)) {
      // Generate record ID and save to sheets
      const recordId = generateRecordId();
      const record = [
        recordId,
        session.data.congregation || "",
        session.data.personName || "",
        session.data.personPhone || "",
        session.data.taxId || "",
        session.data.amount || "",
        session.data.amountNumeric || 0
      ];
      
      await appendDonationRecord(record);
      
      // Send success message
      const successMessage = MESSAGES.CONFIRMATION_SUCCESS.replace("{record_id}", recordId);
      console.log(`🎉 [SUCCESS] Sending donation success message to ${phone}:`, successMessage);
      await sendSms(phone, successMessage);
      logTwilio("sendSms", phone, true);
      
      // Log message to sheets
      await logMessage(phone, successMessage, "outbound", 6);
      console.log(`✅ [SUCCESS] Donation completion message sent and logged for ${phone}`);
      
      // Set session to waiting for new entry instead of clearing
      session.step = STEPS.GREETING; // Reset to greeting step
      session.data = {}; // Clear data
      session.waitingForNewEntry = true; // Set flag to wait for new entry response
      session.lastMessageAt = Date.now();
      await setSession(phone, session);
      logRedis("setSession", phone, true);
      
      logStep(phone, 6, "Donation confirmed and saved", { recordId, record });
      return session;
      
    } else if (COMMANDS.CHANGE.test(text)) {
      // Handle change requests
      await sendSms(phone, MESSAGES.CONFIRMATION_CHANGE);
      logTwilio("sendSms", phone, true);
      
      await logMessage(phone, MESSAGES.CONFIRMATION_CHANGE, "outbound", 6);
      
      logStep(phone, 6, "Change request received", { text });
      return session;
      
    } else {
      // Invalid response
      await sendSms(phone, MESSAGES.CONFIRMATION_CHANGE);
      logTwilio("sendSms", phone, true);
      
      await logMessage(phone, MESSAGES.CONFIRMATION_CHANGE, "outbound", 6);
      
      logStep(phone, 6, "Invalid confirmation response", { text });
      return session;
    }
    
  } catch (error) {
    console.error('❌ Step 6 (Confirmation) error:', error);
    
    // Send error message
    await sendSms(phone, "Sorry, there was an error processing your donation. Please try again.");
    logTwilio("sendSms", phone, true);
    
    await logMessage(phone, "Error processing confirmation", "outbound", 6);
    
    logStep(phone, 6, "Confirmation processing failed", { error: error.message });
    return session;
  }
}
