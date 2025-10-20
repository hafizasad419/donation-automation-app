import { DEBUG, NODE_ENV } from "../config/index.js";

// Debug logging wrapper
export function debug(message, ...args) {
  if (NODE_ENV === 'development' || DEBUG === 'true') {
    console.log(`🐛 [DEBUG] ${message}`, ...args);
  }
}

export function info(message, ...args) {
  console.log(`ℹ️ [INFO] ${message}`, ...args);
}

export function warn(message, ...args) {
  console.warn(`⚠️ [WARN] ${message}`, ...args);
}

export function error(message, ...args) {
  console.error(`❌ [ERROR] ${message}`, ...args);
}

export function success(message, ...args) {
  console.log(`✅ [SUCCESS] ${message}`, ...args);
}

// Log SMS flow steps
export function logStep(phone, step, action, data = null) {
  const logMessage = `📱 [${phone}] Step ${step}: ${action}`;
  if (data) {
    debug(logMessage, data);
  } else {
    debug(logMessage);
  }
}

// Log Redis operations
export function logRedis(operation, key, success = true) {
  const status = success ? '✅' : '❌';
  debug(`${status} Redis ${operation}: ${key}`);
}

// Log Twilio operations
export function logTwilio(operation, phone, success = true, details = null) {
  const status = success ? '✅' : '❌';
  const message = `${status} Twilio ${operation}: ${phone}`;
  if (details) {
    debug(message, details);
  } else {
    debug(message);
  }
}
