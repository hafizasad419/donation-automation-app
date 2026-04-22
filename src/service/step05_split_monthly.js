import { sendSms } from "../lib/twilio.js";
import { setSession } from "../lib/redis.js";
import { logMessage } from "../lib/sheets.js";
import { logStep, logRedis, logTwilio } from "../lib/logger.js";
import { MESSAGES, STEPS, COMMANDS } from "../constants.js";
import { splitMonthlyCountSchema } from "../validator/step05_split_monthly.zod.js";
import {
  buildConfirmationSummaryMessage,
  buildSplitMonthlySummaryText,
  clearMonthlySplitFields,
} from "./confirmationSummary.js";

export async function handleSplitMonthlyPrompt(phone, text, session) {
  const body = (text || "").trim();
  const returningToConfirmation = session.editingField === "splitMonthly";

  if (COMMANDS.YES.test(body)) {
    session.data.splitMonthlyEnabled = true;
    delete session.data.splitMonthlyCount;
    delete session.data.splitMonthlySummaryText;
    session.step = STEPS.SPLIT_MONTHLY_COUNT;
    session.lastMessageAt = Date.now();
    await setSession(phone, session);
    logRedis("setSession", phone, true);

    await sendSms(phone, MESSAGES.SPLIT_MONTHLY_COUNT_ASK);
    logTwilio("sendSms", phone, true);
    await logMessage(phone, MESSAGES.SPLIT_MONTHLY_COUNT_ASK, "outbound", STEPS.SPLIT_MONTHLY_COUNT);

    logStep(phone, STEPS.SPLIT_MONTHLY_COUNT, "Split monthly: YES, asking for count");
    return session;
  }

  if (COMMANDS.NO.test(body)) {
    session.data.splitMonthlyEnabled = false;
    delete session.data.splitMonthlyCount;
    delete session.data.splitMonthlySummaryText;
    session.lastMessageAt = Date.now();

    if (returningToConfirmation) {
      session.step = STEPS.CONFIRMATION;
      session.editingField = null;
      await setSession(phone, session);
      logRedis("setSession", phone, true);
      const summary = buildConfirmationSummaryMessage(session);
      await sendSms(phone, summary);
      logTwilio("sendSms", phone, true);
      await logMessage(phone, summary, "outbound", STEPS.CONFIRMATION);
      logStep(phone, STEPS.CONFIRMATION, "Split monthly: NO, returned to confirmation");
      return session;
    }

    session.step = STEPS.NOTE;
    await setSession(phone, session);
    logRedis("setSession", phone, true);

    await sendSms(phone, MESSAGES.NOTE_PROMPT);
    logTwilio("sendSms", phone, true);
    await logMessage(phone, MESSAGES.NOTE_PROMPT, "outbound", STEPS.NOTE);

    logStep(phone, STEPS.NOTE, "Split monthly: NO, continuing to note");
    return session;
  }

  await sendSms(phone, MESSAGES.SPLIT_MONTHLY_INVALID);
  logTwilio("sendSms", phone, true);
  await logMessage(phone, MESSAGES.SPLIT_MONTHLY_INVALID, "outbound", STEPS.SPLIT_MONTHLY_PROMPT);

  logStep(phone, STEPS.SPLIT_MONTHLY_PROMPT, "Split monthly prompt: invalid response", { body });
  return session;
}

export async function handleSplitMonthlyCount(phone, text, session) {
  try {
    const n = splitMonthlyCountSchema.parse(text.trim());
    const amountDisplay = session.data.amount || "";
    const amountNumeric = session.data.amountNumeric;

    session.data.splitMonthlyCount = n;
    session.data.splitMonthlySummaryText = buildSplitMonthlySummaryText(
      amountDisplay,
      amountNumeric,
      n
    );
    session.lastMessageAt = Date.now();

    const returningToConfirmation = session.editingField === "splitMonthly";

    if (returningToConfirmation) {
      session.step = STEPS.CONFIRMATION;
      session.editingField = null;
      await setSession(phone, session);
      logRedis("setSession", phone, true);
      const summary = buildConfirmationSummaryMessage(session);
      await sendSms(phone, summary);
      logTwilio("sendSms", phone, true);
      await logMessage(phone, summary, "outbound", STEPS.CONFIRMATION);
      logStep(phone, STEPS.CONFIRMATION, "Split monthly count captured, returned to confirmation", {
        n,
      });
      return session;
    }

    session.step = STEPS.NOTE;
    await setSession(phone, session);
    logRedis("setSession", phone, true);

    const recap = session.data.splitMonthlySummaryText;
    const combined = `${recap}\n\n${MESSAGES.NOTE_PROMPT}`;
    await sendSms(phone, combined);
    logTwilio("sendSms", phone, true);
    await logMessage(phone, combined, "outbound", STEPS.NOTE);

    logStep(phone, STEPS.NOTE, "Split monthly count captured", { n });
    return session;
  } catch (error) {
    await sendSms(phone, MESSAGES.SPLIT_MONTHLY_COUNT_INVALID);
    logTwilio("sendSms", phone, true);
    await logMessage(phone, MESSAGES.SPLIT_MONTHLY_COUNT_INVALID, "outbound", STEPS.SPLIT_MONTHLY_COUNT);

    logStep(phone, STEPS.SPLIT_MONTHLY_COUNT, "Split monthly count invalid", {
      error: error.message,
    });
    return session;
  }
}
