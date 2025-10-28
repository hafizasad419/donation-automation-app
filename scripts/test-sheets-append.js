#!/usr/bin/env node
import dotenv from 'dotenv';

/**
 * Debug script to test appending donation records to Google Sheets
 * Uses exact sample data from server logs
 */

import { appendDonationRecord } from '../src/lib/sheets.js';
// import { SHEET_RANGE_DONATIONS } from '../src/config/index.js';
dotenv.config();
const SHEET_RANGE_DONATIONS = process.env.SHEET_RANGE_DONATIONS;

// Exact sample data from server logs (without amountNumeric)
const sampleRecord = [
  'D-103092-340',
  'Bais Shalom',
  'Asad Riaz',
  '12816566467',
  '12-3456789',
  '$500.00',
  'My second donation'
];

async function testAppendRecord() {
  try {
    console.log('🧪 Testing appendDonationRecord function...\n');
    console.log('📋 Sample record data:', JSON.stringify(sampleRecord, null, 2));
    console.log('📊 Sheet range:', SHEET_RANGE_DONATIONS);
    console.log('📏 Expected columns (A-H, with I being STATUS - not controlled by server):');
    console.log('   A: Record ID');
    console.log('   B: Congregation');
    console.log('   C: Person Name');
    console.log('   D: Phone');
    console.log('   E: Tax ID');
    console.log('   F: Amount');
    console.log('   G: Timestamp');
    console.log('   H: Note');
    console.log('   I: STATUS (checkmark - manual, not written by server)');
    console.log('\n💡 Note: Appending to A:H should work fine even with column I present.\n');
    console.log('──────────────────────────────────────────────────\n');

    const result = await appendDonationRecord(sampleRecord);
    
    console.log('\n✅ SUCCESS! Record appended successfully.');
    console.log('📄 API Response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('\n❌ ERROR: Failed to append record');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    
    if (error.errors) {
      console.error('Error details:', JSON.stringify(error.errors, null, 2));
    }
    
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    
    process.exit(1);
  }
}

// Run the test
testAppendRecord();
