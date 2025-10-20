import { sendSms } from "../lib/twilio.js";
import { deleteSession } from "../lib/redis.js";
import { logMessage } from "../lib/sheets.js";
import { logStep, logRedis, logTwilio } from "../lib/logger.js";
import { MESSAGES } from "../constants.js";

export async function handleCancel(phone, session) {
  try {
    logStep(phone, session.step, "Processing cancel request");
    
    // Clear session
    await deleteSession(phone);
    logRedis("deleteSession", phone, true);
    
    // Send cancel message
    await sendSms(phone, MESSAGES.CANCEL_MESSAGE);
    logTwilio("sendSms", phone, true);
    await logMessage(phone, MESSAGES.CANCEL_MESSAGE, "outbound", null);
    
    logStep(phone, null, "Session cancelled and cleared");
    return null; // Session cleared
    
  } catch (error) {
    console.error('❌ Cancel service error:', error);
    
    await sendSms(phone, "Sorry, there was an error cancelling your session. Please try again.");
    logTwilio("sendSms", phone, true);
    await logMessage(phone, "Error cancelling session", "outbound", session.step);
    
    logStep(phone, session.step, "Cancel request failed", { error: error.message });
    return session;
  }
}

export async function handleStartOver(phone, session) {
  try {
    logStep(phone, session.step, "Processing start over request");
    
    // Create new session starting from step 1
    const newSession = {
      step: 1,
      data: {},
      lastMessageAt: Date.now()
    };
    
    // Clear old session and set new one
    await deleteSession(phone);
    logRedis("deleteSession", phone, true);
    
    // Send start over message
    await sendSms(phone, MESSAGES.START_OVER_YES);
    logTwilio("sendSms", phone, true);
    await logMessage(phone, MESSAGES.START_OVER_YES, "outbound", 1);
    
    logStep(phone, 1, "Session restarted");
    return newSession;
    
  } catch (error) {
    console.error('❌ Start over service error:', error);
    
    await sendSms(phone, "Sorry, there was an error restarting. Please try again.");
    logTwilio("sendSms", phone, true);
    await logMessage(phone, "Error restarting session", "outbound", session.step);
    
    logStep(phone, session.step, "Start over request failed", { error: error.message });
    return session;
  }
}
