import { getCache, setCache, generateCacheKey, CacheTTL } from '../utils/cache.js';

/**
 * Middleware factory for caching GET requests
 * @param {Object} options - Cache options
 * @param {string} options.prefix - Cache key prefix (required)
 * @param {number} options.ttl - Time to live in seconds (default: 15 minutes)
 * @param {Function} options.keyGenerator - Custom function to generate cache key from req
 * @param {Function} options.shouldCache - Function to determine if response should be cached
 * @returns {Function} Express middleware
 */
export function cacheMiddleware(options = {}) {
  const { prefix, ttl = CacheTTL.MEDIUM, keyGenerator, shouldCache } = options;

  if (!prefix) {
    throw new Error('Cache middleware requires a prefix option');
  }

  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      // Generate cache key
      let cacheKey;
      if (keyGenerator) {
        cacheKey = keyGenerator(req);
      } else {
        // Default: use query params, route params, and user ID
        const params = {
          ...req.query,
          ...req.params,
          userId: req.user?.id || 'guest',
        };
        cacheKey = generateCacheKey(prefix, params);
      }

      // Try to get from cache
      const cached = await getCache(cacheKey);

      if (cached !== null) {
        // Cache hit - return cached response
        console.log(`✅ Cache HIT: ${cacheKey}`);
        return res.json(cached);
      }

      console.log(`❌ Cache MISS: ${cacheKey}`);

      // Cache miss - intercept res.json to cache the response
      const originalJson = res.json.bind(res);

      res.json = function (data) {
        // Only cache successful responses
        const shouldCacheResponse = shouldCache ? shouldCache(data, res) : res.statusCode === 200;

        if (shouldCacheResponse && data) {
          // Cache the response asynchronously (don't wait)
          setCache(cacheKey, data, ttl).catch((err) => {
            console.error(`Cache set error for key "${cacheKey}":`, err.message);
          });
        }

        // Send the response
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error.message);
      // On error, just continue without caching
      next();
    }
  };
}

/**
 * Middleware to add cache control headers
 * @param {number} maxAge - Max age in seconds
 * @returns {Function} Express middleware
 */
export function cacheControlMiddleware(maxAge = 300) {
  return (req, res, next) => {
    if (req.method === 'GET') {
      res.set('Cache-Control', `public, max-age=${maxAge}`);
    } else {
      res.set('Cache-Control', 'no-store');
    }
    next();
  };
}

/**
 * Preset cache middleware for rides list
 */
export function cacheRidesList(ttl = CacheTTL.MEDIUM) {
  return cacheMiddleware({
    prefix: 'rides',
    ttl,
    keyGenerator: (req) => {
      const params = {
        userId: req.user?.id,
        owner: req.query.owner,
        participant: req.query.participant,
        status: req.query.status,
        dateFilter: req.query.dateFilter,
        difficulty: req.query.difficulty,
        search: req.query.search,
        page: req.query.page || 1,
        limit: req.query.limit || 10,
      };
      return generateCacheKey('rides', params);
    },
  });
}

/**
 * Preset cache middleware for nearby rides
 */
export function cacheNearbyRides(ttl = CacheTTL.LONG) {
  return cacheMiddleware({
    prefix: 'nearby_rides',
    ttl,
    keyGenerator: (req) => {
      const { latitude, longitude, radius, page, limit } = req.query;
      // Round coordinates to reduce cache key variations
      const lat = parseFloat(latitude).toFixed(4);
      const lng = parseFloat(longitude).toFixed(4);
      return generateCacheKey('nearby_rides', { userId: req.user?.id, lat, lng, radius, page, limit });
    },
  });
}

/**
 * Preset cache middleware for user expenses
 */
export function cacheUserExpenses(ttl = CacheTTL.LONG) {
  return cacheMiddleware({
    prefix: 'user_expenses',
    ttl,
    keyGenerator: (req) => {
      const userId = req.user?.id;
      const { view, month, year, startDate, endDate } = req.query;
      return generateCacheKey('user_expenses', { userId, view, month, year, startDate, endDate });
    },
  });
}

/**
 * Preset cache middleware for ride expenses
 */
export function cacheRideExpenses(ttl = CacheTTL.MEDIUM) {
  return cacheMiddleware({
    prefix: 'ride_expenses',
    ttl,
    keyGenerator: (req) => {
      const { rideId } = req.params;
      const { category, sortBy, page, limit } = req.query;
      return generateCacheKey('ride_expenses', { userId: req.user?.id, rideId, category, sortBy, page, limit });
    },
  });
}

/**
 * Preset cache middleware for ride expense statistics
 */
export function cacheRideExpenseStats(ttl = CacheTTL.LONG) {
  return cacheMiddleware({
    prefix: 'ride_expense_stats',
    ttl,
    keyGenerator: (req) => {
      const { rideId } = req.params;
      return generateCacheKey('ride_expense_stats', { userId: req.user?.id, rideId });
    },
  });
}

/**
 * Preset cache middleware for ride participants
 */
export function cacheRideParticipants(ttl = CacheTTL.MEDIUM) {
  return cacheMiddleware({
    prefix: 'ride_participants',
    ttl,
    keyGenerator: (req) => {
      const { rideId } = req.params;
      return generateCacheKey('ride_participants', { userId: req.user?.id, rideId });
    },
  });
}

/**
 * Preset cache middleware for ride comments
 */
export function cacheRideComments(ttl = CacheTTL.MEDIUM) {
  return cacheMiddleware({
    prefix: 'ride_comments',
    ttl,
    keyGenerator: (req) => {
      const { rideId } = req.params;
      const { parentComment, page, limit } = req.query;
      return generateCacheKey('ride_comments', { userId: req.user?.id, rideId, parentComment, page, limit });
    },
  });
}

/**
 * Preset cache middleware for pending ride requests
 */
export function cachePendingRequests(ttl = CacheTTL.SHORT) {
  return cacheMiddleware({
    prefix: 'pending_requests',
    ttl,
    keyGenerator: (req) => {
      const userId = req.user?.id;
      return generateCacheKey('pending_requests', { userId });
    },
  });
}

export default {
  cacheMiddleware,
  cacheControlMiddleware,
  cacheRidesList,
  cacheNearbyRides,
  cacheUserExpenses,
  cacheRideExpenses,
  cacheRideExpenseStats,
  cacheRideParticipants,
  cacheRideComments,
  cachePendingRequests,
};
