const User = require("../models/user");

// @desc Register a new user
// @route POST /api/v1/auth/register
// @access Public
async function register(req, res) {
  try {
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        error: `A user with this ${field} already exists`,
      });
    }
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Error registering user",
    });
  }
}

// @desc Login a user
// @route POST /api/v1/auth/login
// @access Public
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Please provide an email and password",
      });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }
    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Error logging in",
    });
  }
}

module.exports = { register };
