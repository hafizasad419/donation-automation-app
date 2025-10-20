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

// Append a donation record to Google Sheets
// Uses SHEET_RANGE_DONATIONS environment variable
// Expected structure: Record ID, Congregation, Person Name, Phone, Tax ID, Amount, Timestamp
export async function appendDonationRecord(record) {
  try {
    const client = await getSheetsClient();
    const [recordId, congregation, personName, phone, taxId, amount] = record;
    
    const values = [
      [
        recordId,
        congregation || "",
        personName || "",
        phone || "",
        taxId || "",
        amount || "",
        new Date().toISOString()
      ]
    ];

    const response = await client.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: SHEET_RANGE_DONATIONS,
      valueInputOption: "USER_ENTERED",
      requestBody: { values }
    });

    console.log(`✅ Donation record appended to sheets: ${recordId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to append donation record to sheets:', error);
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
