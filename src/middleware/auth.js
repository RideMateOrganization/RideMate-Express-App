import { fromNodeHeaders } from 'better-auth/node';
import auth from '../lib/auth.js';

// @desc Protect routes
// @route Private - Only for logged in users
async function protect(req, res, next) {
  try {
    // Debug logging
    console.log('Auth middleware - Headers:', {
      cookie: req.headers.cookie,
      origin: req.headers.origin,
      referer: req.headers.referer,
      userAgent: req.headers['user-agent'],
    });

    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    console.log(
      'Auth middleware - Session result:',
      session ? 'Session found' : 'No session',
    );

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No valid session found',
      });
    }

    // Add user and session data to request object for use in route handlers
    req.user = session.user;
    req.session = session.session;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Unauthorized - Invalid session',
    });
  }
}

export default protect;
