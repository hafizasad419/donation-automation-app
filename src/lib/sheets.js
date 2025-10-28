import { google } from "googleapis";
import { GOOGLE_PRIVATE_KEY, GOOGLE_SERVICE_EMAIL, SHEET_ID, SHEET_RANGE_DONATIONS, SHEET_RANGE_MESSAGES } from "../config/index.js";
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
let sheetsClient;

// Validate required environment variables for sheet ranges (lazy validation)
function validateSheetRanges() {
  if (!SHEET_RANGE_DONATIONS) {
    throw new Error('Missing required environment variable: SHEET_RANGE_DONATIONS (e.g., "Donations!A:G")');
  }
  if (!SHEET_RANGE_MESSAGES) {
    throw new Error('Missing required environment variable: SHEET_RANGE_MESSAGES (e.g., "Messages!A:E")');
  }
  
  console.log('✅ Sheet ranges validated:', {
    donations: SHEET_RANGE_DONATIONS,
    messages: SHEET_RANGE_MESSAGES
  });
}

// Validate on module load
validateSheetRanges();

// Initialize Google Sheets client
export async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;
  
  try {
    const jwt = new google.auth.JWT(
      GOOGLE_SERVICE_EMAIL,
      null,
      GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      SCOPES
    );
    
    await jwt.authorize();
    sheetsClient = google.sheets({ version: "v4", auth: jwt });
    console.log('✅ Google Sheets client initialized');
    return sheetsClient;
  } catch (error) {
    console.error('❌ Google Sheets client initialization failed:', error);
    throw error;
  }
}

// Helper function to find the last row with actual data (ignoring checkbox-only rows)
async function findLastDataRow(client, sheetName) {
  try {
    // Read a large range to find the last row with data
    // We read columns A-H only (ignoring I which has checkboxes)
    const range = `${sheetName}!A:H`;
    const response = await client.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: range
    });

    const rows = response.data.values || [];
    
    // Find the last row where at least one column (A-H) has data
    // Start from the bottom and work up
    let lastRowWithData = 0;
    
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      // Check if any column (A-H) has actual data (not just whitespace)
      const hasData = row && row.some((cell, index) => {
        // Only check columns A-H (indices 0-7)
        if (index >= 8) return false;
        // Check if cell has meaningful data (not empty, not just whitespace)
        return cell && String(cell).trim().length > 0;
      });
      
      if (hasData) {
        lastRowWithData = i + 1; // +1 because rows are 1-indexed in Sheets
        break;
      }
    }
    
    console.log(`🔍 [DEBUG] Found last row with data: ${lastRowWithData} (total rows checked: ${rows.length})`);
    return lastRowWithData;
  } catch (error) {
    console.error('❌ Error finding last data row:', error);
    // Default to 1 if we can't read (assumes header row)
    return 1;
  }
}

// Append a donation record to Google Sheets
// Uses SHEET_RANGE_DONATIONS environment variable
// Expected structure: Record ID, Congregation, Person Name, Phone, Tax ID, Amount, Timestamp, Note
export async function appendDonationRecord(record) {
  try {
    const client = await getSheetsClient();
    const [recordId, congregation, personName, phone, taxId, amount, note] = record;
    
    // Extract sheet name from SHEET_RANGE_DONATIONS (e.g., "Donations" from "Donations!A:H")
    const sheetName = SHEET_RANGE_DONATIONS.split('!')[0];
    
    // Find the last row with actual data
    const lastRow = await findLastDataRow(client, sheetName);
    const nextRow = lastRow + 1;
    
    const values = [
      [
        recordId,
        congregation || "",
        personName || "",
        phone || "",
        taxId || "",
        amount || "",
        new Date().toISOString(),
        note || "",
        false  // Column I: STATUS checkbox (unchecked) - boolean false, not string
      ]
    ];

    // Build the range for the specific row including column I (e.g., "Donations!A4:I4")
    const targetRange = `${sheetName}!A${nextRow}:I${nextRow}`;

    console.log(`🔍 [DEBUG] Appending donation record to row ${nextRow} (${targetRange}):`, JSON.stringify(values, null, 2));
    console.log(`🔍 [DEBUG] Record structure:`, {
      recordId,
      congregation,
      personName,
      phone,
      taxId,
      amount,
      note,
      status: 'unchecked (false boolean)',
      valuesCount: values[0].length,
      expectedColumns: ['A: Record ID', 'B: Congregation', 'C: Person Name', 'D: Phone', 'E: Tax ID', 'F: Amount', 'G: Timestamp', 'H: Note', 'I: STATUS (checkbox - unchecked)'],
      lastRowWithData: lastRow,
      targetRow: nextRow
    });

    // Use update instead of append to write to a specific row
    const response = await client.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: targetRange,
      valueInputOption: "USER_ENTERED",
      requestBody: { values }
    });

    console.log(`✅ Donation record appended to sheets at row ${nextRow}: ${recordId}`);
    console.log(`🔍 [DEBUG] Google Sheets API response:`, JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Failed to append donation record to sheets:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      errors: error.errors,
      stack: error.stack
    });
    throw error;
  }
}







// Log message to Messages sheet
// Uses SHEET_RANGE_MESSAGES environment variable
// Expected structure: Timestamp, Phone Number, Direction (inbound/outbound), Step, Message Content
export async function logMessage(phone, message, direction, step = null, timestamp = null) {
  try {
    const client = await getSheetsClient();
    
    const values = [
      [
        timestamp || new Date().toISOString(),
        phone,
        direction, // 'inbound' or 'outbound'
        step || "",
        message
      ]
    ];

    const response = await client.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: SHEET_RANGE_MESSAGES,
      valueInputOption: "USER_ENTERED",
      requestBody: { values }
    });

    console.log(`📝 Message logged to sheets: ${direction} - ${phone}`);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to log message to sheets:', error);
    // Don't throw error for logging failures - just log and continue
    return null;
  }
}

// Test Google Sheets connection
// Tests connectivity using SHEET_RANGE_DONATIONS to ensure both sheets are accessible
export async function testConnection() {
  try {
    const client = await getSheetsClient();
    
    // Try to read a small range to test connectivity using donations sheet
    const response = await client.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: SHEET_RANGE_DONATIONS.split('!')[0] + '!A1:A1' // Extract sheet name and test A1
    });

    console.log('✅ Google Sheets connection successful');
    return true;
  } catch (error) {
    console.error('❌ Google Sheets connection failed:', error);
    return false;
  }
}

// Get next record ID (simple counter)
export function generateRecordId() {
  const timestamp = Date.now().toString();
  const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `D-${timestamp.slice(-6)}-${randomSuffix}`;
}
