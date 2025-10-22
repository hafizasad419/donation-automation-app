import { sendSms } from "../lib/twilio.js";
import { setSession } from "../lib/redis.js";
import { logMessage } from "../lib/sheets.js";
import { logStep, logRedis, logTwilio } from "../lib/logger.js";
import { MESSAGES, STEPS } from "../constants.js";

export async function handleEditRequest(phone, text, session) {
  try {
    logStep(phone, session.step, "Processing edit request", { input: text });
    
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
      
      const message = "Please send the person's phone number (10 digits, like 2124441100).";
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
