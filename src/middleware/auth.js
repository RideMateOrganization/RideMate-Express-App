const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { isTokenBlacklisted } = require('../utils/auth');

// @desc Protect routes
// @route Private - Only for logged in users
async function protect(req, res, next) {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    [, token] = req.headers.authorization.split(' ');
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  // Check if token is blacklisted
  const isBlacklisted = await isTokenBlacklisted(token);
  if (isBlacklisted) {
    return res
      .status(401)
      .json({ success: false, message: 'Token has been revoked' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
}

module.exports = { protect };
