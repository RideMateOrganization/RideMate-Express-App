/**
 * Async Handler Middleware
 *
 * Wraps async route handlers to catch errors and pass them to Express error handler.
 * Eliminates the need for try-catch blocks in every route.
 */

/**
 * Wraps an async function to catch errors
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
