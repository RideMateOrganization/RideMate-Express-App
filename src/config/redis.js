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
 */
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
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

  try {
    // If REDIS_URL is provided (Railway/Heroku style), use it directly
    if (process.env.REDIS_URL) {
      redisClient = new Redis(process.env.REDIS_URL, {
        retryStrategy: redisConfig.retryStrategy,
        maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
        enableReadyCheck: redisConfig.enableReadyCheck,
      });
    } else {
      // Otherwise use individual config options
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
      console.error('❌ Redis Error:', err.message);
      // Don't crash the app on Redis errors - it's optional
    });

    redisClient.on('close', () => {
      console.log('📦 Redis: Connection closed');
    });

    redisClient.on('reconnecting', () => {
      console.log('📦 Redis: Reconnecting...');
    });

    // Explicitly connect
    await redisClient.connect();

    return redisClient;
  } catch (error) {
    console.error('Failed to connect to Redis:', error.message);
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
