import { sendSms } from "../lib/twilio.js";
import { setSession } from "../lib/redis.js";
import { logMessage } from "../lib/sheets.js";
import { logStep, logRedis, logTwilio } from "../lib/logger.js";
import { MESSAGES, STEPS } from "../constants.js";
import { clearMonthlySplitFields } from "./confirmationSummary.js";

export async function handleEditRequest(phone, text, session) {
  try {
    logStep(phone, session.step, "Processing edit request", { input: text });
    
    // Check if this is a numbered edit request (e.g., "2. Asad Riaz")
    const numberedEditMatch = text.match(/^(\d+)\.\s*(.+)$/);
    if (numberedEditMatch) {
      const fieldNumber = parseInt(numberedEditMatch[1]);

      if (fieldNumber === 6) {
        clearMonthlySplitFields(session.data);
        session.editingField = "splitMonthly";
        session.step = STEPS.SPLIT_MONTHLY_PROMPT;
        session.lastMessageAt = Date.now();
        await setSession(phone, session);
        logRedis("setSession", phone, true);
        await sendSms(phone, MESSAGES.SPLIT_MONTHLY_ASK);
        logTwilio("sendSms", phone, true);
        await logMessage(phone, MESSAGES.SPLIT_MONTHLY_ASK, "outbound", STEPS.SPLIT_MONTHLY_PROMPT);
        logStep(phone, session.step, "Edit request: monthly split (numbered 6)", {});
        return session;
      }

      const newValue = numberedEditMatch[2].trim();
      
      let fieldName = null;
      let message = "";
      
      switch (fieldNumber) {
        case 1:
          fieldName = "congregation";
          message = "What's the congregation or organization name?";
          break;
        case 2:
          fieldName = "personName";
          message = "What's the person's full name?";
          break;
        case 3:
          fieldName = "personPhone";
          message = "Please send the person's phone number (like 2124441100).";
          break;
        case 4:
          fieldName = "taxId";
          message = "Please send the Tax ID (9 digits, like 123456789 or 12-3456789).";
          break;
        case 5:
          fieldName = "amount";
          message = "What's the donation amount? (You can write 125, $125, or $125.00)";
          break;
        case 7:
          fieldName = "note";
          message = MESSAGES.NOTE_PROMPT;
          break;
        default:
          await sendSms(phone, "Please enter a number between 1-7 followed by the new value (e.g., '2. Moshe Kohn')");
          await logMessage(phone, "Invalid field number", "outbound", session.step);
          return session;
      }
      
      if (fieldName) {
        session.editingField = fieldName;
        session.step =
          fieldNumber === 1 ? STEPS.CONGREGATION :
          fieldNumber === 2 ? STEPS.PERSON_NAME :
          fieldNumber === 3 ? STEPS.PHONE_NUMBER :
          fieldNumber === 4 ? STEPS.TAX_ID :
          fieldNumber === 5 ? STEPS.AMOUNT :
          STEPS.NOTE;
        
        await setSession(phone, session);
        logRedis("setSession", phone, true);
        
        await sendSms(phone, message);
        logTwilio("sendSms", phone, true);
        await logMessage(phone, message, "outbound", session.step);
        
        logStep(phone, session.step, `Edit request processed for field ${fieldNumber}`, { fieldName });
        return session;
      }
    }
    
    const lowerText = text.toLowerCase();
    
    // Handle different edit requests
    if (lowerText.includes("congregation") || lowerText.includes("organization")) {
      session.step = STEPS.CONGREGATION;
      session.editingField = "congregation"; // Set flag to return to confirmation after edit
      await setSession(phone, session);
      logRedis("setSession", phone, true);
      
      await sendSms(phone, MESSAGES.START);
      logTwilio("sendSms", phone, true);
      await logMessage(phone, MESSAGES.START, "outbound", STEPS.CONGREGATION);
      
    } else if (lowerText.includes("name") || lowerText.includes("person")) {
      session.step = STEPS.PERSON_NAME;
      session.editingField = "personName"; // Set flag to return to confirmation after edit
      await setSession(phone, session);
      logRedis("setSession", phone, true);
      
      const message = "What's the person's full name?";
      await sendSms(phone, message);
      logTwilio("sendSms", phone, true);
      await logMessage(phone, message, "outbound", STEPS.PERSON_NAME);
      
    } else if (lowerText.includes("phone") || lowerText.includes("number")) {
      session.step = STEPS.PHONE_NUMBER;
      session.editingField = "personPhone"; // Set flag to return to confirmation after edit
      await setSession(phone, session);
      logRedis("setSession", phone, true);
      
      const message = "Please send the person's phone number (like 2124441100).";
      await sendSms(phone, message);
      logTwilio("sendSms", phone, true);
      await logMessage(phone, message, "outbound", STEPS.PHONE_NUMBER);
      
    } else if (lowerText.includes("tax") || lowerText.includes("id")) {
      session.step = STEPS.TAX_ID;
      session.editingField = "taxId"; // Set flag to return to confirmation after edit
      await setSession(phone, session);
      logRedis("setSession", phone, true);
      
      const message = "Please send the Tax ID (9 digits, like 123456789 or 12-3456789).";
      await sendSms(phone, message);
      logTwilio("sendSms", phone, true);
      await logMessage(phone, message, "outbound", STEPS.TAX_ID);
      
    } else if (lowerText.includes("amount") || lowerText.includes("donation")) {
      session.step = STEPS.AMOUNT;
      session.editingField = "amount"; // Set flag to return to confirmation after edit
      await setSession(phone, session);
      logRedis("setSession", phone, true);
      
      const message = "What's the donation amount? (You can write 125, $125, or $125.00)";
      await sendSms(phone, message);
      logTwilio("sendSms", phone, true);
      await logMessage(phone, message, "outbound", STEPS.AMOUNT);
      
    } else if (lowerText.includes("split") || lowerText.includes("monthly")) {
      clearMonthlySplitFields(session.data);
      session.step = STEPS.SPLIT_MONTHLY_PROMPT;
      session.editingField = "splitMonthly";
      await setSession(phone, session);
      logRedis("setSession", phone, true);
      await sendSms(phone, MESSAGES.SPLIT_MONTHLY_ASK);
      logTwilio("sendSms", phone, true);
      await logMessage(phone, MESSAGES.SPLIT_MONTHLY_ASK, "outbound", STEPS.SPLIT_MONTHLY_PROMPT);
      
    } else {
      // Show current summary and ask what to change
      const summary = `Your current info:\n• Congregation: ${session.congregation || ""}\n• Name: ${session.personName || ""}\n• Phone: ${session.personPhone || ""}\n• Tax ID: ${session.taxId || ""}\n• Amount: ${session.amount || ""}\n\nWhat would you like to change?`;
      
      await sendSms(phone, summary);
      logTwilio("sendSms", phone, true);
      await logMessage(phone, summary, "outbound", session.step);
    }
    
    logStep(phone, session.step, "Edit request processed", { newStep: session.step });
    return session;
    
  } catch (error) {
    console.error('❌ Edit service error:', error);
    
    await sendSms(phone, "Sorry, I couldn't process your edit request. Please try again.");
    logTwilio("sendSms", phone, true);
    await logMessage(phone, "Error processing edit request", "outbound", session.step);
    
    logStep(phone, session.step, "Edit request failed", { error: error.message });
    return session;
  }
}
