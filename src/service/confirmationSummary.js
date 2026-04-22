import { MESSAGES } from "../constants.js";

/**
 * Remove monthly-split fields from session.data (in-place).
 * @param {Record<string, unknown>} data
 */
export function clearMonthlySplitFields(data) {
  if (!data || typeof data !== "object") {
    return;
  }
  delete data.splitMonthlyEnabled;
  delete data.splitMonthlyCount;
  delete data.splitMonthlySummaryText;
}

/**
 * Build the human-readable split line used in confirmation and sheets.
 * @param {string} amountDisplay
 * @param {number} amountNumeric
 * @param {number} n
 * @returns {string}
 */
export function buildSplitMonthlySummaryText(amountDisplay, amountNumeric, n) {
  const totalCents = Math.round(Number(amountNumeric) * 100);
  if (!Number.isFinite(totalCents) || n < 2) {
    return "";
  }
  const baseCents = Math.floor(totalCents / n);
  const remainder = totalCents - baseCents * n;
  const each = (baseCents / 100).toFixed(2);
  let msg = `Total ${amountDisplay} will be divided into ${n} payments of $${each} each (one per month).`;
  if (remainder !== 0) {
    msg += " The final payment may be a few cents different so the total matches exactly.";
  }
  return msg;
}

/**
 * @param {{ data?: Record<string, unknown> }} session
 * @returns {string}
 */
export function splitLineForSummary(session) {
  const d = session.data || {};
  if (d.splitMonthlyEnabled === true && d.splitMonthlySummaryText) {
    return String(d.splitMonthlySummaryText);
  }
  if (d.splitMonthlyEnabled === false) {
    return "No — not split into equal monthly parts.";
  }
  return "Not set.";
}

/**
 * Full confirmation SMS body.
 * @param {{ data?: Record<string, unknown> }} session
 * @returns {string}
 */
export function buildConfirmationSummaryMessage(session) {
  const d = session.data || {};
  return MESSAGES.CONFIRMATION_SUMMARY
    .replace("{congregation}", d.congregation || "")
    .replace("{person_name}", d.personName || "")
    .replace("{personPhone}", d.personPhone || "")
    .replace("{tax_id}", d.taxId || "")
    .replace("{amount}", d.amount || "")
    .replace("{split_line}", splitLineForSummary(session))
    .replace("{note}", d.note || "");
}

/**
 * Extra paragraph for post-save success SMS when split is enabled.
 * @param {{ data?: Record<string, unknown> }} session
 * @returns {string}
 */
export function buildSplitSuccessRecap(session) {
  const d = session.data || {};
  if (!d.splitMonthlyEnabled || !d.splitMonthlyCount) {
    return "";
  }
  const n = Number(d.splitMonthlyCount);
  const total = d.amount || "";
  const totalCents = Math.round(Number(d.amountNumeric) * 100);
  if (!Number.isFinite(totalCents) || n < 2) {
    return "";
  }
  const baseCents = Math.floor(totalCents / n);
  const each = (baseCents / 100).toFixed(2);
  let recap = `\n\nYour ${total} donation will be split into ${n} monthly payments of about $${each} each.`;
  if (totalCents % n !== 0) {
    recap += " The final payment may differ by a few cents so the total matches exactly.";
  }
  return recap;
}

/**
 * Note text persisted to Sheets when split is enabled.
 * @param {string} donorNote
 * @param {string} splitSummaryText
 * @returns {string}
 */
export function buildNoteForSheet(donorNote, splitSummaryText) {
  const parts = [];
  const trimmed = (donorNote || "").trim();
  if (trimmed) {
    parts.push(trimmed);
  }
  if (splitSummaryText && String(splitSummaryText).trim()) {
    parts.push(`Split: ${String(splitSummaryText).trim()}`);
  }
  return parts.join(" | ");
}
