const express = require('express');
const {
  register,
  login,
  requestOTP,
  verifyOTP,
} = require('../../controller/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/request-otp', requestOTP);
router.post('/verify-otp', verifyOTP);

module.exports = router;
