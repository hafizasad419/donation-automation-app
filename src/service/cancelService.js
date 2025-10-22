import { sendSms } from "../lib/twilio.js";
import { deleteSession, getQStashJob, deleteQStashJob } from "../lib/redis.js";
import { cancelScheduledJob } from "../lib/qstash.js";
import { logMessage } from "../lib/sheets.js";
import { logStep, logRedis, logTwilio } from "../lib/logger.js";
import { MESSAGES } from "../constants.js";

export async function handleCancel(phone, session) {
  try {
    logStep(phone, session.step, "Processing comprehensive cancel request");
    
    // 1. Cancel any scheduled QStash timeout job
    try {
      const jobId = await getQStashJob(phone);
      if (jobId) {
        await cancelScheduledJob(jobId);
        logStep(phone, session.step, "QStash timeout job cancelled", { jobId });
      }
    } catch (qstashError) {
      console.warn('⚠️ QStash job cancellation failed (non-critical):', qstashError.message);
    }
    
    // 2. Clear QStash job ID from Redis
    try {
      await deleteQStashJob(phone);
      logRedis("deleteQStashJob", phone, true);
    } catch (redisError) {
      console.warn('⚠️ QStash job ID deletion failed (non-critical):', redisError.message);
    }
    
    // 3. Clear all session data from Redis
    await deleteSession(phone);
    logRedis("deleteSession", phone, true);
    
    // 4. Send comprehensive cancel message
    const cancelMessage = "Session cancelled and completely cleared. All data has been reset. You can start fresh anytime by saying 'Hi' or 'Start'.";
    await sendSms(phone, cancelMessage);
    logTwilio("sendSms", phone, true);
    await logMessage(phone, cancelMessage, "outbound", null);
    
    logStep(phone, null, "Comprehensive session cancellation completed - all data cleared");
    return null; // Session completely cleared
    
  } catch (error) {
    console.error('❌ Comprehensive cancel service error:', error);
    
    // Even if there's an error, try to clear what we can
    try {
      await deleteSession(phone);
      await deleteQStashJob(phone);
    } catch (cleanupError) {
      console.error('❌ Cleanup failed during error handling:', cleanupError);
    }
    
    await sendSms(phone, "Session has been cleared. You can start fresh anytime by saying 'Hi' or 'Start'.");
    logTwilio("sendSms", phone, true);
    await logMessage(phone, "Session cleared after error", "outbound", null);
    
    logStep(phone, null, "Session cleared after cancel error");
    return null; // Always return null to ensure clean state
  }
}

export async function handleStartOver(phone, session) {
  try {
    logStep(phone, session.step, "Processing start over request");
    
    // 1. Cancel any scheduled QStash timeout job
    try {
      const jobId = await getQStashJob(phone);
      if (jobId) {
        await cancelScheduledJob(jobId);
        logStep(phone, session.step, "QStash timeout job cancelled for restart", { jobId });
      }
    } catch (qstashError) {
      console.warn('⚠️ QStash job cancellation failed during restart (non-critical):', qstashError.message);
    }
    
    // 2. Clear QStash job ID from Redis
    try {
      await deleteQStashJob(phone);
      logRedis("deleteQStashJob", phone, true);
    } catch (redisError) {
      console.warn('⚠️ QStash job ID deletion failed during restart (non-critical):', redisError.message);
    }
    
    // 3. Create new session starting from step 1
    const newSession = {
      step: 1,
      data: {},
      lastMessageAt: Date.now(),
      timeoutMessageSent: false
    };
    
    // 4. Clear old session and set new one
    await deleteSession(phone);
    logRedis("deleteSession", phone, true);
    
    // 5. Send start over message
    await sendSms(phone, MESSAGES.START_OVER_YES);
    logTwilio("sendSms", phone, true);
    await logMessage(phone, MESSAGES.START_OVER_YES, "outbound", 1);
    
    logStep(phone, 1, "Session restarted with comprehensive cleanup");
    return newSession;
    
  } catch (error) {
    console.error('❌ Start over service error:', error);
    
    // Even if there's an error, try to clear what we can
    try {
      await deleteSession(phone);
      await deleteQStashJob(phone);
    } catch (cleanupError) {
      console.error('❌ Cleanup failed during restart error handling:', cleanupError);
    }
    
    await sendSms(phone, "Session has been cleared. You can start fresh anytime by saying 'Hi' or 'Start'.");
    logTwilio("sendSms", phone, true);
    await logMessage(phone, "Session cleared after restart error", "outbound", null);
    
    logStep(phone, null, "Session cleared after restart error");
    return null; // Return null to ensure clean state
  }
}
