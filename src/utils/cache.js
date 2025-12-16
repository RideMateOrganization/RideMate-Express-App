/**
 * ⚠️ REDIS CACHING TEMPORARILY DISABLED ⚠️
 *
 * This file contains cache utility functions for Redis.
 * Redis caching is currently disabled and will be implemented later.
 *
 * All imports of this file have been commented out throughout the codebase.
 * To re-enable Redis caching:
 * 1. Uncomment imports in src/index.js
 * 2. Uncomment cache middleware imports in route files (src/routes/v1/*.js)
 * 3. Uncomment cache invalidation calls in controllers:
 *    - src/controller/ride.js
 *    - src/controller/expense.js
 *    - src/controller/ride-comments.js
 */

import { getRedisClient, isRedisAvailable } from '../config/redis.js';
import { logInfo, logError } from './logger.js';

/**
 * Cache key prefixes for different data types
 */
export const CachePrefix = {
  RIDES: 'rides',
  RIDE_DETAIL: 'ride',
  NEARBY_RIDES: 'nearby_rides',
  RIDE_PARTICIPANTS: 'ride_participants',
  RIDE_EXPENSES: 'ride_expenses',
  RIDE_EXPENSE_STATS: 'ride_expense_stats',
  USER_EXPENSES: 'user_expenses',
  RIDE_COMMENTS: 'ride_comments',
  PENDING_REQUESTS: 'pending_requests',
  USER_PROFILE: 'user_profile',
  LEGAL_STATUS: 'legal_status',
};

/**
 * Default cache TTL (time to live) in seconds
 */
export const CacheTTL = {
  SHORT: 5 * 60, // 5 minutes
  MEDIUM: 15 * 60, // 15 minutes
  LONG: 30 * 60, // 30 minutes
  VERY_LONG: 60 * 60, // 1 hour
};

/**
 * Generate a cache key from prefix and parameters
 * @param {string} prefix - Cache key prefix
 * @param {Object} params - Parameters to include in the key
 * @returns {string} Cache key
 */
export function generateCacheKey(prefix, params = {}) {
  // Sort keys to ensure consistent cache keys
  const sortedKeys = Object.keys(params).sort();
  const keyParts = [prefix];

  for (const key of sortedKeys) {
    const value = params[key];
    // Skip undefined/null values
    if (value !== undefined && value !== null) {
      // Handle arrays and objects
      if (Array.isArray(value)) {
        keyParts.push(`${key}:${value.join(',')}`);
      } else if (typeof value === 'object') {
        keyParts.push(`${key}:${JSON.stringify(value)}`);
      } else {
        keyParts.push(`${key}:${value}`);
      }
    }
  }

  return keyParts.join(':');
}

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Cached value or null if not found
 */
export async function getCache(key) {
  if (!isRedisAvailable()) {
    return null;
  }

  try {
    const redis = getRedisClient();
    const value = await redis.get(key);

    if (value === null) {
      return null;
    }

    // Parse JSON value
    return JSON.parse(value);
  } catch (error) {
    logError(`Cache get error for key "${key}":`, error.message);
    return null;
  }
}

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache (will be JSON stringified)
 * @param {number} ttl - Time to live in seconds (default: 15 minutes)
 * @returns {Promise<boolean>} Success status
 */
export async function setCache(key, value, ttl = CacheTTL.MEDIUM) {
  if (!isRedisAvailable()) {
    return false;
  }

  try {
    const redis = getRedisClient();
    const serialized = JSON.stringify(value);

    // Set with expiration
    await redis.setex(key, ttl, serialized);
    return true;
  } catch (error) {
    logError(`Cache set error for key "${key}":`, error.message);
    return false;
  }
}

/**
 * Delete specific cache key
 * @param {string} key - Cache key to delete
 * @returns {Promise<boolean>} Success status
 */
export async function deleteCache(key) {
  if (!isRedisAvailable()) {
    return false;
  }

  try {
    const redis = getRedisClient();
    await redis.del(key);
    return true;
  } catch (error) {
    logError(`Cache delete error for key "${key}":`, error.message);
    return false;
  }
}

/**
 * Delete all cache keys matching a pattern
 * @param {string} pattern - Pattern to match (e.g., "rides:*", "user_expenses:123:*")
 * @returns {Promise<number>} Number of keys deleted
 */
export async function invalidatePattern(pattern) {
  if (!isRedisAvailable()) {
    return 0;
  }

  try {
    const redis = getRedisClient();
    const keys = await redis.keys(pattern);

    if (keys.length === 0) {
      return 0;
    }

    // Delete all matching keys
    await redis.del(...keys);
    logInfo(`🗑️  Cache invalidated: ${keys.length} keys matching "${pattern}"`);
    return keys.length;
  } catch (error) {
    logError(
      `Cache invalidation error for pattern "${pattern}":`,
      error.message,
    );
    return 0;
  }
}

