import { sendSms } from "../lib/twilio.js";
import { setSession } from "../lib/redis.js";
import { logMessage } from "../lib/sheets.js";
import { logStep, logTwilio } from "../lib/logger.js";
import { MESSAGES, STEPS } from "../constants.js";

export async function handleNewEntryMidway(phone, session) {
  try {
    logStep(phone, session.step, "Processing new entry request (midway)");
    
    // Ask if they want to finish current or start new
    await sendSms(phone, MESSAGES.NEW_ENTRY_MIDWAY);
    logTwilio("sendSms", phone, true);
    await logMessage(phone, MESSAGES.NEW_ENTRY_MIDWAY, "outbound", session.step);
    
    logStep(phone, session.step, "New entry midway message sent");
    return session;
    
  } catch (error) {
    console.error('❌ New entry midway service error:', error);
    
    await sendSms(phone, "Sorry, there was an error. Please try again.");
    logTwilio("sendSms", phone, true);
    await logMessage(phone, "Error processing new entry request", "outbound", session.step);
    
    logStep(phone, session.step, "New entry midway request failed", { error: error.message });
    return session;
  }
}

export async function handleFinishRequest(phone, session) {
  try {
    logStep(phone, session.step, "Processing finish request");
    
    // Continue with current step
    if (session.step === STEPS.CONFIRMATION) {
      // Show confirmation summary
      const summaryMessage = MESSAGES.CONFIRMATION_SUMMARY
        .replace("{congregation}", session.congregation || "")
        .replace("{person_name}", session.personName || "")
        .replace("{tax_id}", session.taxId || "")
        .replace("{amount}", session.amount || "");
      
      await sendSms(phone, summaryMessage);
      logTwilio("sendSms", phone, true);
      await logMessage(phone, summaryMessage, "outbound", STEPS.CONFIRMATION);
      
    } else {
      // Ask for the current step's information
      let message = "";
      switch (session.step) {
        case STEPS.CONGREGATION:
          message = MESSAGES.START;
          break;
        case STEPS.PERSON_NAME:
          message = "What's the person's full name?";
          break;
        case STEPS.PHONE_NUMBER:
          message = "Please send the person's phone number (9 digits, like 1212-444-1100).";
          break;
        case STEPS.TAX_ID:
          message = "Please send the Tax ID (9 digits, like 123456789 or 12-3456789).";
          break;
        case STEPS.AMOUNT:
          message = "What's the donation amount? (You can write 125, $125, or $125.00)";
          break;
        default:
          message = MESSAGES.START;
      }
      
      await sendSms(phone, message);
      logTwilio("sendSms", phone, true);
      await logMessage(phone, message, "outbound", session.step);
    }
    
    logStep(phone, session.step, "Finish request processed");
    return session;
    
  } catch (error) {
    console.error('❌ Finish service error:', error);
    
    await sendSms(phone, "Sorry, there was an error. Please try again.");
    logTwilio("sendSms", phone, true);
    await logMessage(phone, "Error processing finish request", "outbound", session.step);
    
    logStep(phone, session.step, "Finish request failed", { error: error.message });
    return session;
  }
}

export async function handleHelp(phone, session) {
  try {
    logStep(phone, session.step, "Processing help request");
    
    const helpMessage = `I'm here to help you enter donation information. Here's what you can do:\n\n• Continue with the current step\n• Say "change [field]" to edit something\n• Say "start over" to restart\n• Say "cancel" to stop\n• Say "help" for this message\n\nCurrent step: ${session.step}`;
    
    await sendSms(phone, helpMessage);
    logTwilio("sendSms", phone, true);
    await logMessage(phone, helpMessage, "outbound", session.step);
    
    logStep(phone, session.step, "Help message sent");
    return session;
    
  } catch (error) {
    console.error('❌ Help service error:', error);
    
    await sendSms(phone, "Sorry, there was an error. Please try again.");
    logTwilio("sendSms", phone, true);
    await logMessage(phone, "Error processing help request", "outbound", session.step);
    
    logStep(phone, session.step, "Help request failed", { error: error.message });
    return session;
  }
}
