import { getSession, setSession, deleteSession, getQStashJob, setQStashJob, deleteQStashJob } from "../lib/redis.js";
import { sendSms } from "../lib/twilio.js";
import { scheduleTimeout, cancelScheduledJob } from "../lib/qstash.js";
import { logMessage } from "../lib/sheets.js";
import { logStep, logRedis, logTwilio } from "../lib/logger.js";

// Import step services
import { handleGreeting } from "../service/step00_greeting.js";
import { handleCongregation } from "../service/step01_congregation.js";
import { handlePersonName } from "../service/step02_personName.js";
import { handlePhoneNumber } from "../service/step03_phoneNumber.js";
import { handleTaxId } from "../service/step04_taxId.js";
import { handleAmount } from "../service/step05_amount.js";
import { handleConfirmation } from "../service/step06_confirmation.js";

// Import utility services
import { handleEditRequest } from "../service/editService.js";
import { handleCancel, handleStartOver } from "../service/cancelService.js";
import { handleNewEntryMidway, handleFinishRequest, handleHelp } from "../service/utilsService.js";

import { 
  STEPS, 
  COMMANDS, 
  MESSAGES, 
  TIMEOUT_MS, 
  REDIS_SESSION_PREFIX, 
  REDIS_QSTASH_JOB_PREFIX 
} from "../constants.js";
import { APP_BASE_URL } from "../config/index.js";

