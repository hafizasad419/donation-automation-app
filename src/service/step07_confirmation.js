import { sendSms } from "../lib/twilio.js";
import { setSession, deleteSession } from "../lib/redis.js";
import { appendDonationRecord, generateRecordId } from "../lib/sheets.js";
import { logMessage } from "../lib/sheets.js";
import { logStep, logRedis, logTwilio } from "../lib/logger.js";
import { MESSAGES, COMMANDS, STEPS } from "../constants.js";

export async function handleConfirmation(phone, text, session) {
  try {
    logStep(phone, 7, "Processing confirmation", { input: text });
    
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
        session.data.amountNumeric || 0,
        session.data.note || ""  // Add note field
      ];
      
      await appendDonationRecord(record);
      
      // Send success message
      const successMessage = MESSAGES.CONFIRMATION_SUCCESS.replace("{record_id}", recordId);
      console.log(`🎉 [SUCCESS] Sending donation success message to ${phone}:`, successMessage);
      await sendSms(phone, successMessage);
      logTwilio("sendSms", phone, true);
      
      // Log message to sheets
      await logMessage(phone, successMessage, "outbound", 7);
      console.log(`✅ [SUCCESS] Donation completion message sent and logged for ${phone}`);
      
      // Clear the session completely after successful donation
      await deleteSession(phone);
      logRedis("deleteSession", phone, true);
      
      logStep(phone, 7, "Donation confirmed and saved", { recordId, record });
      return session;
      
    } else {
      // Check if this is a numbered edit request (e.g., "2. Asad Riaz")
      const numberedEditMatch = text.match(/^(\d+)\.\s*(.+)$/);
      if (numberedEditMatch) {
        const fieldNumber = parseInt(numberedEditMatch[1]);
        const newValue = numberedEditMatch[2].trim();
        
        // Map field numbers to field names and validation functions
        let fieldName = null;
        let validationFunction = null;
        let stepHandler = null;
        
        switch (fieldNumber) {
          case 1: // Congregation
            fieldName = "congregation";
            validationFunction = async (value) => {
              const { congregationSchema } = await import("../validator/step01.zod.js");
              return congregationSchema.parse(value);
            };
            stepHandler = "handleCongregation";
            break;
          case 2: // Person Name
            fieldName = "personName";
            validationFunction = async (value) => {
              const { personNameSchema } = await import("../validator/step02.zod.js");
              return personNameSchema.parse(value);
            };
            stepHandler = "handlePersonName";
            break;
          case 3: // Phone Number
            fieldName = "personPhone";
            validationFunction = async (value) => {
              const { phoneNumberSchema } = await import("../validator/step03.zod.js");
              return phoneNumberSchema.parse(value);
            };
            stepHandler = "handlePhoneNumber";
            break;
          case 4: // Tax ID
            fieldName = "taxId";
            validationFunction = async (value) => {
              const { taxIdSchema } = await import("../validator/step04.zod.js");
              return taxIdSchema.parse(value);
            };
            stepHandler = "handleTaxId";
            break;
          case 5: // Amount
            fieldName = "amount";
            validationFunction = async (value) => {
              const { amountSchema } = await import("../validator/step05.zod.js");
              return amountSchema.parse(value);
            };
            stepHandler = "handleAmount";
            break;
          case 6: // Note
            fieldName = "note";
            validationFunction = async (value) => {
              const { noteSchema } = await import("../validator/step06.zod.js");
              return noteSchema.parse(value);
            };
            stepHandler = "handleNote";
            break;
          default:
            // Invalid field number
            await sendSms(phone, "Please enter a number between 1-6 followed by the new value (e.g., '2. Moshe Kohn')");
            logTwilio("sendSms", phone, true);
            await logMessage(phone, "Invalid field number", "outbound", 7);
            return session;
        }
        
        if (fieldName && validationFunction) {
          try {
            // Validate the new value
            const validatedValue = await validationFunction(newValue);
            
            // Update the session data
            if (fieldName === "amount") {
              session.data.amount = validatedValue.formatted;
              session.data.amountNumeric = validatedValue.numeric;
            } else {
              session.data[fieldName] = validatedValue;
            }
            
            session.lastMessageAt = Date.now();
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
            await logMessage(phone, summaryMessage, "outbound", 7);
            
            logStep(phone, 7, `Field ${fieldNumber} updated successfully`, { fieldName, newValue: validatedValue });
            return session;
            
          } catch (error) {
            // Validation failed, send appropriate error message
            let errorMessage = "";
            switch (fieldNumber) {
              case 1:
                errorMessage = "Hmm, I didn't catch that. Please send the congregation or organization name in words (like Bais Shalom).";
                break;
              case 2:
                errorMessage = "That seems too short. Please send the person's full name, at least two letters — for example Moshe Cohen.";
                break;
              case 3:
                errorMessage = "That doesn't look like a phone number. Please send at least 9 digits (for example 2124441100).";
                break;
              case 4:
                errorMessage = "That doesn't look like a Tax ID, a Tax ID should have 9 digits (for example 123456789).";
                break;
              case 5:
                errorMessage = "Please write the number as digits, like 180 or $180.00.";
                break;
              case 6:
                errorMessage = "Please provide a note or say 'skip' to continue without a note.";
                break;
            }
            
            await sendSms(phone, errorMessage);
            logTwilio("sendSms", phone, true);
            await logMessage(phone, errorMessage, "outbound", 7);
            
            logStep(phone, 7, `Field ${fieldNumber} validation failed`, { error: error.message });
            return session;
          }
        }
      } else {
        // Invalid response format
        await sendSms(phone, "Please reply 'Yes' to confirm or use the format 'number. new value' to edit (e.g., '2. Moshe Kohn')");
        logTwilio("sendSms", phone, true);
        await logMessage(phone, "Invalid response format", "outbound", 7);
        
        logStep(phone, 7, "Invalid confirmation response", { text });
        return session;
      }
    }
    
  } catch (error) {
    console.error('❌ Step 7 (Confirmation) error:', error);
    
    // Send error message
    await sendSms(phone, "Sorry, there was an error processing your donation. Please try again.");
    logTwilio("sendSms", phone, true);
    
    await logMessage(phone, "Error processing confirmation", "outbound", 7);
    
    logStep(phone, 7, "Confirmation processing failed", { error: error.message });
    return session;
  }
}
