const User = require('../models/user');
const {
  sendOTP,
  verifyOTP: verifyOTPWithTwilio,
} = require('../utils/twilio-verify');
const { sendTokenResponse, addToBlacklist } = require('../utils/auth');

// @desc Register a new user
// @route POST /api/v1/auth/register
// @access Public
async function register(req, res) {
  try {
    const { name, email, password, handle } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'User already exists',
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      handle,
    });
    sendTokenResponse(user, 201, res);
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
      error: error.message,
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
        error: 'Please provide an email and password',
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }
    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Error logging in',
    });
  }
}

// @desc Request OTP for phone number
// @route POST /api/v1/auth/request-otp
// @access Public
async function requestOTP(req, res) {
  try {
    const { phone, countryCode } = req.body;
    if (!phone || !countryCode) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a phone number and country code',
      });
    }

    const fullPhoneNumber = `${countryCode}${phone}`;
    let user = await User.findOne({ phone, phoneCountryCode: countryCode });

    if (!user) {
      user = await User.create({
        name: 'New Rider',
        handle: `@rider_${Math.random().toString(36).substring(2, 9)}`,
        phone: fullPhoneNumber,
        phoneCountryCode: countryCode,
        isPhoneVerified: false,
      });
      console.log('New user created:', user);
    }

    const twilioResponse = await sendOTP(fullPhoneNumber);
    if (twilioResponse.status === 'pending') {
      res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
      });
    } else {
      console.error('Twilio OTP request non-pending status:', twilioResponse);
      res.status(500).json({
        success: false,
        error: `Failed to send OTP. Twilio status: ${twilioResponse.status}`,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// @desc Verify OTP for phone number
// @route POST /api/v1/auth/verify-otp
// @access Public
async function verifyOTP(req, res) {
  try {
    const { phone, countryCode, otp } = req.body;
    if (!phone || !countryCode || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a phone number, country code, and OTP',
      });
    }

    const fullPhoneNumber = `${countryCode}${phone}`;
    const twilioResponse = await verifyOTPWithTwilio(fullPhoneNumber, otp);

    if (twilioResponse.status === 'approved') {
      const user = await User.findOne({ phone, phoneCountryCode: countryCode });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      // if user is not verified, verify them
      if (!user.isPhoneVerified) {
        user.isPhoneVerified = true;
        await user.save({ validateBeforeSave: true });
      }
      sendTokenResponse(user, 200, res);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP, please try again',
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// @desc Logout user / Revoke token
// @route POST /api/v1/auth/logout
// @access Private
async function logout(req, res) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      await addToBlacklist(token, req.user.id);
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Error logging out',
    });
  }
}

module.exports = { register, login, requestOTP, verifyOTP, logout };
