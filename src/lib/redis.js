import { Redis } from "@upstash/redis";
import { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } from "../config/index.js";

// Redis client instance (lazy initialization)
let redisClient = null;

// Get Redis client (lazy initialization)
export function getRedisClient() {
  if (!redisClient) {
    if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Redis configuration missing: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required');
    }
    
    redisClient = new Redis({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redisClient;
}

// Backward compatibility - export redis as a getter
export const redis = new Proxy({}, {
  get(target, prop) {
    const client = getRedisClient();
    if (typeof client[prop] === 'function') {
      return client[prop].bind(client);
    }
    return client[prop];
  }
});

// Helper functions for session management
export async function getSession(phone) {
  try {
    const sessionRaw = await redis.get(`session:${phone}`);
    console.log(`🔍 [DEBUG] Retrieved session for ${phone}:`, sessionRaw, typeof sessionRaw);
    
    if (!sessionRaw) return null;
    
    // Upstash Redis automatically parses JSON, so we get an object directly
    if (typeof sessionRaw === 'object' && sessionRaw !== null) {
      console.log(`✅ [DEBUG] Successfully retrieved session object for ${phone}:`, sessionRaw);
      return sessionRaw;
    }
    
    // If it's still a string (fallback), try to parse it
    if (typeof sessionRaw === 'string') {
      try {
        const parsed = JSON.parse(sessionRaw);
        console.log(`✅ [DEBUG] Successfully parsed session string for ${phone}:`, parsed);
        return parsed;
      } catch (parseError) {
        console.log(`⚠️ Invalid JSON in session data for ${phone}, clearing it:`, sessionRaw);
        await deleteSession(phone);
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Redis getSession error:', error);
    return null;
  }
}

export async function setSession(phone, session, ttl = 86400) {
  try {
    const sessionJson = JSON.stringify(session);
    console.log(`🔍 [DEBUG] Setting session for ${phone}:`, sessionJson);
    const result = await redis.set(`session:${phone}`, sessionJson, { ex: ttl });
    console.log(`✅ [DEBUG] Session set successfully for ${phone}`);
    return result;
  } catch (error) {
    console.error('Redis setSession error:', error);
    throw error;
  }
}

export async function deleteSession(phone) {
  try {
    return await redis.del(`session:${phone}`);
  } catch (error) {
    console.error('Redis deleteSession error:', error);
    throw error;
  }
}

export async function getQStashJob(phone) {
  try {
    return await redis.get(`qjob:${phone}`);
  } catch (error) {
    console.error('Redis getQStashJob error:', error);
    return null;
  }
}

export async function setQStashJob(phone, jobId) {
  try {
    return await redis.set(`qjob:${phone}`, jobId, { ex: 86400 });
  } catch (error) {
    console.error('Redis setQStashJob error:', error);
    throw error;
  }
}

export async function deleteQStashJob(phone) {
  try {
    return await redis.del(`qjob:${phone}`);
  } catch (error) {
    console.error('Redis deleteQStashJob error:', error);
    throw error;
  }
}

// Test Redis connection
export async function testConnection() {
  try {
    await redis.ping();
    console.log('✅ Redis connection successful');
    return true;
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    return false;
  }
}
