import { Client } from "@upstash/qstash";
import { QSTASH_TOKEN } from "../config/index.js";

// QStash client instance (lazy initialization)
let qstashClient = null;

// Get QStash client (lazy initialization)
export function getQStashClient() {
  if (!qstashClient) {
    if (!QSTASH_TOKEN) {
      throw new Error('QStash configuration missing: QSTASH_TOKEN is required');
    }

    qstashClient = new Client({
      token: QSTASH_TOKEN,
    });
  }
  return qstashClient;
}

// Schedule a timeout check job
export async function scheduleTimeout(phone, delaySeconds, url) {
  try {

    //TODO: Remove this once we have a production URL

    // Skip QStash in development mode (localhost/loopback addresses not supported)
    if (process.env.NODE_ENV === 'development' || url.includes('localhost') || url.includes('127.0.0.1')) {
      console.log(`⏰ Skipping QStash timeout scheduling in development mode for ${phone}`);
      return { id: 'dev-skip', skipped: true };
    }

    const client = getQStashClient();

    const result = await client.publish({
      url,
      delay: `${delaySeconds}s`,
      body: JSON.stringify({ phone }),
      headers: {
        "Content-Type": "application/json"
      }
    });

    console.log(`⏰ Scheduled timeout job for ${phone} in ${delaySeconds}s - Job ID: ${result.messageId}`);
    return { id: result.messageId, ...result };
  } catch (error) {
    console.error('❌ QStash scheduleTimeout error:', error);
    // Don't throw error in development, just log and continue
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ QStash timeout scheduling failed in development mode, continuing without timeout');
      return { id: 'dev-error', error: error.message };
    }
    throw error;
  }
}

// Cancel a scheduled job
export async function cancelScheduledJob(jobId) {
  if (!jobId) {
    console.log('⚠️ No job ID provided for cancellation');
    return false;
  }

  // Skip cancellation in development mode for dev-skip jobs
  if (process.env.NODE_ENV === 'development' && (jobId === 'dev-skip' || jobId === 'dev-error')) {
    console.log(`⏰ Skipping QStash job cancellation in development mode for ${jobId}`);
    return true;
  }

  try {
    const client = getQStashClient();

    // Note: The QStash SDK doesn't have a direct cancel method
    // We'll use the REST API for cancellation as it's not available in the SDK
    const response = await fetch(`https://qstash.upstash.io/v1/scheduled/${jobId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${QSTASH_TOKEN}`
      }
    });

    if (response.ok) {
      console.log(`✅ Cancelled QStash job: ${jobId}`);
      return true;
    } else {
      console.log(`⚠️ Failed to cancel QStash job ${jobId}: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ QStash cancelScheduledJob error:', error);
    return false;
  }
}

// Test QStash connection
export async function testConnection() {
  try {
    const client = getQStashClient();

    // Try to schedule a test job with immediate execution to test connectivity
    const result = await client.publish({
      url: "https://httpbin.org/post",
      delay: "1s",
      body: JSON.stringify({ test: "connection" }),
      headers: {
        "Content-Type": "application/json"
      }
    });

    console.log('✅ QStash connection successful');
    return true;
  } catch (error) {
    console.error('❌ QStash connection test error:', error);
    return false;
  }
}