export async function handleIncomingSms(req, res) {
  try {
    const from = req.body.From || req.body.from;
    const body = (req.body.Body || req.body.body || "").trim();
    
    if (!from || !body) {
      console.log("❌ Missing From or Body in request");
      return res.status(400).send("Missing required fields");
    }
    
    logStep(from, null, "Incoming SMS received", { body });
    
    // Log incoming message to sheets
    await logMessage(from, body, "inbound", null);
    
    // Get or create session
    let session = await getSession(from);
    if (!session) {
      session = { 
        step: STEPS.GREETING, 
        data: {}, 
        lastMessageAt: Date.now() 
      };
      await setSession(from, session);
      logRedis("setSession", from, true);
    }
    
    // Check if we're in the "new entry" waiting state (after donation completion)
    if (session.waitingForNewEntry) {
      if (COMMANDS.NEW.test(body)) {
        // User wants to start a new donation
        session.step = STEPS.CONGREGATION;
        session.data = {};
        session.waitingForNewEntry = false;
        session.lastMessageAt = Date.now();
        await setSession(from, session);
        logRedis("setSession", from, true);
        
        await sendSms(from, MESSAGES.START);
        logTwilio("sendSms", from, true);
        await logMessage(from, MESSAGES.START, "outbound", STEPS.CONGREGATION);
        
        logStep(from, STEPS.CONGREGATION, "New donation started");
        return res.status(200).send("");
      } else if (COMMANDS.END_CONVERSATION.test(body)) {
        // User wants to end the conversation
        await sendSms(from, MESSAGES.CONVERSATION_END);
        logTwilio("sendSms", from, true);
        await logMessage(from, MESSAGES.CONVERSATION_END, "outbound", null);
        
        // Clear the session
        await deleteSession(from);
        logRedis("deleteSession", from, true);
        
        logStep(from, null, "Conversation ended by user");
        return res.status(200).send("");
      } else {
        // Invalid response, ask again
        await sendSms(from, "Please say \"New entry\" to start another donation, or \"No\" to end.");
        logTwilio("sendSms", from, true);
        await logMessage(from, "Please say \"New entry\" to start another donation, or \"No\" to end.", "outbound", null);
        
        logStep(from, null, "Invalid response after donation completion", { body });
        return res.status(200).send("");
      }
    }
    
    // Cancel previous scheduled timeout job
    const prevJobId = await getQStashJob(from);
    if (prevJobId) {
      await cancelScheduledJob(prevJobId);
      await deleteQStashJob(from);
      logStep(from, session.step, "Cancelled previous timeout job", { jobId: prevJobId });
    }
    
    // Handle greetings and check for existing sessions
    if (COMMANDS.GREETING.test(body)) {
      // Check if there's an existing session in progress
      if (session.step > STEPS.GREETING && session.step < STEPS.CONFIRMATION) {
        // User is in the middle of a donation
        await sendSms(from, "You're in the middle of a donation. Reply 'Finish' to continue or 'New' to restart.");
        logTwilio("sendSms", from, true);
        await logMessage(from, "You're in the middle of a donation. Reply 'Finish' to continue or 'New' to restart.", "outbound", session.step);
        
        logStep(from, session.step, "Existing session detected, asking user to choose");
        return res.status(200).send("");
      } else {
        // No active session, start new flow
        const result = await handleGreeting(from, body, session);
        if (result) {
          session = result;
        }
        return res.status(200).send("");
      }
    }
    
    // If user is at greeting step but didn't send a greeting, treat as congregation input
    // Only do this if the greeting handler didn't already process the message
    if (session.step === STEPS.GREETING && !COMMANDS.GREETING.test(body)) {
      // Move to congregation step and treat this input as congregation name
      session.step = STEPS.CONGREGATION;
      session.lastMessageAt = Date.now();
      await setSession(from, session);
      logRedis("setSession", from, true);
      logStep(from, session.step, "Auto-advancing from greeting to congregation step");
    }
    
    if (COMMANDS.CANCEL.test(body)) {
      const cancelService = await import("../service/cancelService.js");
      const result = await cancelService.handleCancel(from, session);
      return res.status(200).send("");
    }
    
    if (COMMANDS.START_OVER.test(body)) {
      // Clear session completely and start fresh
      await deleteSession(from);
      logRedis("deleteSession", from, true);
      
      // Create new session starting from congregation step
      session = { 
        step: STEPS.CONGREGATION, 
        data: {}, 
        lastMessageAt: Date.now() 
      };
      await setSession(from, session);
      logRedis("setSession", from, true);
      
      // Send start message
      await sendSms(from, "Let's begin — what's the congregation or organization name?");
      logTwilio("sendSms", from, true);
      await logMessage(from, "Let's begin — what's the congregation or organization name?", "outbound", STEPS.CONGREGATION);
      
      logStep(from, STEPS.CONGREGATION, "Session restarted from beginning");
      return res.status(200).send("");
    }
    
    if (COMMANDS.CHANGE.test(body)) {
      const result = await handleEditRequest(from, body, session);
      if (result) {
        session = result;
      }
    } else if (COMMANDS.FINISH.test(body)) {
      const result = await handleFinishRequest(from, body, session);
      if (result) {
        session = result;
      }
    } else if (COMMANDS.NEW.test(body)) {
      // Clear session completely and start fresh
      await deleteSession(from);
      logRedis("deleteSession", from, true);
      
      // Create new session starting from congregation step
      session = { 
        step: STEPS.CONGREGATION, 
        data: {}, 
        lastMessageAt: Date.now() 
      };
      await setSession(from, session);
      logRedis("setSession", from, true);
      
      // Send start message
      await sendSms(from, "Let's begin — what's the congregation or organization name?");
      logTwilio("sendSms", from, true);
      await logMessage(from, "Let's begin — what's the congregation or organization name?", "outbound", STEPS.CONGREGATION);
      
      logStep(from, STEPS.CONGREGATION, "Session restarted from beginning");
      return res.status(200).send("");
    } else if (body.toLowerCase().includes("help")) {
      const result = await handleHelp(from, session);
      if (result) {
        session = result;
      }
    } else {
      // Add session guards - if user is in middle of donation and sends random input,
      // ask them to clarify their intent
      if (session.step > STEPS.GREETING && session.step < STEPS.CONFIRMATION) {
        // Check if this looks like a random greeting or unrelated input
        const isRandomGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening|greetings|hi there|hello there|start|begin)$/i.test(body);
        const isUnrelatedInput = body.length < 3 || /^(ok|yes|no|maybe|sure|alright)$/i.test(body);
        
        if (isRandomGreeting || isUnrelatedInput) {
          await sendSms(from, "You're in the middle of a donation. Reply 'Finish' to continue or 'New' to restart.");
          logTwilio("sendSms", from, true);
          await logMessage(from, "You're in the middle of a donation. Reply 'Finish' to continue or 'New' to restart.", "outbound", session.step);
          
          logStep(from, session.step, "Random input detected, asking user to clarify");
          return res.status(200).send("");
        }
      }
      
      // Handle normal step flow
      let result = null;
      
      switch (session.step) {
        case STEPS.GREETING:
          result = await handleGreeting(from, body, session);
          break;
        case STEPS.CONGREGATION:
          result = await handleCongregation(from, body, session);
          break;
        case STEPS.PERSON_NAME:
          result = await handlePersonName(from, body, session);
          break;
        case STEPS.PHONE_NUMBER:
          result = await handlePhoneNumber(from, body, session);
          break;
        case STEPS.TAX_ID:
          result = await handleTaxId(from, body, session);
          break;
        case STEPS.AMOUNT:
          result = await handleAmount(from, body, session);
          break;
        case STEPS.CONFIRMATION:
          result = await handleConfirmation(from, body, session);
          break;
        default:
          // Start over if unknown step
          await sendSms(from, MESSAGES.START);
          logTwilio("sendSms", from, true);
          session.step = STEPS.CONGREGATION;
          await setSession(from, session);
          logRedis("setSession", from, true);
      }
      
      if (result) {
        session = result;
      }
    }
    
    // Schedule new timeout check (5 minutes)
    if (session) {
      try {
        const job = await scheduleTimeout(from, TIMEOUT_MS / 1000, `${APP_BASE_URL}/api/check-inactivity`);
        if (job?.id) {
          await setQStashJob(from, job.id);
          logStep(from, session.step, "Scheduled timeout job", { jobId: job.id });
        }
      } catch (error) {
        console.error('❌ Failed to schedule timeout job:', error);
      }
    }
    
    // Respond to Twilio webhook
    res.status(200).send("");
    
  } catch (error) {
    console.error('❌ SMS Controller error:', error);
    
    // Try to send error message to user
    try {
      const from = req.body.From || req.body.from;
      if (from) {
        await sendSms(from, "Sorry, there was an error processing your message. Please try again.");
        logTwilio("sendSms", from, true);
      }
    } catch (smsError) {
      console.error('❌ Failed to send error SMS:', smsError);
    }
    
    res.status(500).send("Internal server error");
  }
}

