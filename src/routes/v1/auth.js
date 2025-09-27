const express = require('express');
const { protect } = require('../../middleware/auth');
const {
  register,
  login,
  requestOTP,
  verifyOTP,
  googleLogin,
  logout,
} = require('../../controller/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google-login', googleLogin);
router.post('/request-otp', requestOTP);
router.post('/verify-otp', verifyOTP);
router.post('/logout', protect, logout);

module.exports = router;
