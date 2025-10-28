import { sendSms } from '../lib/twilio.js';

/**
 * Normalize phone number to +1234567890 format
 * Handles various input formats:
 * - With/without country code
 * - With/without plus sign
 * - With/without formatting (parentheses, dashes, spaces)
 * - Numbers or strings from Google Sheets
 * - Always returns in +1234567890 format (US numbers assumed)
 * @param {string|number} phoneNumber - Phone number in any format (string or number)
 * @returns {string} Normalized phone number in +1234567890 format
 */
function normalizePhoneNumber(phoneNumber) {
    // Guard clause - validate input exists
    if (phoneNumber === null || phoneNumber === undefined) {
        throw new Error('Phone number is required');
    }

    // Convert to string if it's a number (Google Sheets sends numbers)
    let phoneStr = typeof phoneNumber === 'number' 
        ? phoneNumber.toString() 
        : String(phoneNumber);

    // Remove all non-digit characters (except leading +)
    let cleaned = phoneStr.trim();
    const hasLeadingPlus = cleaned.startsWith('+');
    cleaned = cleaned.replace(/\D/g, '');

    // Guard clause - ensure we have digits
    if (!cleaned || cleaned.length < 10) {
        throw new Error(`Invalid phone number: must contain at least 10 digits (received: ${phoneStr})`);
    }

    // Handle various formats
    // Case 1: Already has country code (11 digits starting with 1)
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `+${cleaned}`;
    }

    // Case 2: Has country code from + prefix (was +12345678901, now 12345678901)
    if (hasLeadingPlus && cleaned.length >= 10) {
        // If 10 digits after cleaning +, assume it's +1XXXXXXXXXX format
        if (cleaned.length === 11 && cleaned.startsWith('1')) {
            return `+${cleaned}`;
        }
        // If 10 digits, assume US number missing the 1
        if (cleaned.length === 10) {
            return `+1${cleaned}`;
        }
        // For other lengths, return as +{cleaned}
        return `+${cleaned}`;
    }

    // Case 3: 10 digits without country code (assume US: XXXXXXXXXX)
    if (cleaned.length === 10) {
        return `+1${cleaned}`;
    }

    // Case 4: 11 digits starting with 1 (country code without +)
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `+${cleaned}`;
    }

    // Case 5: More than 11 digits - take last 11 if starts with 1, or last 10 and add +1
    if (cleaned.length > 11) {
        // Try to find 11 digits starting with 1
        const match11 = cleaned.match(/1\d{10}/);
        if (match11) {
            return `+${match11[0]}`;
        }
        // Take last 10 digits and add +1
        const last10 = cleaned.slice(-10);
        return `+1${last10}`;
    }

    // Fallback: if we have 10+ digits, add +1
    if (cleaned.length >= 10) {
        return `+1${cleaned.slice(-10)}`;
    }

    // Final fallback - should not reach here due to earlier guard clause
    throw new Error(`Unable to normalize phone number: ${phoneStr}`);
}

// Google Sheets webhook endpoint
export const sendDonationConfirmationToDonor = async (req, res) => {
    try {
        console.log('📊 Google Sheets webhook received:', {
            name: req.body.name,
            amount: req.body.amount,
            phoneNumber: req.body.phoneNumber,
            timestamp: new Date().toISOString()
        });

        // Validate required fields
        if (!req.body.name || !req.body.amount || !req.body.phoneNumber) {
            return res.status(400).json({
                error: 'Missing required fields: name, amount, phoneNumber'
            });
        }

        // Normalize phone number to +1234567890 format
        let normalizedPhone;
        try {
            normalizedPhone = normalizePhoneNumber(req.body.phoneNumber);
            console.log(`📞 Phone number normalized: ${req.body.phoneNumber} -> ${normalizedPhone}`);
        } catch (error) {
            console.error('❌ Phone number normalization failed:', error.message);
            return res.status(400).json({
                error: `Invalid phone number format: ${error.message}`
            });
        }

        // Send confirmation message
        // Ensure amount is formatted properly (handle both number and string)
        const amountFormatted = typeof req.body.amount === 'number' 
            ? req.body.amount 
            : parseFloat(req.body.amount) || req.body.amount;
        const confirmationMessage = `Thank you ${req.body.name}! Your donation of $${amountFormatted} has been confirmed. We appreciate your generosity.`;

        // Using our existing SMS service with normalized phone number
        await sendSms(normalizedPhone, confirmationMessage);

        res.status(200).json({
            success: true,
            message: 'Confirmation sent successfully'
        });
    } catch (error) {
        console.error('❌ Google Sheets webhook error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};