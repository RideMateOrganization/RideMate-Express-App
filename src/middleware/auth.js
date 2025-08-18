const jwt = require('jsonwebtoken');
const User = require('../models/user');

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
