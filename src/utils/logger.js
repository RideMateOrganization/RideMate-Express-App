/**
 * Logger Utility for Railway Deployment
 *
 * Provides structured logging with different levels.
 * Logs are formatted for Railway's log viewer.
 * Integrates with Sentry for error tracking.
 */

import * as Sentry from '@sentry/node';

const env = process.env.NODE_ENV || 'development';

const LogLevel = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

/**
 * Format log message with timestamp and level
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 * @returns {string} Formatted log message
 */
function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    level,
    message,
    ...meta,
  };

  if (env === 'production') {
    return JSON.stringify(logData);
  }

  return `[${timestamp}] ${level}: ${message} ${Object.keys(meta).length > 0 ? JSON.stringify(meta) : ''}`;
}

/**
 * Log error message
 * @param {string} message - Error message
 * @param {Error|Object} error - Error object or metadata
 */
export function logError(message, error = {}) {
  const meta =
    error instanceof Error
      ? {
          error: error.message,
          stack: error.stack,
          name: error.name,
        }
      : error;

  console.error(formatLog(LogLevel.ERROR, message, meta));

  // Send to Sentry
  if (error instanceof Error) {
    Sentry.captureException(error, { contexts: { custom: { message, ...meta } } });
  } else {
    Sentry.logger.error(message, meta);
  }
}

/**
 * Log warning message
 * @param {string} message - Warning message
 * @param {Object} meta - Additional metadata
 */
export function logWarn(message, meta = {}) {
  console.warn(formatLog(LogLevel.WARN, message, meta));
  Sentry.logger.warn(message, meta);
}

/**
 * Log info message
 * @param {string} message - Info message
 * @param {Object} meta - Additional metadata
 */
export function logInfo(message, meta = {}) {
  console.log(formatLog(LogLevel.INFO, message, meta));
  Sentry.logger.info(message, meta);
}

/**
 * Log debug message (only in development)
 * @param {string} message - Debug message
 * @param {Object} meta - Additional metadata
 */
export function logDebug(message, meta = {}) {
  if (env === 'development') {
    console.log(formatLog(LogLevel.DEBUG, message, meta));
  }
}

/**
 * Create request logger middleware
 * Logs incoming requests with timing
 */
export function createRequestLogger() {
  return (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const message = `${req.method} ${req.path}`;

      const meta = {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
      };

      if (res.statusCode >= 500) {
        logError(message, meta);
      } else if (res.statusCode >= 400) {
        logWarn(message, meta);
      } else if (env === 'development') {
        logInfo(message, meta);
      }
    });

    next();
  };
}

export default {
  error: logError,
  warn: logWarn,
  info: logInfo,
  debug: logDebug,
  createRequestLogger,
};
