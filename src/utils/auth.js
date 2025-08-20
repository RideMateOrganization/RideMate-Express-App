const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const BlacklistedToken = require('../models/token');

// @desc Send token response
// @route Private - Only for logged in users
function sendTokenResponse(user, statusCode, res) {
  // Generate a unique token ID using timestamp and user ID
  const tokenId = `${user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const token = jwt.sign(
    {
      id: user.id,
      jti: tokenId, // JWT ID for unique token identification
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE,
    },
  );

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      handle: user.handle,
      image: user.image,
    },
  });
}

// @desc Generate token hash for secure storage
async function generateTokenHash(token) {
  const saltRounds = 10;
  return bcrypt.hash(token, saltRounds);
}

// @desc Generate unique token ID from JWT
function generateTokenId(token) {
  const decoded = jwt.decode(token);
  // Use JWT ID (jti) if available, otherwise fallback to user ID + iat
  return decoded.jti || `${decoded.id}_${decoded.iat}`;
}

// @desc Add token to blacklist
async function addToBlacklist(token, userId) {
  try {
    // Decode token to get expiration
    const decoded = jwt.decode(token);
    const expiresAt = new Date(decoded.exp * 1000); // Convert to Date object

    // Generate secure identifiers
    const tokenHash = await generateTokenHash(token);
    const tokenId = generateTokenId(token);

    // Add token to blacklist (storing hash and ID instead of full token)
    await BlacklistedToken.create({
      tokenHash,
      tokenId,
      userId,
      expiresAt,
    });
  } catch (error) {
    console.error('Error adding token to blacklist:', error);
    throw error;
  }
}

// @desc Check if token is blacklisted
async function isTokenBlacklisted(token) {
  try {
    const tokenId = generateTokenId(token);

    // Check by token ID (primary method)
    const blacklistedToken = await BlacklistedToken.findOne({ tokenId });
    if (blacklistedToken) {
      // Verify with bcrypt for extra security
      const isValidHash = await bcrypt.compare(
        token,
        blacklistedToken.tokenHash,
      );
      return isValidHash;
    }

    return false;
  } catch (error) {
    console.error('Error checking token blacklist:', error);
    return false;
  }
}

// @desc Get blacklist for testing/debugging (remove in production)
async function getBlacklist() {
  try {
    return await BlacklistedToken.find({})
      .select('tokenId userId expiresAt createdAt -__v')
      .populate('userId', 'name email');
  } catch (error) {
    console.error('Error getting blacklist:', error);
    return [];
  }
}

// @desc Clean up expired tokens (optional - MongoDB TTL handles this automatically)
async function cleanupExpiredTokens() {
  try {
    const result = await BlacklistedToken.deleteMany({
      expiresAt: { $lt: new Date() },
    });
    console.log(`Cleaned up ${result.deletedCount} expired tokens`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
    return 0;
  }
}

module.exports = {
  sendTokenResponse,
  addToBlacklist,
  isTokenBlacklisted,
  getBlacklist,
  cleanupExpiredTokens,
};