/**
 * Invalidate cache for rides
 * Called when rides are created, updated, or deleted
 * @returns {Promise<void>}
 */
export async function invalidateRidesCache() {
  await Promise.all([
    invalidatePattern(`${CachePrefix.RIDES}:*`),
    invalidatePattern(`${CachePrefix.NEARBY_RIDES}:*`),
  ]);
}

/**
 * Invalidate cache for a specific ride
 * @param {string} rideId - Ride ID
 * @returns {Promise<void>}
 */
export async function invalidateRideCache(rideId) {
  await Promise.all([
    deleteCache(`${CachePrefix.RIDE_DETAIL}:${rideId}`),
    invalidatePattern(`${CachePrefix.RIDE_PARTICIPANTS}:*:rideId:${rideId}`),
    invalidatePattern(`${CachePrefix.RIDE_EXPENSES}:*:rideId:${rideId}:*`),
    invalidatePattern(`${CachePrefix.RIDE_EXPENSE_STATS}:*:rideId:${rideId}`),
    invalidatePattern(`${CachePrefix.RIDE_COMMENTS}:*:rideId:${rideId}:*`),
    invalidateRidesCache(), // Also invalidate ride lists
  ]);
}

/**
 * Invalidate cache for expenses
 * @param {string} userId - User ID
 * @param {string} rideId - Ride ID (optional)
 * @returns {Promise<void>}
 */
export async function invalidateExpensesCache(userId, rideId = null) {
  const promises = [
    invalidatePattern(`${CachePrefix.USER_EXPENSES}:*:userId:${userId}:*`),
  ];

  if (rideId) {
    promises.push(
      invalidatePattern(
        `${CachePrefix.RIDE_EXPENSES}:*:rideId:${rideId}:userId:*`,
      ),
      invalidatePattern(
        `${CachePrefix.RIDE_EXPENSE_STATS}:rideId:${rideId}:userId:*`,
      ),
    );
  }

  await Promise.all(promises);
}

/**
 * Invalidate cache for ride requests
 * @param {string} userId - User ID
 * @param {string} rideId - Ride ID (optional)
 * @returns {Promise<void>}
 */
export async function invalidateRideRequestsCache(userId, rideId = null) {
  const promises = [
    invalidatePattern(`${CachePrefix.PENDING_REQUESTS}:${userId}*`),
  ];

  if (rideId) {
    promises.push(invalidateRideCache(rideId));
  }

  await Promise.all(promises);
}

/**
 * Invalidate cache for comments
 * @param {string} rideId - Ride ID
 * @returns {Promise<void>}
 */
export async function invalidateCommentsCache(rideId) {
  await invalidatePattern(
    `${CachePrefix.RIDE_COMMENTS}:*:rideId:${rideId}:userId:*`,
  );
}

/**
 * Get or set cache (cache-aside pattern)
 * If value exists in cache, return it. Otherwise, execute fetchFn and cache the result.
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function to fetch data if not in cache
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<any>} Cached or fetched value
 */
export async function getCacheOrFetch(key, fetchFn, ttl = CacheTTL.MEDIUM) {
  // Try to get from cache first
  const cached = await getCache(key);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch fresh data
  const data = await fetchFn();

  // Store in cache for next time
  if (data !== null && data !== undefined) {
    await setCache(key, data, ttl);
  }

  return data;
}

/**
 * Flush all cache keys (use with caution!)
 * @returns {Promise<boolean>} Success status
 */
export async function flushAllCache() {
  if (!isRedisAvailable()) {
    return false;
  }

  try {
    const redis = getRedisClient();
    await redis.flushdb();
    logInfo('🗑️  All cache flushed');
    return true;
  } catch (error) {
    logError('Cache flush error:', error.message);
    return false;
  }
}

/**
 * Get cache statistics
 * @returns {Promise<Object|null>} Cache stats or null
 */
export async function getCacheStats() {
  if (!isRedisAvailable()) {
    return null;
  }

  try {
    const redis = getRedisClient();
    const info = await redis.info('stats');
    const keyspace = await redis.info('keyspace');
    const memory = await redis.info('memory');

    return {
      info,
      keyspace,
      memory,
      available: true,
    };
  } catch (error) {
    logError('Cache stats error:', error.message);
    return null;
  }
}

export default {
  CachePrefix,
  CacheTTL,
  generateCacheKey,
  getCache,
  setCache,
  deleteCache,
  invalidatePattern,
  invalidateRidesCache,
  invalidateRideCache,
  invalidateExpensesCache,
  invalidateRideRequestsCache,
  invalidateCommentsCache,
  getCacheOrFetch,
  flushAllCache,
  getCacheStats,
};
