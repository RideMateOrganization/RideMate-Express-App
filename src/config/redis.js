/**
 * ⚠️ REDIS TEMPORARILY DISABLED ⚠️
 *
 * This file contains Redis configuration and connection logic.
 * Redis caching is currently disabled and will be implemented later.
 *
 * All imports of this file have been commented out throughout the codebase.
 * To re-enable Redis:
 * 1. Uncomment imports in src/index.js
 * 2. Uncomment cache middleware imports in route files
 * 3. Uncomment cache invalidation calls in controllers
 */

import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config({ path: './.env', quiet: true });

const env = process.env.NODE_ENV || 'development';

/**
 * Redis client instance
 * @type {Redis|null}
 */
let redisClient = null;

/**
 * Redis connection configuration
 * Railway provides: REDISHOST, REDISPORT, REDISPASSWORD, REDISUSER
 */
const redisConfig = {
  host: process.env.REDISHOST || process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDISPORT || process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDISPASSWORD || process.env.REDIS_PASSWORD || undefined,
  username: process.env.REDISUSER || process.env.REDIS_USER || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true, // Don't connect immediately, wait for explicit connect()
};

/**
 * Connect to Redis
 * @returns {Promise<Redis>}
 */
export async function connectToRedis() {
  if (redisClient && redisClient.status === 'ready') {
    return redisClient;
  }

  // Debug: Log environment variables to diagnose Railway issue
  console.log('🔍 Redis Environment Variables Check:');
  console.log('  REDIS_URL:', process.env.REDIS_URL ? 'SET' : 'NOT SET');
  console.log('  REDISHOST:', process.env.REDISHOST || 'NOT SET');
  console.log('  REDISPORT:', process.env.REDISPORT || 'NOT SET');
  console.log('  REDISPASSWORD:', process.env.REDISPASSWORD ? 'SET' : 'NOT SET');
  console.log('  REDISUSER:', process.env.REDISUSER || 'NOT SET');

  try {
    // Railway provides REDIS_URL and individual variables (REDISHOST, REDISPORT, etc.)
    // Prefer REDIS_URL if available, otherwise use individual variables
    if (process.env.REDIS_URL) {
      console.log('📦 Redis: Using REDIS_URL for connection');
      redisClient = new Redis(process.env.REDIS_URL, {
        retryStrategy: redisConfig.retryStrategy,
        maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
        enableReadyCheck: redisConfig.enableReadyCheck,
        lazyConnect: true,
      });
    } else if (process.env.REDISHOST) {
      // Use Railway's individual variables
      console.log(`📦 Redis: Using individual config (${redisConfig.host}:${redisConfig.port})`);
      redisClient = new Redis(redisConfig);
    } else {
      // Fallback to localhost for local development
      console.log('📦 Redis: Using localhost (development mode)');
      redisClient = new Redis(redisConfig);
    }

    // Event handlers
    redisClient.on('connect', () => {
      console.log('📦 Redis: Connecting...');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis: Connected and ready');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis Error:', err.message || err);
      console.error('Redis error details:', {
        code: err.code,
        syscall: err.syscall,
        address: err.address,
        port: err.port,
      });
      // Don't crash the app on Redis errors - it's optional
    });

    redisClient.on('close', () => {
      console.log('📦 Redis: Connection closed');
    });

    redisClient.on('reconnecting', () => {
      console.log('📦 Redis: Reconnecting...');
    });

    // Explicitly connect and wait for 'ready' event
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Redis connection timeout after 10 seconds'));
      }, 10000);

      redisClient.once('ready', () => {
        clearTimeout(timeout);
        resolve();
      });

      redisClient.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      redisClient.connect().catch(reject);
    });

    console.log('✅ Redis connection established successfully');
    return redisClient;
  } catch (error) {
    console.error('Failed to connect to Redis:', error.message || error);
    console.error('Redis connection error details:', {
      error: error.toString(),
      redisUrl: process.env.REDIS_URL ? 'provided (hidden)' : 'not provided',
      redisHost: process.env.REDISHOST || process.env.REDIS_HOST || 'not set',
      redisPort: process.env.REDISPORT || process.env.REDIS_PORT || 'not set',
    });

    // Clean up failed client
    if (redisClient) {
      try {
        redisClient.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
    }

    // Redis is optional - don't crash the app if it's unavailable
    redisClient = null;
    return null;
  }
}

/**
 * Close Redis connection
 * @returns {Promise<void>}
 */
export async function closeRedisConnection() {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('✅ Redis connection closed gracefully');
    } catch (error) {
      console.error('Error closing Redis connection:', error.message);
      // Force disconnect if graceful quit fails
      redisClient.disconnect();
    }
    redisClient = null;
  }
}

/**
 * Get Redis client instance
 * @returns {Redis|null}
 */
export function getRedisClient() {
  return redisClient;
}

/**
 * Check if Redis is available and connected
 * @returns {boolean}
 */
export function isRedisAvailable() {
  return redisClient !== null && redisClient.status === 'ready';
}

/**
 * Health check for Redis
 * @returns {Promise<boolean>}
 */
export async function checkRedisHealth() {
  if (!isRedisAvailable()) {
    return false;
  }

  try {
    const result = await redisClient.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('Redis health check failed:', error.message);
    return false;
  }
}

export default {
  connectToRedis,
  closeRedisConnection,
  getRedisClient,
  isRedisAvailable,
  checkRedisHealth,
};