// Handle inactivity check (called by QStash)
export async function handleInactivityCheck(req, res) {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      console.log("❌ Missing phone in inactivity check");
      return res.status(400).send("Missing phone");
    }
    
    logStep(phone, null, "Inactivity check triggered");
    
    const session = await getSession(phone);
    if (!session) {
      logStep(phone, null, "No session found for inactivity check");
      return res.status(200).send("");
    }
    
    const diff = Date.now() - (session.lastMessageAt || 0);
    if (diff > TIMEOUT_MS) {
      // Send timeout message
      await sendSms(phone, MESSAGES.TIMEOUT_MESSAGE);
      logTwilio("sendSms", phone, true);
      await logMessage(phone, MESSAGES.TIMEOUT_MESSAGE, "outbound", session.step);
      
      // Mark as timed out
      session.timedOut = true;
      await setSession(phone, session);
      logRedis("setSession", phone, true);
      
      logStep(phone, session.step, "Timeout message sent");
    } else {
      logStep(phone, session.step, "Inactivity check - user still active");
    }
    
    // Clean up QStash job ID
    await deleteQStashJob(phone);
    
    res.status(200).send("");
    
  } catch (error) {
    console.error('❌ Inactivity check error:', error);
    res.status(500).send("Internal server error");
  }
}
