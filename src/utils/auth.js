const jwt = require("jsonwebtoken");

// @desc Send token response
// @route Private - Only for logged in users
function sendTokenResponse(user, statusCode, res) {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      handle: user.handle,
      image: user.image,
    },
  });
}

module.exports = { sendTokenResponse };
