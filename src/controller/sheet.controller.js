import { sendSms } from '../lib/twilio.js';

/**
 * Normalize phone number to +1234567890 format
 * Handles various input formats:
 * - With/without country code
 * - With/without plus sign
 * - With/without formatting (parentheses, dashes, spaces)
 * - Always returns in +1234567890 format (US numbers assumed)
 * @param {string} phoneNumber - Phone number in any format
 * @returns {string} Normalized phone number in +1234567890 format
 */
function normalizePhoneNumber(phoneNumber) {
    // Guard clause - validate input
    if (!phoneNumber || typeof phoneNumber !== 'string') {
        throw new Error('Phone number is required and must be a string');
    }

    // Remove all non-digit characters (except leading +)
    let cleaned = phoneNumber.trim();
    const hasLeadingPlus = cleaned.startsWith('+');
    cleaned = cleaned.replace(/\D/g, '');

    // Guard clause - ensure we have digits
    if (!cleaned || cleaned.length < 10) {
        throw new Error(`Invalid phone number: must contain at least 10 digits (received: ${phoneNumber})`);
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
    throw new Error(`Unable to normalize phone number: ${phoneNumber}`);
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
        const confirmationMessage = `Thank you ${req.body.name}! Your donation of ${req.body.amount} has been confirmed. We appreciate your generosity.`;

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